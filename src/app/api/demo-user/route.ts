import { NextRequest, NextResponse } from 'next/server';
import { getRealCurrentUser, toPublicCurrentUser } from '@/lib/auth';
import { DEMO_USER_COOKIE, demoUserIds, formatPublicUserContext, getCurrentDemoUserId, isDemoAuthEnabled, trustLabelFromRole } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const realUser = await getRealCurrentUser();
  if (realUser) {
    return NextResponse.json({ ok: true, enabled: isDemoAuthEnabled(), user: toPublicCurrentUser(realUser, 'real') });
  }

  const enabled = isDemoAuthEnabled();
  if (!enabled) {
    return NextResponse.json({ ok: true, enabled: false, user: null });
  }

  const userId = await getCurrentDemoUserId();
  if (!userId) {
    return NextResponse.json({ ok: true, enabled: true, user: null });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: true, enabled: true, user: null });
  }

  return NextResponse.json({
    ok: true,
    enabled: true,
    user: {
      id: user.id,
      role: user.role,
      context: formatPublicUserContext(user),
      trustLabel: trustLabelFromRole(user.role),
      source: 'demo',
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isDemoAuthEnabled()) {
    return NextResponse.json({ ok: false, error: 'Demo identity is disabled for this environment.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };

  if (!body.userId || !demoUserIds.includes(body.userId as (typeof demoUserIds)[number])) {
    return NextResponse.json({ ok: false, error: 'Choose a valid demo user.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_USER_COOKIE, body.userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return response;
}
