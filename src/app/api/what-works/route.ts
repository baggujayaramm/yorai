import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { ensureNotDuplicate, normalizeTags, normalizeText, validateContent } from '@/lib/content-quality';
import { trustLabelFromRole } from '@/lib/demo-auth';
import { canManageOwnContent, canModerate } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { contributionContextLabel, verificationDisplay } from '@/lib/profile';
import { notifyContentUnderReview, notifyFollowedCollegeNewContribution, notifySavedContentUpdated } from '@/lib/notifications';
import { assertNoActiveRestriction, rateLimitDecision, ratePolicies } from '@/lib/abuse-prevention';
import { combineContentRisk } from '@/lib/content-risk';
import { recordAnalytics } from '@/lib/analytics';
import { apiErrorResponse } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

const categories = new Set(['academics', 'placements', 'internships', 'clubs', 'projects', 'hostel', 'commuting', 'administration']);

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = await request.json() as { collegeId?: string; title?: string; category?: string; branch?: string; advice?: string; whyItHelps?: string; whoShouldKnow?: string; limitations?: string; tags?: string[] };
    const collegeId = normalizeText(body.collegeId);
    const title = normalizeText(body.title);
    const recentCount = await prisma.whatWorksPost.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ratePolicies.insight.windowMs) } } });
    const limit = rateLimitDecision(recentCount, ratePolicies.insight);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });
    const category = normalizeText(body.category).toLowerCase();
    const titleQuality = validateContent(title, { label: 'Insight title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const adviceQuality = validateContent(body.advice, { label: 'Practical advice', minLength: 40, maxLength: 3000 });
    const errors = [...titleQuality.errors, ...adviceQuality.errors];
    if (!categories.has(category)) errors.push('Choose a practical category.');
    if (!collegeId || errors.length) return NextResponse.json({ ok: false, error: !collegeId ? 'Choose a college from Yorai.' : errors[0] }, { status: 400 });
    const college = await prisma.college.findFirst({ where: { id: collegeId, recordStatus: 'PUBLISHED' }, select: { id: true } });
    if (!college) return NextResponse.json({ ok: false, error: 'Choose a published college from Yorai.' }, { status: 400 });
    const recent = await prisma.whatWorksPost.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } }, select: { userId: true, title: true, body: true }, take: 10 });
    if (!ensureNotDuplicate({ userId: user.id, title, body: adviceQuality.text }, recent)) return NextResponse.json({ ok: false, error: 'This looks like a duplicate recent insight.' }, { status: 409 });
    const risk = combineContentRisk(title, adviceQuality.text, body.whyItHelps, body.limitations);
    const post = await prisma.whatWorksPost.create({
      data: {
        collegeId,
        userId: user.id,
        title,
        body: adviceQuality.text,
        category,
        branch: normalizeText(body.branch) || user.branch || undefined,
        practicalAdvice: adviceQuality.text,
        whyItHelps: normalizeText(body.whyItHelps) || undefined,
        whoShouldKnow: normalizeText(body.whoShouldKnow) || undefined,
        limitations: normalizeText(body.limitations) || undefined,
        tags: normalizeTags(body.tags, 8),
        studentContext: contributionContextLabel(user),
        trustLabel: trustLabelFromRole(user.role),
        freshnessLabel: 'Fresh',
        contextBadge: verificationDisplay(user.verificationStatus) ?? 'Self-declared context',
        riskLevel: risk.level,
        visibility: risk.visibility,
      },
    });
    if (risk.visibility === 'VISIBLE') await notifyFollowedCollegeNewContribution(collegeId, user.id, { id: post.id, title: post.title, type: 'INSIGHT' });
    if (risk.visibility === 'UNDER_REVIEW') await notifyContentUnderReview(user.id, { id: post.id, type: 'INSIGHT' });
    await recordAnalytics('INSIGHT_CREATED', { userId: user.id });
    return NextResponse.json({ ok: true, insightId: post.id, underReview: risk.visibility === 'UNDER_REVIEW', warning: risk.userMessage });
  } catch (error) {
    return apiErrorResponse(error, 'Could not share this insight.', request, 'insights');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = await request.json() as { insightId?: string; title?: string; advice?: string; category?: string; branch?: string; tags?: string[]; limitations?: string };
    const post = await prisma.whatWorksPost.findUnique({ where: { id: normalizeText(body.insightId) } });
    if (!post || post.moderationStatus === 'HIDDEN') return NextResponse.json({ ok: false, error: 'Insight not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, post.userId)) return NextResponse.json({ ok: false, error: 'You can edit only your own insight.' }, { status: 403 });
    const title = body.title === undefined ? post.title : normalizeText(body.title);
    const advice = body.advice === undefined ? post.body : body.advice;
    const titleQuality = validateContent(title, { label: 'Insight title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const adviceQuality = validateContent(advice, { label: 'Practical advice', minLength: 40, maxLength: 3000 });
    const category = body.category === undefined ? post.category : normalizeText(body.category).toLowerCase();
    const errors = [...titleQuality.errors, ...adviceQuality.errors];
    if (!categories.has(category)) errors.push('Choose a practical category.');
    if (errors.length) return NextResponse.json({ ok: false, error: errors[0] }, { status: 400 });
    const risk = combineContentRisk(title, adviceQuality.text, body.limitations ?? post.limitations);
    const updated = await prisma.whatWorksPost.update({ where: { id: post.id }, data: { title, body: adviceQuality.text, practicalAdvice: adviceQuality.text, category, branch: body.branch === undefined ? post.branch : normalizeText(body.branch) || null, tags: body.tags === undefined ? post.tags : normalizeTags(body.tags, 8), limitations: body.limitations === undefined ? post.limitations : normalizeText(body.limitations) || null, riskLevel: risk.level, visibility: risk.visibility } });
    await notifySavedContentUpdated(user.id, { id: updated.id, title: updated.title, type: 'INSIGHT', updatedAt: updated.updatedAt });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this insight.', request, 'insights');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const { searchParams } = new URL(request.url);
    const post = await prisma.whatWorksPost.findUnique({ where: { id: normalizeText(searchParams.get('insightId')) } });
    if (!post) return NextResponse.json({ ok: false, error: 'Insight not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, post.userId) && !canModerate(user.role)) return NextResponse.json({ ok: false, error: 'You can remove only your own insight.' }, { status: 403 });
    await prisma.whatWorksPost.update({ where: { id: post.id }, data: { moderationStatus: 'HIDDEN' } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not remove this insight.', request, 'insights');
  }
}
