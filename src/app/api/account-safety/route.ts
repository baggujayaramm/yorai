import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { normalizeText, validateContent } from '@/lib/content-quality';
import { getModerationTarget } from '@/lib/moderation-targets';
import { prisma } from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const now = new Date();
    const [warnings, restrictions, appeals, recentActions] = await Promise.all([
      prisma.userWarning.findMany({ where: { recipientUserId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.temporaryRestriction.findMany({ where: { userId: user.id, expiresAt: { gt: now } }, orderBy: { expiresAt: 'asc' }, take: 20 }),
      prisma.moderationAppeal.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.moderationAction.findMany({ where: { actionType: { not: 'report:assigned' } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    const ownedActions = (await Promise.all(recentActions.map(async (action) => {
      const target = await getModerationTarget(prisma, action.targetType, action.targetId);
      return target?.userId === user.id ? { id: action.id, actionType: action.actionType, targetType: action.targetType, targetId: action.targetId, createdAt: action.createdAt.toISOString() } : null;
    }))).filter(Boolean).slice(0, 20);
    return NextResponse.json({
      ok: true,
      warnings: warnings.map((item) => ({ id: item.id, reason: item.reason, severity: item.severity, targetType: item.targetType, targetId: item.targetId, acknowledgedAt: item.acknowledgedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })),
      restrictions: restrictions.map((item) => ({ id: item.id, type: item.type, reason: item.reason, startsAt: item.startsAt.toISOString(), expiresAt: item.expiresAt.toISOString() })),
      appeals: appeals.map((item) => ({ id: item.id, moderationActionId: item.moderationActionId, clarification: item.clarification, status: item.status, resolutionSummary: item.resolutionSummary, createdAt: item.createdAt.toISOString() })),
      actions: ownedActions,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load account safety information.', request, 'account-safety');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { warningId?: string };
    const result = await prisma.userWarning.updateMany({ where: { id: normalizeText(body.warningId), recipientUserId: user.id, acknowledgedAt: null }, data: { acknowledgedAt: new Date() } });
    if (!result.count) return NextResponse.json({ ok: false, error: 'Warning not found or already acknowledged.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not acknowledge this notice.', request, 'account-safety');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { moderationActionId?: string; clarification?: string };
    const moderationActionId = normalizeText(body.moderationActionId);
    const quality = validateContent(body.clarification, { label: 'Clarification', minLength: 20, maxLength: 1500, allowLinks: 1 });
    if (!moderationActionId || quality.errors.length) return NextResponse.json({ ok: false, error: !moderationActionId ? 'Choose a moderation action.' : quality.errors[0] }, { status: 400 });
    const action = await prisma.moderationAction.findUnique({ where: { id: moderationActionId } });
    if (!action) return NextResponse.json({ ok: false, error: 'Moderation action not found.' }, { status: 404 });
    const target = await getModerationTarget(prisma, action.targetType, action.targetId);
    if (!target || target.userId !== user.id) return NextResponse.json({ ok: false, error: 'You can clarify only actions affecting your own contribution.' }, { status: 403 });
    const appeal = await prisma.moderationAppeal.create({ data: { userId: user.id, moderationActionId, clarification: quality.text } });
    return NextResponse.json({ ok: true, appealId: appeal.id });
  } catch (error) {
    const conflict = error instanceof Error && error.message.includes('Unique constraint');
    return apiErrorResponse(conflict ? new ApiError(409, 'One clarification has already been submitted for this action.', 'duplicate_clarification') : error, 'Could not submit this clarification.', request, 'account-safety');
  }
}
