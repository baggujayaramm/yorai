import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, ApiError } from '@/lib/api-response';
import { AUTH_SESSION_COOKIE, getAuthCookieOptions, requireCurrentUser } from '@/lib/auth';
import { normalizeText } from '@/lib/content-quality';
import { featureEnabled } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const requests = await prisma.accountDeletionRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: 'desc' },
      take: 5,
      select: { id: true, status: true, requestedAt: true, coolingOffEndsAt: true, completedAt: true },
    });
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load deletion requests.', request, 'account-deletion');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await featureEnabled('account_deletion_requests')) return NextResponse.json({ ok: false, error: 'Account deletion requests are temporarily unavailable.' }, { status: 503 });
    const user = await requireCurrentUser();
    const body = await request.json() as { confirmText?: string; note?: string };
    if (normalizeText(body.confirmText) !== 'DELETE') throw new ApiError(400, 'Type DELETE to confirm an account deletion request.', 'deletion_confirmation_required');
    const existing = await prisma.accountDeletionRequest.findFirst({ where: { userId: user.id, status: { in: ['REQUESTED', 'COOLING_OFF'] } } });
    if (existing) return NextResponse.json({ ok: true, request: existing });
    const coolingOffEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const deletion = await prisma.$transaction(async (tx) => {
      const created = await tx.accountDeletionRequest.create({
        data: { userId: user.id, status: 'COOLING_OFF', coolingOffEndsAt, userNote: normalizeText(body.note).slice(0, 800) || undefined },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          profileVisibility: 'PRIVATE',
          publicBio: null,
          anonymousDisplayName: user.anonymousDisplayName ?? user.displayName ?? user.name,
        },
      });
      await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      return created;
    });
    const response = NextResponse.json({ ok: true, request: deletion, message: 'Your account deletion request is in a cooling-off period. Public contributions are retained with privacy-safe handling.' });
    response.cookies.set(AUTH_SESSION_COOKIE, '', getAuthCookieOptions(new Date(0)));
    return response;
  } catch (error) {
    return apiErrorResponse(error, 'Could not request account deletion yet.', request, 'account-deletion');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const active = await prisma.accountDeletionRequest.findFirst({ where: { userId: user.id, status: { in: ['REQUESTED', 'COOLING_OFF'] } }, orderBy: { requestedAt: 'desc' } });
    if (!active) return NextResponse.json({ ok: true });
    await prisma.accountDeletionRequest.update({ where: { id: active.id }, data: { status: 'CANCELLED' } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update account deletion request.', request, 'account-deletion');
  }
}
