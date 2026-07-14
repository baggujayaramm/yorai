import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { PersonalTargetType } from '@/lib/personal-state-storage';
import { consumeInMemoryLimit, ratePolicies } from '@/lib/abuse-prevention';
import { recordAnalytics } from '@/lib/analytics';
import { apiErrorResponse } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true, records: [] });
  const userId = user.id;

  const [colleges, threads, experiences, insights] = await Promise.all([
    prisma.followedCollege.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.watchedThread.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.savedExperience.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.savedInsight.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
  ]);

  return NextResponse.json({
    ok: true,
    records: [
      ...colleges.map((item) => toRecord(item.id, userId, 'college' as const, item.collegeId, item.createdAt)),
      ...threads.map((item) => toRecord(item.id, userId, 'thread' as const, item.threadId, item.createdAt)),
      ...experiences.map((item) => toRecord(item.id, userId, 'experience' as const, item.experienceId, item.createdAt)),
      ...insights.map((item) => toRecord(item.id, userId, 'insight' as const, item.insightId, item.createdAt)),
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const limit = consumeInMemoryLimit(`personal:${user.id}`, ratePolicies.personal);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });
    const body = (await request.json()) as { targetType?: PersonalTargetType; targetId?: string };
    if (!body.targetType || !body.targetId) {
      return NextResponse.json({ ok: false, error: 'Missing target.' }, { status: 400 });
    }

    const active = await toggleTarget(user.id, body.targetType, body.targetId);
    if (active) {
      const event = body.targetType === 'college' ? 'FOLLOW' : body.targetType === 'thread' ? 'WATCH' : body.targetType === 'experience' ? 'SAVE_EXPERIENCE' : 'SAVE_INSIGHT';
      await recordAnalytics(event, { userId: user.id });
    }
    return NextResponse.json({ ok: true, active });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'personal-actions');
  }
}

async function toggleTarget(userId: string, targetType: PersonalTargetType, targetId: string) {
  if (targetType === 'college') {
    const existing = await prisma.followedCollege.findUnique({ where: { userId_collegeId: { userId, collegeId: targetId } } });
    if (existing) {
      await prisma.followedCollege.delete({ where: { id: existing.id } });
      return false;
    }
    await prisma.followedCollege.create({ data: { userId, collegeId: targetId } });
    return true;
  }

  if (targetType === 'thread') {
    const existing = await prisma.watchedThread.findUnique({ where: { userId_threadId: { userId, threadId: targetId } } });
    if (existing) {
      await prisma.watchedThread.delete({ where: { id: existing.id } });
      return false;
    }
    await prisma.watchedThread.create({ data: { userId, threadId: targetId } });
    return true;
  }

  if (targetType === 'experience') {
    const existing = await prisma.savedExperience.findUnique({ where: { userId_experienceId: { userId, experienceId: targetId } } });
    if (existing) {
      await prisma.savedExperience.delete({ where: { id: existing.id } });
      return false;
    }
    await prisma.savedExperience.create({ data: { userId, experienceId: targetId } });
    return true;
  }

  const existing = await prisma.savedInsight.findUnique({ where: { userId_insightId: { userId, insightId: targetId } } });
  if (existing) {
    await prisma.savedInsight.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.savedInsight.create({ data: { userId, insightId: targetId } });
  return true;
}

function toRecord(id: string, userId: string, targetType: PersonalTargetType, targetId: string, createdAt: Date) {
  return { id, userId, targetType, targetId, createdAt: createdAt.toISOString() };
}
