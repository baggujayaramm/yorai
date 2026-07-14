import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNotificationKey,
  createNotification,
  defaultNotificationPreferences,
  followUpForFreshness,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationPreferenceAllows,
  notifyFollowedCollegeNewThread,
  notifyReportStatusUpdated,
  notifySavedContentUpdated,
  notifyThreadReply,
  uniqueRecipientIds,
} from '../src/lib/notifications';
import { prisma } from '../src/lib/prisma';

test('notification keys and recipient filtering are deterministic', () => {
  assert.equal(buildNotificationKey({ recipientUserId: 'u1', type: 'THREAD_REPLY', targetType: 'THREAD', targetId: 't1', eventId: 'reply-1' }), 'u1:THREAD_REPLY:THREAD:t1:reply-1');
  assert.deepEqual(uniqueRecipientIds(['u1', 'u1', 'u2', undefined], 'u1'), ['u2']);
  assert.deepEqual(uniqueRecipientIds(['u1', 'u2'], 'u1', true), ['u1', 'u2']);
});

test('notification preferences filter noisy categories', () => {
  assert.equal(notificationPreferenceAllows('FOLLOWED_COLLEGE_NEW_THREAD', { ...defaultNotificationPreferences, followedCollegeUpdates: false }), false);
  assert.equal(notificationPreferenceAllows('REPORT_STATUS_UPDATED', { ...defaultNotificationPreferences, reportModerationUpdates: true }), true);
});

test('notification creation prevents duplicates and self-notifications', async () => {
  const actor = await createTestUser('notify-actor');
  const recipient = await createTestUser('notify-recipient');

  try {
    const first = await createNotification({
      recipientUserId: recipient.id,
      actorUserId: actor.id,
      type: 'THREAD_REPLY',
      title: 'New reply',
      message: 'A student added context.',
      targetType: 'THREAD',
      targetId: 'thread-1',
      idempotencyKey: 'test-duplicate-notification',
    });
    const duplicate = await createNotification({
      recipientUserId: recipient.id,
      actorUserId: actor.id,
      type: 'THREAD_REPLY',
      title: 'New reply again',
      message: 'A student added context again.',
      targetType: 'THREAD',
      targetId: 'thread-1',
      idempotencyKey: 'test-duplicate-notification',
    });
    const self = await createNotification({
      recipientUserId: actor.id,
      actorUserId: actor.id,
      type: 'THREAD_REPLY',
      title: 'Self reply',
      message: 'Should not notify.',
      targetType: 'THREAD',
      targetId: 'thread-1',
      idempotencyKey: 'test-self-notification',
    });

    assert.ok(first?.id);
    assert.equal(duplicate, null);
    assert.equal(self, null);
  } finally {
    await cleanupUsers([actor.id, recipient.id]);
  }
});

test('unread count and read state are scoped to notification owner', async () => {
  const owner = await createTestUser('notify-owner');
  const other = await createTestUser('notify-other');

  try {
    const notification = await createNotification({
      recipientUserId: owner.id,
      actorUserId: other.id,
      type: 'SAVED_CONTENT_UPDATED',
      title: 'Saved content updated',
      message: 'Useful context changed.',
      targetType: 'EXPERIENCE',
      targetId: 'experience-1',
      idempotencyKey: 'test-read-owner',
    });
    assert.equal(await getNotificationUnreadCount(owner.id), 1);
    await markNotificationRead(other.id, notification?.id ?? 'missing');
    assert.equal(await getNotificationUnreadCount(owner.id), 1);
    await markNotificationRead(owner.id, notification?.id ?? 'missing');
    assert.equal(await getNotificationUnreadCount(owner.id), 0);
  } finally {
    await cleanupUsers([owner.id, other.id]);
  }
});

test('mark all read updates only the selected user', async () => {
  const first = await createTestUser('notify-first');
  const second = await createTestUser('notify-second');

  try {
    await createNotification({ recipientUserId: first.id, type: 'MODERATION_NOTICE', title: 'Notice', message: 'Account notice.', targetType: 'PROFILE', targetId: first.id, idempotencyKey: 'test-mark-all-first', allowSelfNotification: true });
    await createNotification({ recipientUserId: second.id, type: 'MODERATION_NOTICE', title: 'Notice', message: 'Account notice.', targetType: 'PROFILE', targetId: second.id, idempotencyKey: 'test-mark-all-second', allowSelfNotification: true });
    await markAllNotificationsRead(first.id);
    assert.equal(await getNotificationUnreadCount(first.id), 0);
    assert.equal(await getNotificationUnreadCount(second.id), 1);
  } finally {
    await cleanupUsers([first.id, second.id]);
  }
});

