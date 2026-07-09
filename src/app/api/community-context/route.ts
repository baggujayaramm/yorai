import { NextRequest, NextResponse } from 'next/server';
import { formatPublicUserContext, requireDemoUserId } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');

  if (!targetType || !targetId) return NextResponse.json({ ok: true, records: [] });

  const records = await prisma.contextAction.findMany({ where: { targetType, targetId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({
    ok: true,
    records: records.map((record) => ({
      targetType: record.targetType,
      targetId: record.targetId,
      actionType: record.actionType,
      userId: record.userId,
      createdDate: record.createdAt.toISOString().slice(0, 10),
      userContext: record.userContext ?? '',
      userRole: record.userRole ?? '',
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = (await request.json()) as { targetType?: string; targetId?: string; actionType?: string };

    if (!body.targetType || !body.targetId || !body.actionType) {
      return NextResponse.json({ ok: false, error: 'Missing context action.' }, { status: 400 });
    }

    await prisma.contextAction.upsert({
      where: {
        targetType_targetId_actionType_userId: {
          targetType: body.targetType,
          targetId: body.targetId,
          actionType: body.actionType,
          userId,
        },
      },
      update: {},
      create: {
        targetType: body.targetType,
        targetId: body.targetId,
        actionType: body.actionType,
        userId,
        userContext: formatPublicUserContext(user),
        userRole: user.role === 'CURRENT_STUDENT' ? 'Current student' : user.role === 'ALUMNI' ? 'Alumni' : user.role === 'MODERATOR' ? 'Moderator' : 'Aspirant',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not save this yet. Try again.' }, { status: 400 });
  }
}
