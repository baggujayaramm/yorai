import { NextRequest, NextResponse } from 'next/server';
import { getCurrentDemoUserId, requireDemoUserId } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';
import type { PersonalTargetType } from '@/lib/personal-state-storage';

export async function GET() {
  const userId = await getCurrentDemoUserId();
  if (!userId) return NextResponse.json({ ok: true, records: [] });

  const [colleges, threads, experiences, insights] = await Promise.all([
    prisma.followedCollege.findMany({ where: { userId } }),
    prisma.watchedThread.findMany({ where: { userId } }),
    prisma.savedExperience.findMany({ where: { userId } }),
    prisma.savedInsight.findMany({ where: { userId } }),
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
    const userId = await requireDemoUserId();
    const body = (await request.json()) as { targetType?: PersonalTargetType; targetId?: string };
    if (!body.targetType || !body.targetId) {
      return NextResponse.json({ ok: false, error: 'Missing target.' }, { status: 400 });
    }

    const active = await toggleTarget(userId, body.targetType, body.targetId);
    return NextResponse.json({ ok: true, active });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not save this yet. Try again.' }, { status: 400 });
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
