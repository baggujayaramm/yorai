import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, ApiError } from '@/lib/api-response';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const guidanceKeys = ['getting-started'] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const dismissals = await prisma.guidanceDismissal.findMany({
      where: { userId: user.id },
      select: { guidanceKey: true },
      take: 20,
    });
    return NextResponse.json({ ok: true, dismissed: dismissals.map((item) => item.guidanceKey) });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load guidance.', request, 'guidance');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { key?: string };
    if (!guidanceKeys.includes(body.key as typeof guidanceKeys[number])) throw new ApiError(400, 'Choose valid guidance.', 'invalid_guidance');
    await prisma.guidanceDismissal.upsert({
      where: { userId_guidanceKey: { userId: user.id, guidanceKey: body.key! } },
      update: { dismissedAt: new Date() },
      create: { userId: user.id, guidanceKey: body.key! },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not dismiss guidance.', request, 'guidance');
  }
}
