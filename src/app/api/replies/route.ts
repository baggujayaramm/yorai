import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { ensureNotDuplicate, normalizeText, validateContent } from '@/lib/content-quality';
import { formatPublicUserContext, trustLabelFromRole } from '@/lib/demo-auth';
import { canManageOwnContent, canModerate } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { contributionContextLabel, verificationDisplay } from '@/lib/profile';
import { notifyContentUnderReview, notifyThreadReply } from '@/lib/notifications';
import { assertNoActiveRestriction, rateLimitDecision, ratePolicies } from '@/lib/abuse-prevention';
import { combineContentRisk } from '@/lib/content-risk';
import { recordAnalytics } from '@/lib/analytics';
import { apiErrorResponse } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'REPLYING');
    const body = (await request.json()) as { threadId?: string; collegeId?: string; body?: string; context?: string; attachmentLabel?: string };
    const quality = validateContent(body.body, { label: 'Reply', minLength: 20, maxLength: 2500 });
    const threadId = normalizeText(body.threadId);
    const collegeId = normalizeText(body.collegeId);
    const recentCount = await prisma.answer.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ratePolicies.reply.windowMs) } } });
    const limit = rateLimitDecision(recentCount, ratePolicies.reply);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });

    if (!threadId || !collegeId || quality.errors.length) {
      return NextResponse.json({ ok: false, error: !threadId || !collegeId ? 'Missing thread.' : quality.errors[0] }, { status: 400 });
    }

    const thread = await prisma.question.findUnique({ where: { id: threadId }, select: { id: true, collegeId: true, status: true } });
    if (!thread || thread.collegeId !== collegeId) return NextResponse.json({ ok: false, error: 'Thread not found.' }, { status: 404 });
    if (thread.status === 'CLOSED' || thread.status === 'ARCHIVED') {
      return NextResponse.json({ ok: false, error: 'This thread is closed for new replies.' }, { status: 409 });
    }

    const recent = await prisma.answer.findMany({ where: { userId: user.id, questionId: threadId, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } }, select: { userId: true, body: true }, take: 10 });
    if (!ensureNotDuplicate({ userId: user.id, body: quality.text }, recent)) {
      return NextResponse.json({ ok: false, error: 'This looks like a duplicate recent reply.' }, { status: 409 });
    }

    const trustLabel = trustLabelFromRole(user.role);
    const speakerContext = contributionContextLabel(user) || formatPublicUserContext(user);
    const risk = combineContentRisk(quality.text, body.context);
    const [reply] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          questionId: threadId,
          collegeId,
          userId: user.id,
          body: quality.text,
          branchContext: normalizeText(body.context) || user.branch || undefined,
          batchContext: user.batch,
          studentTypeContext: trustLabel,
          speakerContext,
          trustLabel,
          contextBadge: body.attachmentLabel ? 'Context attached' : verificationDisplay(user.verificationStatus) ?? 'Self-declared context',
          communityContext: trustLabel === 'Current student' ? 'Fresh student context' : 'I can add context',
          riskLevel: risk.level,
          visibility: risk.visibility,
        },
      }),
      prisma.question.update({
        where: { id: threadId },
        data: {
          status: 'ANSWERED',
          lastActiveAt: new Date(),
          currentStudentSignal: trustLabel === 'Current student' ? 'Current students responding' : 'Recently active',
        },
      }),
    ]);
    if (risk.visibility === 'VISIBLE') await notifyThreadReply(user, threadId, reply.id);
    if (risk.visibility === 'UNDER_REVIEW') await notifyContentUnderReview(user.id, { id: reply.id, type: 'REPLY' });
    await recordAnalytics('REPLY_CREATED', { userId: user.id });

    return NextResponse.json({ ok: true, replyId: reply.id, underReview: risk.visibility === 'UNDER_REVIEW', warning: risk.userMessage });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'replies');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'REPLYING');
    const body = (await request.json()) as { replyId?: string; body?: string; context?: string };
    const replyId = normalizeText(body.replyId);
    const reply = await prisma.answer.findUnique({ where: { id: replyId } });
    if (!reply || reply.deletedAt) return NextResponse.json({ ok: false, error: 'Reply not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, reply.userId)) return NextResponse.json({ ok: false, error: 'You can edit only your own reply.' }, { status: 403 });

    const quality = validateContent(body.body, { label: 'Reply', minLength: 20, maxLength: 2500 });
    if (quality.errors.length) return NextResponse.json({ ok: false, error: quality.errors[0] }, { status: 400 });
    const risk = combineContentRisk(quality.text, body.context ?? reply.branchContext);
    await prisma.answer.update({
      where: { id: reply.id },
      data: {
        body: quality.text,
        branchContext: body.context === undefined ? reply.branchContext : normalizeText(body.context) || null,
        editedAt: new Date(),
        riskLevel: risk.level,
        visibility: risk.visibility,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this reply.', request, 'replies');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const { searchParams } = new URL(request.url);
    const replyId = normalizeText(searchParams.get('replyId'));
    const reply = await prisma.answer.findUnique({ where: { id: replyId } });
    if (!reply || reply.deletedAt) return NextResponse.json({ ok: false, error: 'Reply not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, reply.userId) && !canModerate(user.role)) {
      return NextResponse.json({ ok: false, error: 'You can remove only your own reply.' }, { status: 403 });
    }
    await prisma.answer.update({
      where: { id: reply.id },
      data: {
        body: 'This reply was removed but the thread structure is preserved.',
        deletedAt: new Date(),
        moderationStatus: canModerate(user.role) && user.id !== reply.userId ? 'HIDDEN' : reply.moderationStatus,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not remove this reply.', request, 'replies');
  }
}
