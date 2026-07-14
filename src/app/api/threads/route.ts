import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { ensureNotDuplicate, normalizeTags, normalizeText, validateContent } from '@/lib/content-quality';
import { formatPublicUserContext, trustLabelFromRole } from '@/lib/demo-auth';
import { canManageOwnContent, canModerate } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { contributionContextLabel, verificationDisplay } from '@/lib/profile';
import { notifyContentUnderReview, notifyFollowedCollegeNewThread, notifyThreadStatusChanged } from '@/lib/notifications';
import { assertNoActiveRestriction, rateLimitDecision, ratePolicies } from '@/lib/abuse-prevention';
import { combineContentRisk } from '@/lib/content-risk';
import { recordAnalytics } from '@/lib/analytics';
import { apiErrorResponse } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = (await request.json()) as { collegeId?: string; title?: string; context?: string; tags?: string[]; body?: string };
    const title = normalizeText(body.title);
    const textQuality = validateContent(body.body, { label: 'Question/context', minLength: 30, maxLength: 3000 });
    const titleQuality = validateContent(title, { label: 'Thread title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const collegeId = normalizeText(body.collegeId);
    const recentCount = await prisma.question.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ratePolicies.thread.windowMs) } } });
    const limit = rateLimitDecision(recentCount, ratePolicies.thread);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });

    const errors = [...titleQuality.errors, ...textQuality.errors];
    if (!collegeId || errors.length > 0) {
      return NextResponse.json({ ok: false, error: !collegeId ? 'Choose a college from Yorai.' : errors[0] }, { status: 400 });
    }

    const college = await prisma.college.findFirst({ where: { id: collegeId, recordStatus: 'PUBLISHED' }, select: { id: true, slug: true } });
    if (!college) {
      return NextResponse.json({ ok: false, error: 'Choose a published college from Yorai.' }, { status: 400 });
    }

    const recent = await prisma.question.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } }, select: { userId: true, title: true, body: true }, take: 10 });
    if (!ensureNotDuplicate({ userId: user.id, title, body: textQuality.text }, recent)) {
      return NextResponse.json({ ok: false, error: 'This looks like a duplicate recent submission.' }, { status: 409 });
    }

    const tags = normalizeTags(body.tags, 8);
    const context = normalizeText(body.context).slice(0, 160);
    const speakerContext = contributionContextLabel(user) || formatPublicUserContext(user);
    const now = new Date();
    const risk = combineContentRisk(title, textQuality.text, context);
    const thread = await prisma.question.create({
      data: {
        collegeId,
        userId: user.id,
        title,
        body: textQuality.text,
        category: tags[0] ?? 'Student context',
        branch: context.split(',')[0]?.trim() || user.branch || undefined,
        branchYearContext: context || undefined,
        topicTags: tags,
        freshnessLabel: 'Fresh student context',
        participantContext: `${speakerContext} started this thread. Awaiting student context.`,
        contextBadge: verificationDisplay(user.verificationStatus) ?? 'Self-declared context',
        currentStudentSignal: trustLabelFromRole(user.role) === 'Current student' ? 'Current students responding' : 'Awaiting student context',
        reconfirmationSignal: 'Recently active',
        speakerContext,
        trustLabel: trustLabelFromRole(user.role),
        lastActiveAt: now,
        riskLevel: risk.level,
        visibility: risk.visibility,
      },
    });
    await prisma.watchedThread.upsert({
      where: { userId_threadId: { userId: user.id, threadId: thread.id } },
      update: {},
      create: { userId: user.id, threadId: thread.id },
    }).catch(() => undefined);
    if (risk.visibility === 'VISIBLE') await notifyFollowedCollegeNewThread(collegeId, user.id, thread, college.slug);
    if (risk.visibility === 'UNDER_REVIEW') await notifyContentUnderReview(user.id, { id: thread.id, type: 'THREAD' });
    await recordAnalytics('THREAD_CREATED', { userId: user.id });

    return NextResponse.json({ ok: true, threadId: thread.id, underReview: risk.visibility === 'UNDER_REVIEW', warning: risk.userMessage });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'threads');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = (await request.json()) as { threadId?: string; title?: string; body?: string; tags?: string[]; context?: string; action?: string };
    const threadId = normalizeText(body.threadId);
    const thread = await prisma.question.findUnique({ where: { id: threadId } });
    if (!thread) return NextResponse.json({ ok: false, error: 'Thread not found.' }, { status: 404 });
    const isOwner = canManageOwnContent(user.id, thread.userId);
    const moderator = canModerate(user.role);
    if (!isOwner && !moderator) return NextResponse.json({ ok: false, error: 'You can update only your own thread.' }, { status: 403 });

    if (body.action) {
      if (body.action === 'mark-answered' && !isOwner && !moderator) throw new Error('Only the thread author can mark this answered.');
      if (body.action === 'close' && !isOwner && !moderator) throw new Error('Only the author or a moderator can close this thread.');
      if (body.action === 'archive' && !moderator) throw new Error('Only moderators can archive threads.');
      const status = body.action === 'mark-answered' ? 'ANSWERED' : body.action === 'close' ? 'CLOSED' : body.action === 'archive' ? 'ARCHIVED' : undefined;
      if (!status) return NextResponse.json({ ok: false, error: 'Unsupported thread action.' }, { status: 400 });
      const updated = await prisma.question.update({ where: { id: thread.id }, data: { status } });
      await notifyThreadStatusChanged(user, thread.id, updated.status);
      return NextResponse.json({ ok: true, status: updated.status });
    }

    if (!isOwner) return NextResponse.json({ ok: false, error: 'Only the thread author can edit the thread text.' }, { status: 403 });
    const title = body.title === undefined ? thread.title : normalizeText(body.title);
    const text = body.body === undefined ? thread.body : validateContent(body.body, { label: 'Question/context', minLength: 30, maxLength: 3000 }).text;
    const titleQuality = validateContent(title, { label: 'Thread title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const bodyQuality = validateContent(text, { label: 'Question/context', minLength: 30, maxLength: 3000 });
    const errors = [...titleQuality.errors, ...bodyQuality.errors];
    if (errors.length > 0) return NextResponse.json({ ok: false, error: errors[0] }, { status: 400 });

    const risk = combineContentRisk(title, bodyQuality.text, body.context ?? thread.branchYearContext);
    await prisma.question.update({
      where: { id: thread.id },
      data: {
        title,
        body: bodyQuality.text,
        branchYearContext: body.context === undefined ? thread.branchYearContext : normalizeText(body.context).slice(0, 160) || null,
        branch: body.context === undefined ? thread.branch : normalizeText(body.context).split(',')[0]?.trim() || thread.branch,
        topicTags: body.tags === undefined ? thread.topicTags : normalizeTags(body.tags, 8),
        riskLevel: risk.level,
        visibility: risk.visibility,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this thread.', request, 'threads');
  }
}
