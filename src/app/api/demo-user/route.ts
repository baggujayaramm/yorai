import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USER_COOKIE, demoUserIds } from '@/lib/demo-auth';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string };

  if (!body.userId || !demoUserIds.includes(body.userId as (typeof demoUserIds)[number])) {
    return NextResponse.json({ ok: false, error: 'Choose a valid demo user.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_USER_COOKIE, body.userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
