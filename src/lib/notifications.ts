import type {
  NotificationPreference,
  NotificationTargetType,
  NotificationType,
  Prisma,
  User,
} from '@prisma/client';
import { prisma } from './prisma';
import { boundedInteger } from './query-limits';
import { logEvent } from './observability';

export const DEFAULT_NOTIFICATION_LIMIT = 30;
export const MAX_NOTIFICATION_LIMIT = 50;

export type NotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  targetType: NotificationTargetType;
  targetId: string;
  destinationUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey?: string;
  allowSelfNotification?: boolean;
};

export type NotificationPreferencesShape = Pick<
  NotificationPreference,
  | 'repliesToMyContent'
  | 'watchedThreadUpdates'
  | 'followedCollegeUpdates'
  | 'savedContentUpdates'
  | 'reportModerationUpdates'
>;

export const defaultNotificationPreferences: NotificationPreferencesShape = {
  repliesToMyContent: true,
  watchedThreadUpdates: true,
  followedCollegeUpdates: true,
  savedContentUpdates: true,
  reportModerationUpdates: true,
};

export function buildNotificationKey(input: Pick<NotificationInput, 'recipientUserId' | 'type' | 'targetType' | 'targetId'> & { eventId?: string }) {
  return [
    input.recipientUserId,
    input.type,
    input.targetType,
    input.targetId,
    input.eventId ?? 'default',
  ].join(':');
}

export function uniqueRecipientIds(ids: Array<string | null | undefined>, actorUserId?: string | null, allowSelfNotification = false) {
  return [...new Set(ids.filter(Boolean) as string[])].filter((id) => allowSelfNotification || id !== actorUserId);
}

export function notificationPreferenceAllows(type: NotificationType, preferences: NotificationPreferencesShape = defaultNotificationPreferences) {
  if (type === 'THREAD_REPLY') return preferences.repliesToMyContent || preferences.watchedThreadUpdates;
  if (type === 'THREAD_STATUS_CHANGED' || type === 'THREAD_RECONFIRMED' || type === 'THREAD_NEEDS_CURRENT_CONTEXT') {
    return preferences.watchedThreadUpdates || preferences.repliesToMyContent;
  }
  if (type === 'FOLLOWED_COLLEGE_NEW_THREAD' || type === 'FOLLOWED_COLLEGE_NEW_EXPERIENCE') return preferences.followedCollegeUpdates;
  if (type === 'SAVED_CONTENT_UPDATED' || type === 'EXPERIENCE_COMMENT') return preferences.savedContentUpdates;
  if (type === 'REPORT_STATUS_UPDATED' || type === 'MODERATION_NOTICE') return preferences.reportModerationUpdates;
  return true;
}

export function followUpForFreshness(label?: string | null, signal?: string | null) {
  const text = `${label ?? ''} ${signal ?? ''}`.toLowerCase();
  if (text.includes('reconfirmed')) return 'A current student recently reconfirmed this context.';
  if (text.includes('changed recently')) return 'Changed recently. Check newer replies before relying on it.';
  if (text.includes('needs current') || text.includes('past experience')) return 'This may need current student context.';
  if (text.includes('fresh')) return 'Fresh student context is available.';
  return undefined;
}

export async function ensureNotificationPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getNotificationUnreadCount(userId: string) {
  return prisma.notification.count({ where: { recipientUserId: userId, readAt: null } });
}

