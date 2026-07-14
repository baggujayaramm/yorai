import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { requireCollegeAdminUser } from '@/lib/auth';
import { isBetaAccessStatus } from '@/lib/beta-access';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireCollegeAdminUser();
    const status = new URL(request.url).searchParams.get('status');
    const users = await prisma.user.findMany({
      where: isBetaAccessStatus(status) ? { betaStatus: status } : {},
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, displayName: true, anonymousDisplayName: true, role: true, betaStatus: true, betaActivatedAt: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load beta users.', request, 'beta-admin');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { userId?: string; status?: string };
    if (!body.userId || !isBetaAccessStatus(body.status)) throw new ApiError(400, 'Choose a valid beta access status.', 'invalid_beta_status');
    if (body.userId === admin.id && body.status !== 'ACTIVE') throw new ApiError(409, 'You cannot suspend or expire your own administrator access.', 'admin_self_restriction');

    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { betaStatus: body.status, betaActivatedAt: body.status === 'ACTIVE' ? new Date() : undefined },
      select: { id: true, betaStatus: true },
    });
    await prisma.moderationAction.create({
      data: { moderatorId: admin.id, actionType: `beta-access:${body.status.toLowerCase()}`, targetType: 'USER', targetId: updated.id },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update beta access.', request, 'beta-admin');
  }
}
