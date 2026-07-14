import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, createAuthSession, DUMMY_PASSWORD_HASH, getAuthCookieOptions, normalizeEmail, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { consumeInMemoryLimit } from '@/lib/abuse-prevention';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { logEvent, requestIdFor } from '@/lib/observability';

export async function POST(request: NextRequest) {
  try {
    const requestId = requestIdFor(request);
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const limit = consumeInMemoryLimit(`login:${source}`, { limit: 10, windowMs: 10 * 60_000, message: 'Too many sign-in attempts. Try again shortly.' });
    if (!limit.allowed) return apiErrorResponse(new ApiError(429, limit.message ?? 'Too many sign-in attempts. Try again shortly.', 'auth_rate_limited'), 'Could not sign in.', request, 'authentication');
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email ?? '');
    const password = body.password ?? '';

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      logEvent('warn', 'authentication', { requestId, code: 'login_failed' });
      return apiErrorResponse(new ApiError(401, 'Invalid email or password.', 'invalid_credentials'), 'Could not sign in.', request, 'authentication');
    }

    const { token, session } = await createAuthSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_SESSION_COOKIE, token, getAuthCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    return apiErrorResponse(error, 'Could not sign in yet. Try again.', request, 'authentication');
  }
}
