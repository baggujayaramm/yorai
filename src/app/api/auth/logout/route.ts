import { NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, getAuthCookieOptions, revokeCurrentSession } from '@/lib/auth';

export async function POST() {
  await revokeCurrentSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, '', { ...getAuthCookieOptions(new Date(0)), maxAge: 0 });
  return response;
}
