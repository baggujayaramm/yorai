import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, createAuthSession, getAuthCookieOptions, hashPassword, normalizeEmail, validatePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeUsername, validateUsername } from '@/lib/profile';
import { recordAnalytics } from '@/lib/analytics';
import { consumeInMemoryLimit } from '@/lib/abuse-prevention';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { emailHasBetaApproval, hashInviteCode, normalizeInviteCode } from '@/lib/beta-access';
import { featureEnabled, getLaunchMode, maintenanceMode } from '@/lib/release-controls';
import { assertPolicyAcceptance, recordPolicyAcceptance } from '@/lib/policies';

export async function POST(request: NextRequest) {
  try {
    if (maintenanceMode() !== 'off') throw new ApiError(503, 'Yorai account creation is temporarily paused for maintenance.', 'maintenance_signup_pause');
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const limit = consumeInMemoryLimit(`signup:${source}`, { limit: 6, windowMs: 60 * 60_000, message: 'Too many account attempts. Try again later.' });
    if (!limit.allowed) return apiErrorResponse(new ApiError(429, limit.message ?? 'Too many account attempts. Try again later.', 'signup_rate_limited'), 'Could not create your account yet.', request, 'authentication');
    const body = (await request.json()) as { email?: string; password?: string; displayName?: string; username?: string; inviteCode?: string; acceptPolicies?: boolean };
    const email = normalizeEmail(body.email ?? '');
    const password = body.password ?? '';
    const displayName = body.displayName?.trim() ?? '';
    const username = body.username ? normalizeUsername(body.username) : undefined;
    const inviteCode = normalizeInviteCode(body.inviteCode);
    assertPolicyAcceptance(body.acceptPolicies);

    if (!email || !email.includes('@') || !displayName) {
      return NextResponse.json({ ok: false, error: 'Add a valid email and display name.' }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ ok: false, error: 'Use at least 8 characters for your password.' }, { status: 400 });
    }

    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.ok) {
        return NextResponse.json({ ok: false, error: usernameValidation.error }, { status: 400 });
      }
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this email or username already exists.' }, { status: 409 });
    }

    const [launchMode, publicRegistrationFlag, inviteOnlyRegistration, approvedDomainRegistration, registrationPaused] = await Promise.all([
      getLaunchMode(),
      featureEnabled('public_registration'),
      featureEnabled('invite_only_registration'),
      featureEnabled('approved_domain_registration'),
      featureEnabled('registration_paused'),
    ]);
    if (registrationPaused) throw new ApiError(503, 'New account registration is temporarily paused.', 'registration_paused');
    const launchAllowsPublicRegistration = launchMode === 'PUBLIC' || launchMode === 'LIMITED_PUBLIC';
    const publicRegistration = publicRegistrationFlag && launchAllowsPublicRegistration;
    const approvedEmail = approvedDomainRegistration && emailHasBetaApproval(email);
    if (!publicRegistration && !inviteOnlyRegistration && !approvedEmail) throw new ApiError(503, 'New account registration is temporarily unavailable.', 'registration_disabled');
    if (!publicRegistration && inviteOnlyRegistration && !approvedEmail && !inviteCode) throw new ApiError(403, 'A valid Yorai invite is required to create an account.', 'invite_required');
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const invite = inviteCode ? await tx.betaInvite.findUnique({ where: { codeHash: hashInviteCode(inviteCode) } }) : null;
      if (!publicRegistration && inviteOnlyRegistration && !approvedEmail) {
        if (!invite || !invite.active || (invite.expiresAt && invite.expiresAt <= new Date()) || invite.usageCount >= invite.maxUses) throw new ApiError(403, 'This beta invite is invalid or unavailable.', 'invite_unavailable');
        const claimed = await tx.betaInvite.updateMany({ where: { id: invite.id, active: true, usageCount: { lt: invite.maxUses }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, data: { usageCount: { increment: 1 } } });
        if (claimed.count !== 1) throw new ApiError(409, 'This beta invite is no longer available.', 'invite_exhausted');
      }
      const created = await tx.user.create({ data: { name: displayName, displayName, anonymousDisplayName: displayName, email, username, passwordHash, role: 'USER', verificationStatus: 'CONTEXT_ADDED', betaStatus: 'ACTIVE', betaActivatedAt: new Date() } });
      if (invite && !publicRegistration && inviteOnlyRegistration && !approvedEmail) await tx.betaInviteRedemption.create({ data: { inviteId: invite.id, userId: created.id } });
      await recordPolicyAcceptance(tx, created.id);
      return created;
    }, { isolationLevel: 'Serializable' });

    const { token, session } = await createAuthSession(user.id);
    await recordAnalytics('ONBOARDING_COMPLETED', { userId: user.id });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_SESSION_COOKIE, token, getAuthCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    const conflict = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    return apiErrorResponse(conflict ? new ApiError(409, 'An account with this email or username already exists.', 'account_conflict') : error, 'Could not create your account yet. Try again.', request, 'authentication');
  }
}
