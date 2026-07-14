import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeClaimInput, normalizeCorrectionInput, isApprovedCollegeRepresentative } from '../src/lib/college-representatives';
import { assertPolicyAcceptance, currentPolicyVersions, recordPolicyAcceptance } from '../src/lib/policies';
import { assertBetaWriteAccess, getLaunchMode, normalizeLaunchMode } from '../src/lib/release-controls';
import { prisma } from '../src/lib/prisma';

test('launch modes normalize safely and default closed when unset', async () => {
  assert.equal(normalizeLaunchMode('limited-public'), 'LIMITED_PUBLIC');
  assert.equal(normalizeLaunchMode('unexpected'), null);
  const previous = process.env.YORAI_LAUNCH_MODE;
  delete process.env.YORAI_LAUNCH_MODE;
  await prisma.platformSetting.deleteMany({ where: { key: 'launch_mode' } });
  assert.equal(await getLaunchMode(), 'CLOSED_BETA');
  if (previous === undefined) delete process.env.YORAI_LAUNCH_MODE;
  else process.env.YORAI_LAUNCH_MODE = previous;
});

test('read-only launch controls block non-admin writes without weakening admin access', async () => {
  const previous = process.env.YORAI_FLAG_READ_ONLY_MODE;
  process.env.YORAI_FLAG_READ_ONLY_MODE = 'true';
  await assert.rejects(() => assertBetaWriteAccess({ role: 'USER', betaStatus: 'ACTIVE' }), /read-only mode/);
  await assert.doesNotReject(() => assertBetaWriteAccess({ role: 'ADMIN', betaStatus: 'SUSPENDED' }));
  if (previous === undefined) delete process.env.YORAI_FLAG_READ_ONLY_MODE;
  else process.env.YORAI_FLAG_READ_ONLY_MODE = previous;
});

test('policy acceptance is explicit and versioned', async () => {
  assert.throws(() => assertPolicyAcceptance(false), /accept Yorai policies/);
  const marker = Date.now();
  const user = await prisma.user.create({ data: { name: 'Policy User', email: `policy-${marker}@example.test`, role: 'USER', betaStatus: 'ACTIVE' } });
  try {
    await prisma.$transaction((tx) => recordPolicyAcceptance(tx, user.id));
    await prisma.$transaction((tx) => recordPolicyAcceptance(tx, user.id));
    const records = await prisma.policyAcceptance.findMany({ where: { userId: user.id } });
    assert.equal(records.length, 4);
    assert.equal(records.some((record) => record.version === currentPolicyVersions.TERMS), true);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('signup requires policy acceptance and does not expose client-side launch authority', async () => {
  const route = await readFile('src/app/api/auth/signup/route.ts', 'utf8');
  assert.match(route, /assertPolicyAcceptance/);
  assert.match(route, /getLaunchMode/);
  assert.doesNotMatch(route, /body\.launchMode/);
});

test('college representative claims require review before correction access', async () => {
  const marker = Date.now();
  const [college, user, admin] = await Promise.all([
    prisma.college.create({
      data: {
        name: `Representative Test College ${marker}`,
        slug: `representative-test-${marker}`,
        city: 'Test City',
        state: 'Test State',
        officialWebsite: 'https://rep-test.example',
        affiliation: 'Fictional University',
        courses: ['CSE'],
        admissionModes: ['Fictional'],
      },
    }),
    prisma.user.create({ data: { name: 'Representative User', email: `rep-${marker}@example.test`, role: 'COLLEGE_REPRESENTATIVE', betaStatus: 'ACTIVE' } }),
    prisma.user.create({ data: { name: 'Representative Admin', email: `rep-admin-${marker}@example.test`, role: 'ADMIN', betaStatus: 'ACTIVE' } }),
  ]);
  try {
    assert.equal(await isApprovedCollegeRepresentative(user, college.id), false);
    await prisma.collegeClaimRequest.create({ data: { requesterId: user.id, collegeId: college.id, collegeName: college.name, institutionalEmail: `rep-${marker}@college.example`, roleOrDepartment: 'Registrar', reason: 'Keep official metadata current.', status: 'APPROVED', reviewedById: admin.id, reviewedAt: new Date() } });
    assert.equal(await isApprovedCollegeRepresentative(user, college.id), true);
    const correction = normalizeCorrectionInput({ collegeId: college.id, fieldName: 'official website', proposedValue: 'https://updated.example', sourceUrl: 'https://rep-test.example/source' });
    assert.equal(correction.fieldName, 'official website');
    assert.throws(() => normalizeCorrectionInput({ collegeId: college.id, fieldName: 'student discussions', proposedValue: 'remove criticism' }), /factual college metadata/);
  } finally {
    await prisma.college.delete({ where: { id: college.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, admin.id] } } });
  }
});

test('claim input normalizes institutional email and rejects invalid website', () => {
  const input = normalizeClaimInput({ collegeName: 'Fictional College', institutionalEmail: 'REP@COLLEGE.EXAMPLE', roleOrDepartment: 'Registrar', officialWebsite: 'https://college.example', reason: 'Factual metadata update.' });
  assert.equal(input.institutionalEmail, 'rep@college.example');
  assert.throws(() => normalizeClaimInput({ collegeName: 'Fictional College', institutionalEmail: 'rep@college.example', roleOrDepartment: 'Registrar', officialWebsite: 'not-a-url', reason: 'Factual metadata update.' }), /official website/);
});

test('data export and account deletion models are owner-scoped foundations', async () => {
  const marker = Date.now();
  const user = await prisma.user.create({ data: { name: 'Data User', email: `data-${marker}@example.test`, role: 'USER', betaStatus: 'ACTIVE' } });
  try {
    const exportRequest = await prisma.dataExportRequest.create({ data: { userId: user.id, status: 'READY', completedAt: new Date() } });
    const deletionRequest = await prisma.accountDeletionRequest.create({ data: { userId: user.id, status: 'COOLING_OFF', coolingOffEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    assert.equal(exportRequest.userId, user.id);
    assert.equal(deletionRequest.userId, user.id);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
