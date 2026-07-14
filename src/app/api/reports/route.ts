import type { ContentRiskLevel, ContentVisibility, Prisma, ReportStatus, RestrictionType, WarningSeverity } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { assertNoActiveRestriction, rateLimitDecision, ratePolicies } from '@/lib/abuse-prevention';
import { requireCurrentUser, requireModeratorUser } from '@/lib/auth';
import { normalizeText, validateContent } from '@/lib/content-quality';
import { assignmentIsStale, canHandleAssignedReport, canTransitionReportStatus, isReportLifecycleStatus } from '@/lib/moderation';
import { getModerationTarget, updateTargetVisibility } from '@/lib/moderation-targets';
import { createNotificationSafely, notifyReportStatusUpdated } from '@/lib/notifications';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { canReportTarget } from '@/lib/report-policy';
import { recordAnalytics } from '@/lib/analytics';
import { apiErrorResponse } from '@/lib/api-response';
import { logEvent, requestIdFor } from '@/lib/observability';
import { boundedInteger } from '@/lib/query-limits';
import { assertBetaWriteAccess } from '@/lib/release-controls';
import { featureEnabled } from '@/lib/release-controls';

export const MAX_REPORT_PAGE_SIZE = 50;

export const safeReportReasons = [
  'Harassment', 'Private information', 'Impersonation', 'Spam', 'Misleading context',
  'Unsupported accusation', 'Irrelevant content', 'Other',
] as const;

const reportReasonAliases: Record<string, (typeof safeReportReasons)[number]> = {
  'Privacy issue': 'Private information',
  'Fake or spam': 'Spam',
  'Foul language': 'Harassment',
  'Personal attack': 'Harassment',
  'Outdated or misleading': 'Misleading context',
  'Unsupported serious allegation': 'Unsupported accusation',
  'Minor safety concern': 'Other',
  'Incorrect college or branch': 'Misleading context',
};

const unresolvedStatuses: ReportStatus[] = ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'];

export async function GET(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    const moderator = await requireModeratorUser();
    const { searchParams } = new URL(request.url);
    const page = boundedInteger(searchParams.get('page'), 1, 1, 10_000);
    const pageSize = boundedInteger(searchParams.get('pageSize'), 20, 1, MAX_REPORT_PAGE_SIZE);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const targetType = normalizeText(searchParams.get('targetType'));
    const reason = normalizeText(searchParams.get('reason'));
    const collegeId = normalizeText(searchParams.get('collegeId'));
    const assigned = searchParams.get('assigned');
    const sort = searchParams.get('sort') ?? 'highest-risk';
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));

    const where: Prisma.ReportWhereInput = {
      status: isReportStatus(status) ? status : undefined,
      riskLevel: isRiskLevel(riskLevel) ? riskLevel : undefined,
      targetType: targetType || undefined,
      reason: reason || undefined,
      assignedModeratorId: assigned === 'me' ? moderator.id : assigned === 'unassigned' ? null : undefined,
      createdAt: from || to ? { gte: from, lte: to } : undefined,
    };

    const orderBy: Prisma.ReportOrderByWithRelationInput[] = sort === 'oldest'
      ? [{ createdAt: 'asc' }]
      : sort === 'newest' ? [{ createdAt: 'desc' }]
        : sort === 'most-reported' ? [{ targetId: 'asc' }, { createdAt: 'asc' }]
          : [{ riskLevel: 'desc' }, { createdAt: 'asc' }];

    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        include: { assignedModerator: { select: { id: true, displayName: true, anonymousDisplayName: true, name: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.report.count({ where }),
    ]);
    const reportCounts = reports.length ? await prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: { OR: reports.map((report) => ({ targetType: report.targetType, targetId: report.targetId })) },
      _count: { _all: true },
    }) : [];
    const countByTarget = new Map(reportCounts.map((item) => [`${item.targetType}:${item.targetId}`, item._count._all]));

    const items = (await Promise.all(reports.map(async (report) => {
      const target = await getModerationTarget(prisma, report.targetType, report.targetId);
      if (collegeId && target?.collegeId !== collegeId) return null;
      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details ?? '',
        status: report.status,
        riskLevel: report.riskLevel,
        moderatorNotes: report.moderatorNotes ?? '',
        createdAt: report.createdAt.toISOString(),
        assignedModerator: report.assignedModerator ? {
          id: report.assignedModerator.id,
          label: report.assignedModerator.displayName ?? report.assignedModerator.anonymousDisplayName ?? report.assignedModerator.name,
        } : null,
        assignedAt: report.assignedAt?.toISOString() ?? null,
        resolvedAt: report.resolvedAt?.toISOString() ?? null,
        preview: target?.preview ?? 'Content preview unavailable.',
        visibility: target?.visibility ?? 'VISIBLE',
        collegeId: target?.collegeId ?? null,
        reportCount: countByTarget.get(`${report.targetType}:${report.targetId}`) ?? 1,
      };
    }))).filter(Boolean);
    if (sort === 'most-reported') items.sort((a, b) => (b?.reportCount ?? 0) - (a?.reportCount ?? 0));

    return NextResponse.json({ ok: true, reports: items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load reports.', request, 'reports');
  }
}

