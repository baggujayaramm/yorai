import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { requireCollegeAdminUser } from '@/lib/auth';
import { featureDefaults, safeReleaseMetadata } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireCollegeAdminUser();
    const [flags, releases, announcements] = await Promise.all([
      prisma.featureFlag.findMany({ orderBy: { key: 'asc' }, take: 50 }),
      prisma.releaseRecord.findMany({ orderBy: { releaseDate: 'desc' }, take: 20 }),
      prisma.betaAnnouncement.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);
    return NextResponse.json({ ok: true, defaults: featureDefaults, flags, releases, announcements, current: safeReleaseMetadata() });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load release controls.', request, 'release-admin');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { type?: string; key?: string; enabled?: boolean; id?: string; active?: boolean };
    if (body.type === 'announcement') {
      if (!body.id || typeof body.active !== 'boolean') throw new ApiError(400, 'Choose a valid announcement action.', 'invalid_announcement_action');
      await prisma.betaAnnouncement.update({ where: { id: body.id }, data: { active: body.active } });
      await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: `announcement:${body.active ? 'activated' : 'deactivated'}`, targetType: 'ANNOUNCEMENT', targetId: body.id } });
      return NextResponse.json({ ok: true });
    }
    if (!body.key || !(body.key in featureDefaults) || typeof body.enabled !== 'boolean') throw new ApiError(400, 'Choose a valid feature flag.', 'invalid_flag');
    await prisma.featureFlag.upsert({ where: { key: body.key }, update: { enabled: body.enabled }, create: { key: body.key, enabled: body.enabled } });
    await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: `feature:${body.enabled ? 'enabled' : 'disabled'}`, targetType: 'FEATURE_FLAG', targetId: body.key } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update release controls.', request, 'release-admin');
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { type?: string; version?: string; releaseDate?: string; migrationVersion?: string; title?: string; message?: string; startsAt?: string; expiresAt?: string; audience?: string };
    if (body.type === 'release') {
      const metadata = safeReleaseMetadata();
      const version = (body.version || metadata.version).slice(0, 40);
      const releaseDate = parseDate(body.releaseDate, new Date(), 'release date');
      const release = await prisma.releaseRecord.upsert({
        where: { version },
        update: { releaseDate, migrationVersion: (body.migrationVersion || metadata.migrationVersion).slice(0, 80), buildIdentifier: metadata.buildIdentifier, environment: metadata.environment },
        create: { version, releaseDate, migrationVersion: (body.migrationVersion || metadata.migrationVersion).slice(0, 80), buildIdentifier: metadata.buildIdentifier, environment: metadata.environment },
      });
      await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: 'release:recorded', targetType: 'RELEASE', targetId: release.id } });
      return NextResponse.json({ ok: true });
    }
    if (body.type === 'announcement') {
      if (!body.title?.trim() || !body.message?.trim() || !['ALL_USERS', 'BETA_USERS', 'MODERATORS', 'ADMINS'].includes(body.audience ?? '')) throw new ApiError(400, 'Add valid announcement details.', 'invalid_announcement');
      const startsAt = parseDate(body.startsAt, new Date(), 'announcement start');
      const expiresAt = body.expiresAt ? parseDate(body.expiresAt, undefined, 'announcement expiration') : undefined;
      if (expiresAt && expiresAt <= startsAt) throw new ApiError(400, 'Choose an announcement expiration after its start.', 'invalid_announcement_expiry');
      const announcement = await prisma.betaAnnouncement.create({ data: { title: body.title.trim().slice(0, 100), message: body.message.trim().slice(0, 500), startsAt, expiresAt, audience: body.audience as never } });
      await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: 'announcement:created', targetType: 'ANNOUNCEMENT', targetId: announcement.id } });
      return NextResponse.json({ ok: true });
    }
    throw new ApiError(400, 'Choose a release operation.', 'invalid_release_operation');
  } catch (error) {
    return apiErrorResponse(error, 'Could not save release information.', request, 'release-admin');
  }
}

function parseDate(value: string | undefined, fallback: Date | undefined, label: string) {
  if (!value) {
    if (fallback) return fallback;
    throw new ApiError(400, `Choose a valid ${label}.`, 'invalid_release_date');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new ApiError(400, `Choose a valid ${label}.`, 'invalid_release_date');
  return date;
}
