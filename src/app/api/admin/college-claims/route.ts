import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, ApiError } from '@/lib/api-response';
import { requireCollegeAdminUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const claimStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED'] as const;
const correctionStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_SOURCE'] as const;

export async function GET(request: NextRequest) {
  try {
    await requireCollegeAdminUser();
    const [claims, corrections] = await Promise.all([
      prisma.collegeClaimRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          requester: { select: { displayName: true, anonymousDisplayName: true, name: true, role: true } },
          college: { select: { name: true } },
        },
      }),
      prisma.officialCorrectionRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          requester: { select: { displayName: true, anonymousDisplayName: true, name: true, role: true } },
          college: { select: { name: true } },
        },
      }),
    ]);
    return NextResponse.json({ ok: true, claims, corrections });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load college representative queues.', request, 'college-claim-admin');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { type?: string; id?: string; status?: string; adminNote?: string };
    const id = body.id?.trim();
    const adminNote = body.adminNote?.trim().slice(0, 1200) || undefined;
    if (!id) throw new ApiError(400, 'Missing request id.', 'missing_request_id');

    if (body.type === 'claim') {
      if (!claimStatuses.includes(body.status as never)) throw new ApiError(400, 'Choose a valid claim status.', 'invalid_claim_status');
      const updated = await prisma.$transaction(async (tx) => {
        const claim = await tx.collegeClaimRequest.update({
          where: { id },
          data: { status: body.status as never, adminNote, reviewedById: admin.id, reviewedAt: new Date() },
        });
        if (claim.status === 'APPROVED') {
          await tx.user.update({ where: { id: claim.requesterId }, data: { role: 'COLLEGE_REPRESENTATIVE', verificationStatus: 'MODERATOR_CONFIRMED' } });
        }
        await tx.moderationAction.create({ data: { moderatorId: admin.id, actionType: `college_claim:${claim.status.toLowerCase()}`, targetType: 'COLLEGE_CLAIM', targetId: claim.id, internalNote: adminNote } });
        return claim;
      });
      return NextResponse.json({ ok: true, claim: updated });
    }

    if (body.type === 'correction') {
      if (!correctionStatuses.includes(body.status as never)) throw new ApiError(400, 'Choose a valid correction status.', 'invalid_correction_status');
      const updated = await prisma.$transaction(async (tx) => {
        const correction = await tx.officialCorrectionRequest.update({
          where: { id },
          data: { status: body.status as never, adminNote, reviewedById: admin.id, reviewedAt: new Date() },
        });
        await tx.moderationAction.create({ data: { moderatorId: admin.id, actionType: `official_correction:${correction.status.toLowerCase()}`, targetType: 'OFFICIAL_CORRECTION', targetId: correction.id, internalNote: adminNote } });
        return correction;
      });
      return NextResponse.json({ ok: true, correction: updated });
    }

    throw new ApiError(400, 'Choose a valid representative queue action.', 'invalid_representative_action');
  } catch (error) {
    return apiErrorResponse(error, 'Could not update the representative queue.', request, 'college-claim-admin');
  }
}
