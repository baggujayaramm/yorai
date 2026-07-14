import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  betaStatusLabel,
  canTransitionWaitlist,
  emailHasBetaApproval,
  hashInviteCode,
  inviteAvailability,
  isBetaAccessStatus,
} from '../src/lib/beta-access';
import { canTransitionFeedback, feedbackKey, safeCurrentPage } from '../src/lib/feedback';
import {
  announcementAudiencesFor,
  assertBetaWriteAccess,
  featureEnabled,
  maintenanceMode,
  safeReleaseMetadata,
} from '../src/lib/release-controls';
import { canAdminCollegeData } from '../src/lib/permissions';
import { prisma } from '../src/lib/prisma';

test('invite availability rejects expired and exhausted invites', () => {
  const now = new Date('2026-07-13T00:00:00.000Z');
  assert.deepEqual(inviteAvailability({ active: true, expiresAt: new Date('2026-07-12T00:00:00.000Z'), usageCount: 0, maxUses: 1 }, now), { valid: false, reason: 'expired' });
  assert.deepEqual(inviteAvailability({ active: true, expiresAt: null, usageCount: 1, maxUses: 1 }, now), { valid: false, reason: 'exhausted' });
  assert.equal(inviteAvailability({ active: true, expiresAt: null, usageCount: 0, maxUses: 1 }, now).valid, true);
});

test('email approvals, waitlist transitions, and beta statuses are deterministic', () => {
  const env = { YORAI_BETA_ALLOWED_DOMAINS: 'campus.test', YORAI_BETA_APPROVED_EMAILS: 'student@example.test' };
  assert.equal(emailHasBetaApproval('person@campus.test', env), true);
  assert.equal(emailHasBetaApproval('STUDENT@example.test', env), true);
  assert.equal(emailHasBetaApproval('other@example.test', env), false);
  assert.equal(canTransitionWaitlist('PENDING', 'APPROVED'), true);
  assert.equal(canTransitionWaitlist('INVITED', 'PENDING'), false);
  assert.equal(isBetaAccessStatus('SUSPENDED'), true);
  assert.equal(betaStatusLabel('EXPIRED'), 'Beta access expired');
});

test('invite usage claim cannot exceed its limit under concurrent updates', async () => {
  const creator = await prisma.user.create({ data: { name: 'Beta Test Admin', email: `beta-admin-${Date.now()}@example.test`, role: 'ADMIN', betaStatus: 'ACTIVE' } });
  const invite = await prisma.betaInvite.create({ data: { codeHash: hashInviteCode(`concurrent-${Date.now()}`), creatorId: creator.id, maxUses: 1 } });
  try {
    const claims = await Promise.all([1, 2].map(() => prisma.betaInvite.updateMany({ where: { id: invite.id, usageCount: { lt: 1 } }, data: { usageCount: { increment: 1 } } })));
    assert.equal(claims.reduce((sum, claim) => sum + claim.count, 0), 1);
    assert.equal((await prisma.betaInvite.findUniqueOrThrow({ where: { id: invite.id } })).usageCount, 1);
  } finally {
    await prisma.betaInvite.delete({ where: { id: invite.id } });
    await prisma.user.delete({ where: { id: creator.id } });
  }
});

test('invite redemption is unique per user and remains linked to the invite', async () => {
  const marker = Date.now();
  const creator = await prisma.user.create({ data: { name: 'Redemption Admin', email: `redemption-admin-${marker}@example.test`, role: 'ADMIN', betaStatus: 'ACTIVE' } });
  const member = await prisma.user.create({ data: { name: 'Invited Member', email: `invited-member-${marker}@example.test`, role: 'USER', betaStatus: 'ACTIVE' } });
  const invite = await prisma.betaInvite.create({ data: { codeHash: hashInviteCode(`redemption-${marker}`), creatorId: creator.id, maxUses: 2 } });
  try {
    const redemption = await prisma.betaInviteRedemption.create({ data: { inviteId: invite.id, userId: member.id } });
    assert.equal(redemption.inviteId, invite.id);
    await assert.rejects(() => prisma.betaInviteRedemption.create({ data: { inviteId: invite.id, userId: member.id } }));
  } finally {
    await prisma.betaInviteRedemption.deleteMany({ where: { inviteId: invite.id } });
    await prisma.betaInvite.delete({ where: { id: invite.id } });
    await prisma.user.deleteMany({ where: { id: { in: [creator.id, member.id] } } });
  }
});

