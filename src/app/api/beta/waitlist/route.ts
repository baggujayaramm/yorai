import { NextRequest, NextResponse } from 'next/server';
import { consumeInMemoryLimit } from '@/lib/abuse-prevention';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { normalizeEmail, requireCollegeAdminUser } from '@/lib/auth';
import { normalizeText, validateContent } from '@/lib/content-quality';
import { canTransitionWaitlist, generateInviteCode, hashInviteCode } from '@/lib/beta-access';
import { featureEnabled, maintenanceMode } from '@/lib/release-controls';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    if (maintenanceMode() !== 'off') throw new ApiError(503, 'The beta waitlist is temporarily paused for maintenance.', 'maintenance_waitlist_pause');
    if (!await featureEnabled('waitlist')) throw new ApiError(503, 'The beta waitlist is temporarily unavailable.', 'waitlist_disabled');
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const limit = consumeInMemoryLimit(`waitlist:${source}`, { limit: 4, windowMs: 60 * 60_000, message: 'Too many waitlist attempts. Try again later.' });
    if (!limit.allowed) throw new ApiError(429, limit.message ?? 'Too many waitlist attempts. Try again later.', 'waitlist_rate_limited');
    const body = await request.json() as { name?: string; email?: string; collegeInterest?: string; reason?: string };
    const name = normalizeText(body.name).slice(0, 80), email = normalizeEmail(body.email ?? ''), collegeInterest = normalizeText(body.collegeInterest).slice(0, 120), reason = normalizeText(body.reason);
    if (!name || !email.includes('@')) throw new ApiError(400, 'Add a valid name and email.', 'invalid_waitlist');
    if (reason) { const quality = validateContent(reason, { label: 'Reason', minLength: 10, maxLength: 500, allowLinks: 0 }); if (quality.errors.length) throw new ApiError(400, quality.errors[0], 'invalid_waitlist_reason'); }
    await prisma.betaWaitlist.create({ data: { name, email, collegeInterest: collegeInterest || undefined, reason: reason || undefined } });
    return NextResponse.json({ ok: true, message: 'Thanks. Your closed-beta request has been received.' });
  } catch (error) {
    const duplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    return apiErrorResponse(duplicate ? new ApiError(409, 'This email is already on the beta waitlist.', 'waitlist_duplicate') : error, 'Could not join the waitlist yet.', request, 'beta-waitlist');
  }
}

export async function GET(request: NextRequest) {
  try { await requireCollegeAdminUser(); const status = new URL(request.url).searchParams.get('status'); const entries = await prisma.betaWaitlist.findMany({ where: ['PENDING','APPROVED','REJECTED','INVITED'].includes(status ?? '') ? { status: status as never } : {}, orderBy: { createdAt: 'asc' }, take: 50 }); return NextResponse.json({ ok: true, entries }); }
  catch (error) { return apiErrorResponse(error, 'Could not load the beta waitlist.', request, 'beta-admin'); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireCollegeAdminUser();
    const body = await request.json() as { id?: string; status?: string; internalNote?: string };
    const current = await prisma.betaWaitlist.findUniqueOrThrow({ where: { id: body.id } });
    if (!body.status || !canTransitionWaitlist(current.status, body.status)) throw new ApiError(409, 'Choose a valid waitlist transition.', 'invalid_waitlist_transition');
    const nextStatus = body.status;
    const code = nextStatus === 'INVITED' ? generateInviteCode() : null;
    const updated = await prisma.$transaction(async (tx) => {
      const entry = await tx.betaWaitlist.update({ where: { id: current.id }, data: { status: nextStatus as never, internalNote: normalizeText(body.internalNote).slice(0, 1000) || undefined } });
      if (code) await tx.betaInvite.create({ data: { codeHash: hashInviteCode(code), label: `Waitlist: ${current.name}`.slice(0, 80), creatorId: admin.id, maxUses: 1 } });
      await tx.moderationAction.create({ data: { moderatorId: admin.id, actionType: `waitlist:${nextStatus.toLowerCase()}`, targetType: 'WAITLIST', targetId: entry.id } });
      return entry;
    });
    return NextResponse.json({ ok: true, id: updated.id, code });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this waitlist entry.', request, 'beta-admin');
  }
}
