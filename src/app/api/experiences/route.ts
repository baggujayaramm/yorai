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

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = await request.json() as { collegeId?: string; title?: string; body?: string; branch?: string; studyPeriod?: string; tags?: string[]; whatHelped?: string; wishIKnewEarlier?: string; personalExperience?: boolean };
    const collegeId = normalizeText(body.collegeId);
    const title = normalizeText(body.title);
    const recentCount = await prisma.experiencePost.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ratePolicies.experience.windowMs) } } });
    const limit = rateLimitDecision(recentCount, ratePolicies.experience);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });
    const titleQuality = validateContent(title, { label: 'Experience title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const bodyQuality = validateContent(body.body, { label: 'Personal experience', minLength: 50, maxLength: 4000 });
    const errors = [...titleQuality.errors, ...bodyQuality.errors];
    if (!body.personalExperience) errors.push('Confirm that this is based on your personal experience.');
    if (!collegeId || errors.length) return NextResponse.json({ ok: false, error: !collegeId ? 'Choose a college from Yorai.' : errors[0] }, { status: 400 });
    const college = await prisma.college.findFirst({ where: { id: collegeId, recordStatus: 'PUBLISHED' }, select: { id: true } });
    if (!college) return NextResponse.json({ ok: false, error: 'Choose a published college from Yorai.' }, { status: 400 });

    const recent = await prisma.experiencePost.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } }, select: { userId: true, title: true, body: true }, take: 10 });
    if (!ensureNotDuplicate({ userId: user.id, title, body: bodyQuality.text }, recent)) return NextResponse.json({ ok: false, error: 'This looks like a duplicate recent experience.' }, { status: 409 });

    const studentContext = contributionContextLabel(user);
    const risk = combineContentRisk(title, bodyQuality.text, body.whatHelped, body.wishIKnewEarlier);
    const experience = await prisma.experiencePost.create({
      data: {
        collegeId,
        userId: user.id,
        title,
        body: bodyQuality.text,
        category: 'Student experience',
        branch: normalizeText(body.branch) || user.branch || undefined,
        yearOrBatch: normalizeText(body.studyPeriod) || user.year || user.batch || undefined,
        tags: normalizeTags(body.tags, 8),
        whatWorked: normalizeText(body.whatHelped) || 'Context shared in the experience body.',
        whatDidNotWork: 'Not framed as a review.',
        advice: normalizeText(body.wishIKnewEarlier) || 'Future students should ask current students for the latest context.',
        wishIKnewEarlier: normalizeText(body.wishIKnewEarlier) || 'Ask for current branch-specific context early.',
        actuallyWorksHere: normalizeText(body.whatHelped) || 'Student-to-student context helps most.',
        whoThisMayHelp: 'Future students looking for lived context.',
        communityContext: 'Needs current student context',
        studentContext,
        trustLabel: trustLabelFromRole(user.role),
        freshnessLabel: 'Fresh',
        contextBadge: verificationDisplay(user.verificationStatus) ?? 'Self-declared context',
        proofStatus: 'Context added',
        riskLevel: risk.level,
        visibility: risk.visibility,
      },
    });
    if (risk.visibility === 'VISIBLE') await notifyFollowedCollegeNewContribution(collegeId, user.id, { id: experience.id, title: experience.title, type: 'EXPERIENCE' });
    if (risk.visibility === 'UNDER_REVIEW') await notifyContentUnderReview(user.id, { id: experience.id, type: 'EXPERIENCE' });
    await recordAnalytics('EXPERIENCE_CREATED', { userId: user.id });
    return NextResponse.json({ ok: true, experienceId: experience.id, underReview: risk.visibility === 'UNDER_REVIEW', warning: risk.userMessage });
  } catch (error) {
    return apiErrorResponse(error, 'Could not share this experience.', request, 'experiences');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    await assertNoActiveRestriction(user.id, 'POSTING');
    const body = await request.json() as { experienceId?: string; title?: string; body?: string; branch?: string; studyPeriod?: string; tags?: string[] };
    const experience = await prisma.experiencePost.findUnique({ where: { id: normalizeText(body.experienceId) } });
    if (!experience || experience.moderationStatus === 'HIDDEN') return NextResponse.json({ ok: false, error: 'Experience not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, experience.userId)) return NextResponse.json({ ok: false, error: 'You can edit only your own experience.' }, { status: 403 });
    const title = body.title === undefined ? experience.title : normalizeText(body.title);
    const bodyText = body.body === undefined ? experience.body : body.body;
    const titleQuality = validateContent(title, { label: 'Experience title', minLength: 10, maxLength: 140, allowLinks: 0 });
    const bodyQuality = validateContent(bodyText, { label: 'Personal experience', minLength: 50, maxLength: 4000 });
    const errors = [...titleQuality.errors, ...bodyQuality.errors];
    if (errors.length) return NextResponse.json({ ok: false, error: errors[0] }, { status: 400 });
    const risk = combineContentRisk(title, bodyQuality.text);
    const updated = await prisma.experiencePost.update({ where: { id: experience.id }, data: { title, body: bodyQuality.text, branch: body.branch === undefined ? experience.branch : normalizeText(body.branch) || null, yearOrBatch: body.studyPeriod === undefined ? experience.yearOrBatch : normalizeText(body.studyPeriod) || null, tags: body.tags === undefined ? experience.tags : normalizeTags(body.tags, 8), riskLevel: risk.level, visibility: risk.visibility } });
    await notifySavedContentUpdated(user.id, { id: updated.id, title: updated.title, type: 'EXPERIENCE', updatedAt: updated.updatedAt });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this experience.', request, 'experiences');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const { searchParams } = new URL(request.url);
    const experience = await prisma.experiencePost.findUnique({ where: { id: normalizeText(searchParams.get('experienceId')) } });
    if (!experience) return NextResponse.json({ ok: false, error: 'Experience not found.' }, { status: 404 });
    if (!canManageOwnContent(user.id, experience.userId) && !canModerate(user.role)) return NextResponse.json({ ok: false, error: 'You can remove only your own experience.' }, { status: 403 });
    await prisma.experiencePost.update({ where: { id: experience.id }, data: { moderationStatus: 'HIDDEN' } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not remove this experience.', request, 'experiences');
  }
}