test('waitlist email uniqueness prevents duplicate beta requests', async () => {
  const email = `waitlist-${Date.now()}@example.test`;
  try {
    await prisma.betaWaitlist.create({ data: { name: 'Waitlist Student', email } });
    await assert.rejects(() => prisma.betaWaitlist.create({ data: { name: 'Duplicate Student', email } }));
  } finally {
    await prisma.betaWaitlist.deleteMany({ where: { email } });
  }
});

test('beta write access blocks suspended users and preserves admin bypass', async () => {
  const previous = process.env.YORAI_FLAG_BETA_ONLY_CONTRIBUTIONS;
  process.env.YORAI_FLAG_BETA_ONLY_CONTRIBUTIONS = 'true';
  await assert.rejects(() => assertBetaWriteAccess({ role: 'USER', betaStatus: 'SUSPENDED' }), /temporarily suspended/);
  await assert.doesNotReject(() => assertBetaWriteAccess({ role: 'ADMIN', betaStatus: 'SUSPENDED' }));
  if (previous === undefined) delete process.env.YORAI_FLAG_BETA_ONLY_CONTRIBUTIONS;
  else process.env.YORAI_FLAG_BETA_ONLY_CONTRIBUTIONS = previous;
});

test('feedback validation helpers protect ownership-facing fields and transitions', async () => {
  assert.equal(feedbackKey('u1', 'Same title', 'Same description'), feedbackKey('u1', ' same title ', ' same description '));
  assert.equal(safeCurrentPage('/colleges/aster-valley'), '/colleges/aster-valley');
  assert.equal(safeCurrentPage('/private?token=secret'), undefined);
  assert.equal(canTransitionFeedback('NEW', 'TRIAGED'), true);
  assert.equal(canTransitionFeedback('NEW', 'RESOLVED'), false);
  const route = await readFile('src/app/api/feedback/route.ts', 'utf8');
  assert.doesNotMatch(route.split('export async function GET')[1].split('export async function POST')[0], /internalNote|assignedAdmin/);
});

test('feature flags, maintenance mode, announcement targeting, and release metadata are safe', async () => {
  assert.equal(await featureEnabled('feedback_system'), true);
  assert.equal(maintenanceMode({ YORAI_MAINTENANCE_MODE: 'write' }), 'write');
  assert.equal(maintenanceMode({ YORAI_MAINTENANCE_MODE: 'unexpected' }), 'off');
  assert.deepEqual(announcementAudiencesFor(null), ['ALL_USERS']);
  assert.deepEqual(announcementAudiencesFor({ role: 'USER', betaStatus: 'ACTIVE' }), ['ALL_USERS', 'BETA_USERS']);
  assert.deepEqual(announcementAudiencesFor({ role: 'ADMIN', betaStatus: 'ACTIVE' }), ['ALL_USERS', 'BETA_USERS', 'MODERATORS', 'ADMINS']);
  const metadata = safeReleaseMetadata({ NEXT_PUBLIC_APP_VERSION: '1.9.0', YORAI_BUILD_ID: 'safe-build', DATABASE_URL: 'private' });
  assert.equal(metadata.version, '1.9.0');
  assert.equal(JSON.stringify(metadata).includes('DATABASE_URL'), false);
  assert.equal(canAdminCollegeData('ADMIN'), true);
  assert.equal(canAdminCollegeData('MODERATOR'), false);
});