export async function listNotifications(userId: string, limit = DEFAULT_NOTIFICATION_LIMIT) {
  const take = boundedInteger(limit, DEFAULT_NOTIFICATION_LIMIT, 1, MAX_NOTIFICATION_LIMIT);
  return prisma.notification.findMany({
    where: { recipientUserId: userId },
    orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
    take,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, recipientUserId: userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function createNotification(input: NotificationInput) {
  if (!input.allowSelfNotification && input.actorUserId && input.actorUserId === input.recipientUserId) return null;

  const preferences = await ensureNotificationPreferences(input.recipientUserId);
  if (!notificationPreferenceAllows(input.type, preferences)) return null;

  const idempotencyKey = input.idempotencyKey ?? buildNotificationKey(input);
  try {
    return await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? undefined,
        type: input.type,
        title: input.title.slice(0, 140),
        message: input.message.slice(0, 240),
        targetType: input.targetType,
        targetId: input.targetId,
        destinationUrl: input.destinationUrl ?? undefined,
        metadata: input.metadata,
        idempotencyKey,
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) return null;
    throw error;
  }
}

export async function createNotificationSafely(input: NotificationInput) {
  try {
    return await createNotification(input);
  } catch (error) {
    logEvent('warn', 'notifications', { code: 'notification_delivery_failed', details: { targetType: input.targetType, notificationType: input.type, errorType: error instanceof Error ? error.constructor.name : 'unknown' } });
    return null;
  }
}

export async function notifyRecipientsSafely(recipientIds: string[], base: Omit<NotificationInput, 'recipientUserId'>) {
  const recipients = uniqueRecipientIds(recipientIds, base.actorUserId, base.allowSelfNotification);
  await Promise.all(recipients.map((recipientUserId) => createNotificationSafely({
    recipientUserId,
    ...base,
    idempotencyKey: base.idempotencyKey
      ? `${base.idempotencyKey}:${recipientUserId}`
      : buildNotificationKey({ recipientUserId, type: base.type, targetType: base.targetType, targetId: base.targetId }),
  })));
}

export async function notifyFollowedCollegeNewThread(collegeId: string, actorUserId: string, thread: { id: string; title: string }, collegeSlug?: string) {
  const followers = await prisma.followedCollege.findMany({ where: { collegeId }, select: { userId: true } });
  await notifyRecipientsSafely(followers.map((item) => item.userId), {
    actorUserId,
    type: 'FOLLOWED_COLLEGE_NEW_THREAD',
    title: 'New student thread in a college you follow',
    message: thread.title,
    targetType: 'THREAD',
    targetId: thread.id,
    destinationUrl: collegeSlug ? `/colleges/${collegeSlug}/threads/${thread.id}` : undefined,
    idempotencyKey: `college-thread:${thread.id}`,
  });
}

export async function notifyFollowedCollegeNewContribution(collegeId: string, actorUserId: string, target: { id: string; title: string; type: 'EXPERIENCE' | 'INSIGHT' }) {
  const followers = await prisma.followedCollege.findMany({ where: { collegeId }, select: { userId: true } });
  await notifyRecipientsSafely(followers.map((item) => item.userId), {
    actorUserId,
    type: 'FOLLOWED_COLLEGE_NEW_EXPERIENCE',
    title: target.type === 'EXPERIENCE' ? 'New student experience shared' : 'New what-works insight shared',
    message: target.title,
    targetType: target.type,
    targetId: target.id,
    destinationUrl: target.type === 'EXPERIENCE' ? `/experiences/${target.id}` : `/what-works/${target.id}`,
    idempotencyKey: `college-${target.type.toLowerCase()}:${target.id}`,
  });
}

export async function notifySavedContentUpdated(actorUserId: string, target: { id: string; title: string; type: 'EXPERIENCE' | 'INSIGHT'; updatedAt?: Date }) {
  const savedBy = target.type === 'EXPERIENCE'
    ? await prisma.savedExperience.findMany({ where: { experienceId: target.id }, select: { userId: true } })
    : await prisma.savedInsight.findMany({ where: { insightId: target.id }, select: { userId: true } });

  await notifyRecipientsSafely(savedBy.map((item) => item.userId), {
    actorUserId,
    type: 'SAVED_CONTENT_UPDATED',
    title: target.type === 'EXPERIENCE' ? 'Saved student experience updated' : 'Saved what-works insight updated',
    message: target.title,
    targetType: target.type,
    targetId: target.id,
    destinationUrl: target.type === 'EXPERIENCE' ? `/experiences/${target.id}` : `/what-works/${target.id}`,
    idempotencyKey: `saved-update:${target.type.toLowerCase()}:${target.id}:${target.updatedAt?.getTime() ?? Date.now()}`,
  });
}

export async function notifyContentUnderReview(userId: string, target: { id: string; type: 'THREAD' | 'REPLY' | 'EXPERIENCE' | 'INSIGHT' }) {
  await createNotificationSafely({
    recipientUserId: userId,
    type: 'MODERATION_NOTICE',
    title: 'Your contribution is under privacy review',
    message: 'It is saved but not public while Yorai checks possible privacy or safety concerns.',
    targetType: 'MODERATION',
    targetId: target.id,
    destinationUrl: '/settings/safety',
    idempotencyKey: `automatic-review:${target.type}:${target.id}`,
    allowSelfNotification: true,
  });
}

export async function notifyThreadReply(actor: User, threadId: string, replyId: string) {
  const thread = await prisma.question.findUnique({
    where: { id: threadId },
    include: {
      college: { select: { slug: true } },
      watchedBy: { select: { userId: true } },
    },
  });
  if (!thread) return;
  const recipients = uniqueRecipientIds([thread.userId, ...thread.watchedBy.map((item) => item.userId)], actor.id);
  await notifyRecipientsSafely(recipients, {
    actorUserId: actor.id,
    type: 'THREAD_REPLY',
    title: 'New reply on a student thread',
    message: thread.title,
    targetType: 'REPLY',
    targetId: replyId,
    destinationUrl: `/colleges/${thread.college.slug}/threads/${thread.id}`,
    idempotencyKey: `thread-reply:${replyId}`,
  });
}

export async function notifyThreadStatusChanged(actor: User, threadId: string, status: string) {
  const thread = await prisma.question.findUnique({
    where: { id: threadId },
    include: {
      college: { select: { slug: true } },
      watchedBy: { select: { userId: true } },
    },
  });
  if (!thread) return;
  await notifyRecipientsSafely([thread.userId, ...thread.watchedBy.map((item) => item.userId)], {
    actorUserId: actor.id,
    type: 'THREAD_STATUS_CHANGED',
    title: 'Thread status updated',
    message: `${thread.title} is now ${status.toLowerCase()}.`,
    targetType: 'THREAD',
    targetId: thread.id,
    destinationUrl: `/colleges/${thread.college.slug}/threads/${thread.id}`,
    idempotencyKey: `thread-status:${thread.id}:${status}`,
  });
}

export async function notifyCommunityContextAdded(actor: User, targetType: string, targetId: string, actionType: string) {
  const target = await getNotificationTargetOwner(targetType, targetId);
  if (!target) return;
  const type = actionType.includes('CHANGED') ? 'THREAD_NEEDS_CURRENT_CONTEXT' : actionType.includes('MATCHES') ? 'THREAD_RECONFIRMED' : 'COMMUNITY_CONTEXT_ADDED';
  await createNotificationSafely({
    recipientUserId: target.userId,
    actorUserId: actor.id,
    type,
    title: type === 'THREAD_RECONFIRMED' ? 'Student context reconfirmed' : 'Community context added',
    message: target.title,
    targetType: target.notificationTargetType,
    targetId,
    destinationUrl: target.destinationUrl,
    idempotencyKey: `context:${targetType}:${targetId}:${actionType}:${actor.id}`,
  });
}

export async function notifyReportStatusUpdated(reportId: string, moderator: User, status: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { reporterUserId: true, targetType: true, targetId: true } });
  if (!report) return;
  await createNotificationSafely({
    recipientUserId: report.reporterUserId,
    actorUserId: moderator.id,
    type: 'REPORT_STATUS_UPDATED',
    title: 'Your report was updated',
    message: `Report status: ${status.toLowerCase().replaceAll('_', ' ')}.`,
    targetType: 'REPORT',
    targetId: reportId,
    destinationUrl: '/moderation',
    idempotencyKey: `report-status:${reportId}:${status}`,
    allowSelfNotification: false,
  });
}

