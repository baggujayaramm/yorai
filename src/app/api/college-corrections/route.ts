import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-response';
import { requireCurrentUser } from '@/lib/auth';
import { assertApprovedCollegeRepresentative, normalizeCorrectionInput } from '@/lib/college-representatives';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const corrections = await prisma.officialCorrectionRequest.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { college: { select: { name: true, slug: true } } },
    });
    return NextResponse.json({ ok: true, corrections });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load your correction requests.', request, 'college-corrections');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const input = normalizeCorrectionInput(await request.json());
    const college = await prisma.college.findFirst({ where: { id: input.collegeId, recordStatus: 'PUBLISHED' } });
    if (!college) return NextResponse.json({ ok: false, error: 'Choose a published college from Yorai.' }, { status: 400 });
    await assertApprovedCollegeRepresentative(user, college.id);
    const correction = await prisma.officialCorrectionRequest.create({
      data: {
        requesterId: user.id,
        collegeId: college.id,
        fieldName: input.fieldName,
        proposedValue: input.proposedValue,
        currentValue: input.currentValue,
        sourceUrl: input.sourceUrl,
        sourceInfo: input.sourceInfo,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, correction });
  } catch (error) {
    return apiErrorResponse(error, 'Could not submit this correction request yet.', request, 'college-corrections');
  }
}
