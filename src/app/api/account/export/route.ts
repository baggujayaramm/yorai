import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-response';
import { requireCurrentUser } from '@/lib/auth';
import { featureEnabled } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    if (!await featureEnabled('data_exports')) return NextResponse.json({ ok: false, error: 'Data export requests are temporarily unavailable.' }, { status: 503 });
    const user = await requireCurrentUser();
    const exportRequest = await prisma.dataExportRequest.create({ data: { userId: user.id, status: 'READY', completedAt: new Date() } });
    const [profile, threads, replies, experiences, insights, savedExperiences, savedInsights, follows, watches, notifications, feedback, reports] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { id: true, displayName: true, anonymousDisplayName: true, username: true, role: true, branch: true, year: true, batch: true, hostelStatus: true, interestedBranch: true, publicBio: true, profileVisibility: true, createdAt: true } }),
      prisma.question.findMany({ where: { userId: user.id }, select: { id: true, collegeId: true, title: true, body: true, topicTags: true, status: true, createdAt: true, updatedAt: true } }),
      prisma.answer.findMany({ where: { userId: user.id }, select: { id: true, questionId: true, body: true, createdAt: true, updatedAt: true, deletedAt: true } }),
      prisma.experiencePost.findMany({ where: { userId: user.id }, select: { id: true, collegeId: true, title: true, body: true, tags: true, createdAt: true, updatedAt: true } }),
      prisma.whatWorksPost.findMany({ where: { userId: user.id }, select: { id: true, collegeId: true, title: true, body: true, tags: true, createdAt: true, updatedAt: true } }),
      prisma.savedExperience.findMany({ where: { userId: user.id }, select: { experienceId: true, createdAt: true } }),
      prisma.savedInsight.findMany({ where: { userId: user.id }, select: { insightId: true, createdAt: true } }),
      prisma.followedCollege.findMany({ where: { userId: user.id }, select: { collegeId: true, createdAt: true } }),
      prisma.watchedThread.findMany({ where: { userId: user.id }, select: { threadId: true, createdAt: true } }),
      prisma.notification.findMany({ where: { recipientUserId: user.id }, select: { id: true, type: true, title: true, message: true, targetType: true, targetId: true, readAt: true, createdAt: true } }),
      prisma.feedback.findMany({ where: { submitterId: user.id }, select: { id: true, category: true, title: true, description: true, status: true, currentPage: true, createdAt: true, updatedAt: true } }),
      prisma.report.findMany({ where: { reporterUserId: user.id }, select: { id: true, targetType: true, targetId: true, reason: true, details: true, status: true, createdAt: true, updatedAt: true } }),
    ]);
    return NextResponse.json({
      ok: true,
      requestId: exportRequest.id,
      generatedAt: new Date().toISOString(),
      data: { profile, contributions: { threads, replies, experiences, insights }, savedContent: { savedExperiences, savedInsights, follows, watches }, notifications, feedback, submittedReports: reports },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Could not prepare your data export yet.', request, 'account-export');
  }
}
