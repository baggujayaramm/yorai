import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { generateInviteCode, hashInviteCode } from '@/lib/beta-access';
import { requireCollegeAdminUser } from '@/lib/auth';
import { boundedInteger } from '@/lib/query-limits';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireCollegeAdminUser();
    const invites = await prisma.betaInvite.findMany({
      include: {
        _count: { select: { redemptions: true } },
        redemptions: {
          take: 20,
          orderBy: { redeemedAt: 'desc' },
          include: { user: { select: { displayName: true, anonymousDisplayName: true, betaStatus: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({
      ok: true,
      invites: invites.map((invite) => ({
        id: invite.id,
        label: invite.label,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usageCount: invite.usageCount,
        active: invite.active,
        createdAt: invite.createdAt,
        updatedAt: invite.updatedAt,
        redemptions: invite.redemptions,
        _count: invite._count,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load beta invites.', request, 'beta-admin');
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { label?: string; expiresAt?: string; maxUses?: number };
    const code = generateInviteCode();
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new ApiError(400, 'Choose a future invite expiration.', 'invalid_invite_expiry');
    const invite = await prisma.betaInvite.create({ data: { codeHash: hashInviteCode(code), label: body.label?.trim().slice(0, 80), creatorId: admin.id, expiresAt, maxUses: boundedInteger(body.maxUses, 1, 1, 100) } });
    await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: 'invite:created', targetType: 'BETA_INVITE', targetId: invite.id } });
    return NextResponse.json({ ok: true, code, inviteId: invite.id });
  } catch (error) {
    return apiErrorResponse(error, 'Could not create this invite.', request, 'beta-admin');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { id?: string; active?: boolean };
    if (!body.id || typeof body.active !== 'boolean') throw new ApiError(400, 'Choose a valid invite action.', 'invalid_invite_action');
    await prisma.betaInvite.update({ where: { id: body.id }, data: { active: body.active } });
    await prisma.moderationAction.create({ data: { moderatorId: admin.id, actionType: body.active ? 'invite:activated' : 'invite:deactivated', targetType: 'BETA_INVITE', targetId: body.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this invite.', request, 'beta-admin');
  }
}
