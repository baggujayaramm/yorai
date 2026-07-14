import { NextResponse } from 'next/server';
import { getCurrentUser, getRealCurrentUser, toPublicCurrentUser } from '@/lib/auth';

export async function GET() {
  const realUser = await getRealCurrentUser();
  if (realUser) {
    return NextResponse.json({ ok: true, user: toPublicCurrentUser(realUser, 'real') });
  }

  const user = await getCurrentUser();
  return NextResponse.json({ ok: true, user: user ? toPublicCurrentUser(user, 'demo') : null });
}
