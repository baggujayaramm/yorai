import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-response';
import { requireCurrentUser } from '@/lib/auth';
import { normalizeClaimInput } from '@/lib/college-representatives';
import { featureEnabled } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const claims = await prisma.collegeClaimRequest.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, collegeName: true, status: true, adminNote: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, claims });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load your college claim requests.', request, 'college-claims');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await featureEnabled('college_claims')) return NextResponse.json({ ok: false, error: 'College representative requests are temporarily unavailable.' }, { status: 503 });
    const user = await requireCurrentUser();
    const input = normalizeClaimInput(await request.json());
    if (input.collegeId) {
      const college = await prisma.college.findFirst({ where: { id: input.collegeId, recordStatus: 'PUBLISHED' }, select: { id: true } });
      if (!college) return NextResponse.json({ ok: false, error: 'Choose a published college from Yorai.' }, { status: 400 });
    }
    const requestRecord = await prisma.collegeClaimRequest.create({
      data: {
        requesterId: user.id,
        ...input,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, claim: requestRecord });
  } catch (error) {
    return apiErrorResponse(error, 'Could not submit the representative request yet.', request, 'college-claims');
  }
}
