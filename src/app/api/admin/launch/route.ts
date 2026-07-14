import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { requireCollegeAdminUser } from '@/lib/auth';
import { validateEnvironment } from '@/lib/environment';
import { featureDefaults, getLaunchState, launchModes, safeReleaseMetadata, setPlatformSetting } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireCollegeAdminUser();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [launchState, config, users, activeUsers, signups, contributionActivity, unresolvedReports, highRiskReports, errors, feedback, dataQuality] = await Promise.all([
      getLaunchState(),
      Promise.resolve(validateEnvironment()),
      prisma.user.count(),
      prisma.analyticsEvent.groupBy({ by: ['userId'], where: { userId: { not: null }, createdAt: { gte: month } } }).then((rows) => rows.length),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      Promise.all([
        prisma.question.count({ where: { createdAt: { gte: since } } }),
        prisma.answer.count({ where: { createdAt: { gte: since } } }),
        prisma.experiencePost.count({ where: { createdAt: { gte: since } } }),
        prisma.whatWorksPost.count({ where: { createdAt: { gte: since } } }),
      ]).then((counts) => counts.reduce((sum, count) => sum + count, 0)),
      prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
      prisma.report.count({ where: { riskLevel: 'HIGH', status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
      prisma.operationalEvent.findMany({ where: { level: { in: ['warn', 'error'] }, createdAt: { gte: month } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.feedback.count({ where: { createdAt: { gte: month } } }),
      Promise.all([
        prisma.college.count({ where: { recordStatus: 'PUBLISHED' } }),
        prisma.college.count({ where: { dataOrigin: 'FICTIONAL_DEMO', recordStatus: 'PUBLISHED' } }),
        prisma.college.count({ where: { recordStatus: { not: 'PUBLISHED' } } }),
      ]).then(([published, demoPublished, unpublished]) => ({ published, demoPublished, unpublished })),
    ]);
    return NextResponse.json({
      ok: true,
      launchState,
      metadata: safeReleaseMetadata(),
      config,
      metrics: { users, activeUsers, signupSuccess24h: signups, contributionActivity24h: contributionActivity, unresolvedReports, highRiskReports, recentApplicationErrors: errors, feedbackVolume30d: feedback, dataQuality },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load launch readiness.', request, 'launch-admin');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { type?: string; launchMode?: string; key?: string; enabled?: boolean };
    if (body.type === 'launch-mode') {
      const mode = body.launchMode?.toUpperCase();
      if (!launchModes.includes(mode as never)) throw new ApiError(400, 'Choose a valid launch mode.', 'invalid_launch_mode');
      await setPlatformSetting('launch_mode', { mode }, admin.id);
      await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: `launch_mode:${mode?.toLowerCase()}`, targetType: 'PLATFORM_SETTING', targetId: 'launch_mode' } });
      return NextResponse.json({ ok: true });
    }
    if (body.type === 'feature') {
      if (!body.key || !(body.key in featureDefaults) || typeof body.enabled !== 'boolean') throw new ApiError(400, 'Choose a valid launch control.', 'invalid_launch_control');
      await prisma.featureFlag.upsert({ where: { key: body.key }, update: { enabled: body.enabled }, create: { key: body.key, enabled: body.enabled } });
      await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: `launch_feature:${body.enabled ? 'enabled' : 'disabled'}`, targetType: 'FEATURE_FLAG', targetId: body.key } });
      return NextResponse.json({ ok: true });
    }
    throw new ApiError(400, 'Choose a valid launch operation.', 'invalid_launch_operation');
  } catch (error) {
    return apiErrorResponse(error, 'Could not update launch controls.', request, 'launch-admin');
  }
}