async function getNotificationTargetOwner(targetType: string, targetId: string) {
  const type = targetType.toLowerCase();
  if (type.includes('thread')) {
    const item = await prisma.question.findUnique({ where: { id: targetId }, include: { college: { select: { slug: true } } } });
    return item ? { userId: item.userId, title: item.title, notificationTargetType: 'THREAD' as const, destinationUrl: `/colleges/${item.college.slug}/threads/${item.id}` } : null;
  }
  if (type.includes('reply')) {
    const item = await prisma.answer.findUnique({ where: { id: targetId }, include: { question: { include: { college: { select: { slug: true } } } } } });
    return item ? { userId: item.userId, title: item.question.title, notificationTargetType: 'REPLY' as const, destinationUrl: `/colleges/${item.question.college.slug}/threads/${item.question.id}` } : null;
  }
  if (type.includes('experience')) {
    const item = await prisma.experiencePost.findUnique({ where: { id: targetId } });
    return item ? { userId: item.userId, title: item.title, notificationTargetType: 'EXPERIENCE' as const, destinationUrl: `/experiences/${item.id}` } : null;
  }
  if (type.includes('insight') || type.includes('what')) {
    const item = await prisma.whatWorksPost.findUnique({ where: { id: targetId } });
    return item ? { userId: item.userId, title: item.title, notificationTargetType: 'INSIGHT' as const, destinationUrl: `/what-works/${item.id}` } : null;
  }
  return null;
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}