test('watched thread reply notifications skip the actor and include watchers', async () => {
  const author = await createTestUser('notify-thread-author');
  const watcher = await createTestUser('notify-thread-watcher');
  const actor = await createTestUser('notify-thread-actor');
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });
  const thread = await prisma.question.create({ data: { collegeId: college.id, userId: author.id, title: 'Notification watched thread', body: 'A watched thread has enough body context for this deterministic test.', category: 'Student context' } });
  const reply = await prisma.answer.create({ data: { questionId: thread.id, collegeId: college.id, userId: actor.id, body: 'This reply gives useful context for notification testing.', studentTypeContext: 'Current student' } });
  await prisma.watchedThread.create({ data: { userId: watcher.id, threadId: thread.id } });

  try {
    await notifyThreadReply(actor, thread.id, reply.id);
    assert.equal(await getNotificationUnreadCount(author.id), 1);
    assert.equal(await getNotificationUnreadCount(watcher.id), 1);
    assert.equal(await getNotificationUnreadCount(actor.id), 0);
  } finally {
    await prisma.answer.deleteMany({ where: { questionId: thread.id } });
    await prisma.watchedThread.deleteMany({ where: { threadId: thread.id } });
    await prisma.question.delete({ where: { id: thread.id } });
    await cleanupUsers([author.id, watcher.id, actor.id]);
  }
});

test('followed college notifications respect preferences', async () => {
  const follower = await createTestUser('notify-follower');
  const actor = await createTestUser('notify-college-actor');
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });

  try {
    await prisma.followedCollege.create({ data: { userId: follower.id, collegeId: college.id } });
    await notifyFollowedCollegeNewThread(college.id, actor.id, { id: 'thread-pref-1', title: 'First college update' }, college.slug);
    assert.equal(await getNotificationUnreadCount(follower.id), 1);

    await markAllNotificationsRead(follower.id);
    await prisma.notificationPreference.upsert({ where: { userId: follower.id }, update: { followedCollegeUpdates: false }, create: { userId: follower.id, followedCollegeUpdates: false } });
    await notifyFollowedCollegeNewThread(college.id, actor.id, { id: 'thread-pref-2', title: 'Muted college update' }, college.slug);
    assert.equal(await getNotificationUnreadCount(follower.id), 0);
  } finally {
    await prisma.followedCollege.deleteMany({ where: { userId: follower.id } });
    await cleanupUsers([follower.id, actor.id]);
  }
});

test('report status notifications reach the reporter', async () => {
  const reporter = await createTestUser('notify-reporter');
  const moderator = await createTestUser('notify-moderator', 'MODERATOR');
  const report = await prisma.report.create({ data: { reporterUserId: reporter.id, targetType: 'thread', targetId: 'thread-report-1', reason: 'Outdated or misleading', status: 'OPEN' } });

  try {
    await notifyReportStatusUpdated(report.id, moderator, 'RESOLVED');
    assert.equal(await getNotificationUnreadCount(reporter.id), 1);
  } finally {
    await prisma.report.deleteMany({ where: { id: report.id } });
    await cleanupUsers([reporter.id, moderator.id]);
  }
});

test('saved content update notifications reach savers and respect preferences', async () => {
  const author = await createTestUser('notify-saved-author');
  const saver = await createTestUser('notify-saved-reader');
  const mutedSaver = await createTestUser('notify-saved-muted');
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });
  const experience = await prisma.experiencePost.create({
    data: {
      collegeId: college.id,
      userId: author.id,
      title: 'Saved update experience',
      body: 'This saved experience has enough calm context for a deterministic notification test.',
      category: 'Student experience',
      whatWorked: 'Useful seniors helped.',
      whatDidNotWork: 'Not framed as a review.',
      advice: 'Ask current students for context.',
      wishIKnewEarlier: 'Start small.',
      actuallyWorksHere: 'Peer context.',
      whoThisMayHelp: 'Future students.',
      communityContext: 'Needs context',
      studentContext: 'Current student',
      proofStatus: 'Context added',
    },
  });

  try {
    await prisma.savedExperience.createMany({
      data: [
        { userId: author.id, experienceId: experience.id },
        { userId: saver.id, experienceId: experience.id },
        { userId: mutedSaver.id, experienceId: experience.id },
      ],
    });
    await prisma.notificationPreference.create({ data: { userId: mutedSaver.id, savedContentUpdates: false } });
    await notifySavedContentUpdated(author.id, { id: experience.id, title: experience.title, type: 'EXPERIENCE', updatedAt: new Date('2026-07-12T00:00:00.000Z') });

    assert.equal(await getNotificationUnreadCount(author.id), 0);
    assert.equal(await getNotificationUnreadCount(saver.id), 1);
    assert.equal(await getNotificationUnreadCount(mutedSaver.id), 0);
  } finally {
    await prisma.savedExperience.deleteMany({ where: { experienceId: experience.id } });
    await prisma.experiencePost.deleteMany({ where: { id: experience.id } });
    await cleanupUsers([author.id, saver.id, mutedSaver.id]);
  }
});

test('freshness follow-up rules stay calm and explicit', () => {
  assert.match(followUpForFreshness('Past experience', null) ?? '', /current student context/);
  assert.match(followUpForFreshness('Reconfirmed', null) ?? '', /reconfirmed/);
  assert.match(followUpForFreshness('Fresh', null) ?? '', /Fresh student context/);
});

async function createTestUser(label: string, role: 'USER' | 'MODERATOR' = 'USER') {
  return prisma.user.create({
    data: {
      name: label,
      email: `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
      role,
    },
  });
}

async function cleanupUsers(userIds: string[]) {
  await prisma.notification.deleteMany({ where: { OR: [{ recipientUserId: { in: userIds } }, { actorUserId: { in: userIds } }] } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
