import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { User as PrismaUser } from '@prisma/client';
import { formatPublicUserContext, getCurrentDemoUserId, isDemoAuthEnabled, trustLabelFromRole } from './demo-auth';
import { canAdminCollegeData, canModerate } from './permissions';
import { prisma } from './prisma';

export const AUTH_SESSION_COOKIE = 'yorai_session';
export const PASSWORD_MIN_LENGTH = 8;
export const DEFAULT_SESSION_DAYS = 30;
export const DUMMY_PASSWORD_HASH = 'scrypt$16384$8$1$D6CE4ajy-JDYVoOtvMtsdg$QLTlPOKg-5Oux_Ah5HPzvO9f8XVprYb83yaPrcXj78oY-Wia8pu0MH7xarNumNQej-raC8V30Ikf8q_q5tPHwQ';

const passwordParams = {
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64,
};

export type PublicCurrentUser = {
  id: string;
  name: string;
  displayName: string;
  role: string;
  context: string;
  trustLabel: string;
  source: 'real' | 'demo';
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, passwordParams.keyLength, {
    N: passwordParams.N,
    r: passwordParams.r,
    p: passwordParams.p,
  });

  return `scrypt$${passwordParams.N}$${passwordParams.r}$${passwordParams.p}$${salt}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, salt, encodedHash] = parts;
  const expected = Buffer.from(encodedHash, 'base64url');
  const actual = await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function scrypt(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionExpiry(now = new Date()) {
  const configuredDays = Number(process.env.YORAI_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  const days = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : DEFAULT_SESSION_DAYS;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isSessionExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export async function createAuthSession(userId: string) {
  const token = createSessionToken();
  const session = await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: getSessionExpiry(),
    },
  });

  return { token, session };
}

export async function getUserForSessionToken(token?: string | null) {
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || isSessionExpired(session.expiresAt)) return null;
  return session.user;
}

export async function getRealCurrentUser() {
  const store = await cookies();
  return getUserForSessionToken(store.get(AUTH_SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const realUser = await getRealCurrentUser();
  if (realUser) return realUser;

  if (!isDemoAuthEnabled()) return null;
  const demoUserId = await getCurrentDemoUserId();
  if (!demoUserId) return null;
  return prisma.user.findUnique({ where: { id: demoUserId } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Sign in or choose a demo user before posting.');
  }
  return user;
}

export async function requireModeratorUser() {
  const user = await requireCurrentUser();
  if (!canModerate(user.role)) {
    throw new Error('This area is only for Yorai moderators.');
  }
  return user;
}

export async function requireCollegeAdminUser() {
  const user = await requireCurrentUser();
  if (!canAdminCollegeData(user.role)) {
    throw new Error('This area is only for Yorai administrators.');
  }
  return user;
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return;

  await prisma.authSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function getAuthCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

export function toPublicCurrentUser(user: PrismaUser, source: 'real' | 'demo'): PublicCurrentUser {
  return {
    id: user.id,
    name: user.displayName ?? user.anonymousDisplayName ?? user.name,
    displayName: user.displayName ?? user.anonymousDisplayName ?? user.name,
    role: user.role,
    context: formatPublicUserContext(user),
    trustLabel: trustLabelFromRole(user.role),
    source,
  };
}
