import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createNotificationSafely } from '@/lib/notifications';
import { apiErrorResponse } from '@/lib/api-response';
import { featureEnabled } from '@/lib/release-controls';

export async function GET(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    const moderator = await requireModeratorUser();
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') ?? 'flagged';
    if (section === 'audit' || section === 'metrics') {
      if (!canAdminCollegeData(moderator.role)) return NextResponse.json({ ok: false, error: 'This operation is limited to Yorai administrators.' }, { status: 403 });
    }

    if (section === 'flagged') {
      const [threads, replies, experiences, insights] = await Promise.all([
        prisma.question.findMany({ where: { OR: [{ visibility: { not: 'VISIBLE' } }, { riskLevel: { not: 'LOW' } }] }, orderBy: [{ riskLevel: 'desc' }, { updatedAt: 'desc' }], take: 15 }),
        prisma.answer.findMany({ where: { OR: [{ visibility: { not: 'VISIBLE' } }, { riskLevel: { not: 'LOW' } }] }, orderBy: [{ riskLevel: 'desc' }, { updatedAt: 'desc' }], take: 15 }),
        prisma.experiencePost.findMany({ where: { OR: [{ visibility: { not: 'VISIBLE' } }, { riskLevel: { not: 'LOW' } }] }, orderBy: [{ riskLevel: 'desc' }, { updatedAt: 'desc' }], take: 15 }),
        prisma.whatWorksPost.findMany({ where: { OR: [{ visibility: { not: 'VISIBLE' } }, { riskLevel: { not: 'LOW' } }] }, orderBy: [{ riskLevel: 'desc' }, { updatedAt: 'desc' }], take: 15 }),
      ]);
      const items = [
        ...threads.map((item) => ({ id: item.id, type: 'THREAD', preview: `${item.title}: ${item.body}`, riskLevel: item.riskLevel, visibility: item.visibility, updatedAt: item.updatedAt })),
        ...replies.map((item) => ({ id: item.id, type: 'REPLY', preview: item.body, riskLevel: item.riskLevel, visibility: item.visibility, updatedAt: item.updatedAt })),
        ...experiences.map((item) => ({ id: item.id, type: 'EXPERIENCE', preview: `${item.title}: ${item.body}`, riskLevel: item.riskLevel, visibility: item.visibility, updatedAt: item.updatedAt })),
        ...insights.map((item) => ({ id: item.id, type: 'INSIGHT', preview: `${item.title}: ${item.body}`, riskLevel: item.riskLevel, visibility: item.visibility, updatedAt: item.updatedAt })),
      ].sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel) || b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 30);
      return NextResponse.json({ ok: true, items });
    }

    if (section === 'colleges') {
      const colleges = await prisma.college.findMany({ where: { recordStatus: 'PUBLISHED' }, orderBy: { name: 'asc' }, take: 200, select: { id: true, name: true, city: true } });
      return NextResponse.json({ ok: true, colleges });
    }

    if (section === 'appeals') {
      const appeals = await prisma.moderationAppeal.findMany({ orderBy: { createdAt: 'asc' }, take: 30, select: { id: true, moderationActionId: true, clarification: true, status: true, resolutionSummary: true, createdAt: true } });
      return NextResponse.json({ ok: true, appeals });
    }

    if (section === 'audit') {
      const actions = await prisma.moderationAction.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, actionType: true, moderatorId: true, reportId: true, targetType: true, targetId: true, createdAt: true } });
      return NextResponse.json({ ok: true, actions });
    }

    const [openReports, highRisk, activeRestrictions, resolvedReports, actionGroups, reportVolume] = await Promise.all([
      prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
      prisma.report.count({ where: { riskLevel: 'HIGH', status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
      prisma.temporaryRestriction.count({ where: { startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } } }),
      prisma.report.findMany({ where: { resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true }, take: 200 }),
      prisma.moderationAction.groupBy({ by: ['actionType'], _count: true, orderBy: { _count: { actionType: 'desc' } }, take: 12 }),
      prisma.report.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    const resolvedDurations = resolvedReports.map((item) => item.resolvedAt!.getTime() - item.createdAt.getTime());
    return NextResponse.json({ ok: true, metrics: { openReports, unresolvedHighRisk: highRisk, activeRestrictions, reportVolume30Days: reportVolume, averageResolutionHours: resolvedDurations.length ? Math.round(resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length / 3600000) : 0, actionsByType: actionGroups.map((item) => ({ action: item.actionType, count: item._count })) } });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load moderation operations.', request, 'moderation');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    const moderator = await requireModeratorUser();
    const body = await request.json() as { appealId?: string; status?: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED'; resolutionSummary?: string };
    if (!body.appealId || !body.status) return NextResponse.json({ ok: false, error: 'Choose an appeal action.' }, { status: 400 });
    const appeal = await prisma.moderationAppeal.update({ where: { id: body.appealId }, data: { status: body.status, resolutionSummary: body.resolutionSummary?.trim().slice(0, 1000) || undefined } });
    await prisma.moderationAction.create({ data: { moderatorId: moderator.id, actionType: `appeal:${body.status.toLowerCase()}`, targetType: 'APPEAL', targetId: appeal.id } });
    await createNotificationSafely({ recipientUserId: appeal.userId, actorUserId: moderator.id, type: 'MODERATION_NOTICE', title: 'Clarification status updated', message: `Your clarification is now ${body.status.toLowerCase().replace('_', ' ')}.`, targetType: 'MODERATION', targetId: appeal.id, destinationUrl: '/settings/safety', idempotencyKey: `appeal:${appeal.id}:${body.status}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this clarification.', request, 'moderation');
  }
}

function riskRank(level: string) { return level === 'HIGH' ? 3 : level === 'MEDIUM' ? 2 : 1; }