export async function POST(request: NextRequest) {
  try {
    const reporter = await requireCurrentUser();
    await assertBetaWriteAccess(reporter);
    await assertNoActiveRestriction(reporter.id, 'REPORTING');
    const body = (await request.json()) as { targetType?: string; targetId?: string; reason?: string; details?: string };
    const targetType = normalizeText(body.targetType);
    const targetId = normalizeText(body.targetId);
    const reason = normalizeReportReason(body.reason);
    if (!targetType || !targetId) return NextResponse.json({ ok: false, error: 'Choose the content you want Yorai to review.' }, { status: 400 });
    if (!reason) return NextResponse.json({ ok: false, error: 'Choose a report reason.' }, { status: 400 });

    const target = await getModerationTarget(prisma, targetType, targetId);
    if (!target) return NextResponse.json({ ok: false, error: 'This content is no longer available.' }, { status: 404 });
    if (!canReportTarget(reporter.id, target.userId)) return NextResponse.json({ ok: false, error: 'You cannot report your own contribution. You can edit it or ask support for help.' }, { status: 409 });

    const recentCount = await prisma.report.count({ where: { reporterUserId: reporter.id, createdAt: { gte: new Date(Date.now() - ratePolicies.report.windowMs) } } });
    const limit = rateLimitDecision(recentCount, ratePolicies.report);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });
    const duplicate = await prisma.report.findFirst({ where: { reporterUserId: reporter.id, targetType, targetId, status: { in: unresolvedStatuses } } });
    if (duplicate) return NextResponse.json({ ok: false, error: 'You already have an open report for this content.' }, { status: 409 });

    const details = normalizeText(body.details);
    if (details) {
      const quality = validateContent(details, { label: 'Report details', minLength: 8, maxLength: 1000, allowLinks: 1 });
      if (quality.errors.length) return NextResponse.json({ ok: false, error: quality.errors[0] }, { status: 400 });
    }
    const riskLevel = reportRisk(reason, target.riskLevel);
    const report = await prisma.report.create({ data: { reporterUserId: reporter.id, targetType, targetId, reason, riskLevel, status: 'OPEN', details: details || undefined } });
    await createNotificationSafely({
      recipientUserId: reporter.id,
      type: 'REPORT_STATUS_UPDATED', title: 'Report received',
      message: 'Thanks. Yorai will review this without revealing your identity.',
      targetType: 'REPORT', targetId: report.id, destinationUrl: '/notifications',
      idempotencyKey: `report-received:${report.id}`, allowSelfNotification: true,
    });
    await recordAnalytics('REPORT_CREATED', { userId: reporter.id });
    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'reports');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    const moderator = await requireModeratorUser();
    const body = (await request.json()) as {
      id?: string; operation?: string; status?: string; moderatorNotes?: string;
      visibility?: ContentVisibility; warningSeverity?: WarningSeverity; restrictionType?: RestrictionType;
      restrictionHours?: number;
    };
    const reportId = normalizeText(body.id);
    if (!reportId) return NextResponse.json({ ok: false, error: 'Missing report.' }, { status: 400 });
    const note = normalizeText(body.moderatorNotes).slice(0, 2000) || undefined;

    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUniqueOrThrow({ where: { id: reportId } });
      const target = await getModerationTarget(tx, report.targetType, report.targetId);
      if (!target) throw new Error('Reported content is unavailable.');
      const operation = body.operation ?? 'status';
      const staleAssignment = assignmentIsStale(report.assignedAt);
      if (!canHandleAssignedReport(report.assignedModeratorId, moderator.id) && !staleAssignment && operation !== 'assign-self') {
        throw new Error('Another moderator is currently handling this report.');
      }

      if (operation === 'assign-self') {
        if (report.assignedModeratorId && report.assignedModeratorId !== moderator.id && !staleAssignment) throw new Error('Another moderator is currently handling this report.');
        const updated = await tx.report.update({ where: { id: report.id }, data: { assignedModeratorId: moderator.id, assignedAt: new Date(), status: report.status === 'OPEN' ? 'UNDER_REVIEW' : report.status } });
        await audit(tx, moderator.id, report, 'report:assigned', note);
        return { report: updated, target, notification: null };
      }
      if (operation === 'release') {
        const updated = await tx.report.update({ where: { id: report.id }, data: { assignedModeratorId: null, assignedAt: null } });
        await audit(tx, moderator.id, report, 'report:released', note);
        return { report: updated, target, notification: null };
      }

      if (operation === 'visibility') {
        if (!isVisibility(body.visibility)) throw new Error('Choose a valid visibility action.');
        await updateTargetVisibility(tx, report.targetType, report.targetId, body.visibility);
        await audit(tx, moderator.id, report, `content:${body.visibility.toLowerCase()}`, note);
        const updated = await tx.report.update({ where: { id: report.id }, data: { status: body.visibility === 'VISIBLE' ? 'RESOLVED' : 'ACTIONED', resolvedAt: new Date(), moderatorNotes: note } });
        return { report: updated, target, notification: body.visibility };
      }

      if (operation === 'warning') {
        const severity = isWarningSeverity(body.warningSeverity) ? body.warningSeverity : 'LOW';
        await tx.userWarning.create({ data: { recipientUserId: target.userId, issuedByUserId: moderator.id, reason: note ?? 'Please keep future contributions respectful, contextual, and privacy-safe.', severity, targetType: target.type, targetId: target.id } });
        await audit(tx, moderator.id, report, `warning:${severity.toLowerCase()}`, note);
        return { report, target, notification: 'WARNING' as const };
      }

      if (operation === 'restriction') {
        if (!body.restrictionType) throw new Error('Choose a restriction type.');
        if (!canAdminCollegeData(moderator.role) && body.restrictionHours && body.restrictionHours > 168) throw new Error('Moderators can apply restrictions for up to seven days.');
        const hours = Math.min(Math.max(body.restrictionHours ?? 24, 1), canAdminCollegeData(moderator.role) ? 720 : 168);
        await tx.temporaryRestriction.create({ data: { userId: target.userId, type: body.restrictionType, reason: note ?? 'A temporary safety restriction is active.', expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000), issuedByUserId: moderator.id, internalNote: note } });
        await audit(tx, moderator.id, report, `restriction:${body.restrictionType.toLowerCase()}`, note);
        return { report, target, notification: 'RESTRICTION' as const };
      }

      if (operation === 'request-clarification') {
        const updated = await tx.report.update({ where: { id: report.id }, data: { status: 'UNDER_REVIEW', moderatorNotes: note } });
        await audit(tx, moderator.id, report, 'content:clarification-requested', note);
        return { report: updated, target, notification: 'CLARIFICATION' as const };
      }

      if (operation === 'archive') {
        await updateTargetVisibility(tx, report.targetType, report.targetId, 'HIDDEN');
        const updated = await tx.report.update({ where: { id: report.id }, data: { status: 'ACTIONED', resolvedAt: new Date(), moderatorNotes: note } });
        await audit(tx, moderator.id, report, 'content:archived', note);
        return { report: updated, target, notification: 'HIDDEN' as const };
      }

      if (operation === 'escalate-admin') {
        const updated = await tx.report.update({ where: { id: report.id }, data: { status: 'UNDER_REVIEW', riskLevel: 'HIGH', moderatorNotes: note, assignedModeratorId: null, assignedAt: null } });
        await audit(tx, moderator.id, report, 'report:escalated-admin', note);
        return { report: updated, target, notification: 'ESCALATED' as const };
      }

      const nextStatus = isReportStatus(body.status) ? body.status : undefined;
      if (!nextStatus) throw new Error('Choose a valid report action.');
      if (isReportLifecycleStatus(nextStatus) && isReportLifecycleStatus(report.status) && !canTransitionReportStatus(report.status, nextStatus)) throw new Error(`Cannot move report from ${report.status} to ${nextStatus}.`);
      const resolvedAt = ['RESOLVED', 'DISMISSED', 'ACTIONED', 'REJECTED'].includes(nextStatus) ? new Date() : null;
      const updated = await tx.report.update({ where: { id: report.id }, data: { status: nextStatus, moderatorNotes: note, resolvedAt } });
      await audit(tx, moderator.id, report, `report:${nextStatus.toLowerCase()}`, note);
      return { report: updated, target, notification: null };
    });

    if (body.status) await notifyReportStatusUpdated(result.report.id, moderator, body.status);
    if (result.notification === 'ESCALATED') await notifyAdmins(result.report.id, moderator.id);
    else if (result.notification) await notifyAffectedUser(result.target.userId, moderator.id, result.target, result.notification);
    logEvent('info', 'moderation', { requestId: requestIdFor(request), code: 'moderation_action_completed', details: { operation: body.operation ?? body.status ?? 'status', targetType: result.target.type } });
    return NextResponse.json({ ok: true, report: result.report });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this yet. Try again.', request, 'moderation');
  }
}

