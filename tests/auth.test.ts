import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAuthSession,
  getSessionExpiry,
  getUserForSessionToken,
  hashPassword,
  hashSessionToken,
  isSessionExpired,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from '../src/lib/auth';
import { isDemoAuthEnabled } from '../src/lib/demo-auth';
import { prisma } from '../src/lib/prisma';

test('password hashing verifies correct password only', async () => {
  const hash = await hashPassword('student-safe-password');
  assert.equal(hash.includes('student-safe-password'), false);
  assert.equal(await verifyPassword('student-safe-password', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('email normalization and password validation are deterministic', () => {
  assert.equal(normalizeEmail('  STUDENT@Example.COM  '), 'student@example.com');
  assert.equal(validatePassword('short'), false);
  assert.equal(validatePassword('long-enough'), true);
});

test('session creation and current-user lookup work with token hashes', async () => {
  const email = `auth-test-${Date.now()}@example.test`;
  const user = await prisma.user.create({
    data: {
      name: 'Auth Test Student',
      email,
      displayName: 'Auth Test Student',
      anonymousDisplayName: 'Auth Test Student',
      passwordHash: await hashPassword('student-safe-password'),
      role: 'USER',
    },
  });

  try {
    const { token } = await createAuthSession(user.id);
    assert.notEqual(token, hashSessionToken(token));
    const current = await getUserForSessionToken(token);
    assert.equal(current?.id, user.id);

    await prisma.authSession.update({ where: { tokenHash: hashSessionToken(token) }, data: { revokedAt: new Date() } });
    const revoked = await getUserForSessionToken(token);
    assert.equal(revoked, null);
  } finally {
    await prisma.authSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('expired and invalid sessions return null', async () => {
  assert.equal(await getUserForSessionToken('not-a-real-token'), null);
  assert.equal(isSessionExpired(new Date(Date.now() - 1000)), true);
  assert.equal(isSessionExpired(getSessionExpiry()), false);
});

test('demo auth is explicitly controlled by environment flag', () => {
  const previous = process.env.YORAI_DEMO_AUTH_ENABLED;
  const previousVercelEnv = process.env.VERCEL_ENV;
  process.env.YORAI_DEMO_AUTH_ENABLED = 'false';
  delete process.env.VERCEL_ENV;
  assert.equal(isDemoAuthEnabled(), false);
  process.env.YORAI_DEMO_AUTH_ENABLED = 'true';
  assert.equal(isDemoAuthEnabled(), true);
  process.env.VERCEL_ENV = 'production';
  assert.equal(isDemoAuthEnabled(), false);
  if (previous === undefined) delete process.env.YORAI_DEMO_AUTH_ENABLED;
  else process.env.YORAI_DEMO_AUTH_ENABLED = previous;
  if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previousVercelEnv;
});