async function audit(tx: Prisma.TransactionClient, moderatorId: string, report: { id: string; targetType: string; targetId: string }, actionType: string, note?: string) {
  return tx.moderationAction.create({ data: { moderatorId, reportId: report.id, targetType: report.targetType, targetId: report.targetId, actionType, internalNote: note } });
}

async function notifyAffectedUser(userId: string, moderatorId: string, target: { type: string; id: string }, event: string) {
  const restored = event === 'VISIBLE';
  const warning = event === 'WARNING';
  const restriction = event === 'RESTRICTION';
  const clarification = event === 'CLARIFICATION';
  await createNotificationSafely({
    recipientUserId: userId, actorUserId: moderatorId, type: 'MODERATION_NOTICE',
    title: warning ? 'A private community guidance notice was added' : restriction ? 'A temporary contribution restriction was applied' : clarification ? 'A moderator requested clarification' : restored ? 'Your contribution was restored' : 'A moderation update affects your contribution',
    message: warning ? 'Review the private notice in your account.' : restriction ? 'You can continue browsing. Check your account for the restriction details.' : clarification ? 'Review the action in your account and add one concise clarification.' : restored ? 'The contribution is visible again.' : 'The contribution is not currently public. You can review the action in your account.',
    targetType: 'MODERATION', targetId: target.id, destinationUrl: '/settings',
    idempotencyKey: `moderation:${event}:${target.type}:${target.id}:${Date.now()}`,
  });
}

async function notifyAdmins(reportId: string, actorUserId: string) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  await Promise.all(admins.map((admin) => createNotificationSafely({ recipientUserId: admin.id, actorUserId, type: 'MODERATION_NOTICE', title: 'Report escalated for admin review', message: 'A moderator escalated a high-risk report.', targetType: 'REPORT', targetId: reportId, destinationUrl: '/moderation', idempotencyKey: `admin-escalation:${reportId}:${admin.id}` })));
}

function normalizeReportReason(value?: string) {
  const normalized = normalizeText(value);
  if ((safeReportReasons as readonly string[]).includes(normalized)) return normalized as (typeof safeReportReasons)[number];
  return reportReasonAliases[normalized] ?? null;
}

function reportRisk(reason: string, contentRisk: ContentRiskLevel): ContentRiskLevel {
  if (contentRisk === 'HIGH' || reason === 'Private information' || reason === 'Unsupported accusation') return 'HIGH';
  if (contentRisk === 'MEDIUM' || reason === 'Harassment' || reason === 'Impersonation') return 'MEDIUM';
  return 'LOW';
}

function isReportStatus(value: string | null | undefined): value is ReportStatus {
  return ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'PENDING', 'REVIEWED', 'ACTIONED', 'REJECTED'].includes(value ?? '');
}
function isRiskLevel(value: string | null): value is ContentRiskLevel { return ['LOW', 'MEDIUM', 'HIGH'].includes(value ?? ''); }
function isVisibility(value?: string): value is ContentVisibility { return ['VISIBLE', 'UNDER_REVIEW', 'HIDDEN', 'REMOVED'].includes(value ?? ''); }
function isWarningSeverity(value?: string): value is WarningSeverity { return ['LOW', 'MEDIUM', 'HIGH'].includes(value ?? ''); }
function parseDate(value: string | null) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : undefined; }
