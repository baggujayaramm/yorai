import assert from 'node:assert/strict';
import test from 'node:test';
import { clearInMemoryLimits, consumeInMemoryLimit, rateLimitDecision, restrictionIsActive } from '../src/lib/abuse-prevention';
import { classifyContentRisk } from '../src/lib/content-risk';
import { assignmentIsStale, canHandleAssignedReport } from '../src/lib/moderation';
import { getModerationTarget, updateTargetVisibility } from '../src/lib/moderation-targets';
import { canReportTarget, hasDuplicateOpenReport } from '../src/lib/report-policy';
import { prisma } from '../src/lib/prisma';

test('risk classification detects privacy, spam, attacks, and safe context deterministically', () => {
  assert.equal(classifyContentRisk('Students use the lab after class with permission.').level, 'LOW');
  assert.equal(classifyContentRisk('Contact me at 9876543210 for details.').level, 'HIGH');
  assert.equal(classifyContentRisk('My roll number is CSE-2027-4412.').visibility, 'UNDER_REVIEW');
  assert.equal(classifyContentRisk('This teacher is useless and a liar.').level, 'MEDIUM');
  assert.equal(classifyContentRisk('See https://a.test https://b.test https://c.test https://d.test').level, 'MEDIUM');
});

test('posting and rapid action limits remain deterministic', () => {
  assert.equal(rateLimitDecision(4, { limit: 5, windowMs: 1000, message: 'wait' }).allowed, true);
  assert.equal(rateLimitDecision(5, { limit: 5, windowMs: 1000, message: 'wait' }).allowed, false);
  clearInMemoryLimits();
  const policy = { limit: 2, windowMs: 1000, message: 'wait' };
  assert.equal(consumeInMemoryLimit('test-user', policy, 1000).allowed, true);
  assert.equal(consumeInMemoryLimit('test-user', policy, 1001).allowed, true);
  assert.equal(consumeInMemoryLimit('test-user', policy, 1002).allowed, false);
});

test('duplicate and self-report policy prevents abusive reports', () => {
  assert.equal(canReportTarget('u1', 'u1'), false);
  assert.equal(canReportTarget('u1', 'u2'), true);
  assert.equal(hasDuplicateOpenReport([{ reporterUserId: 'u1', targetType: 'THREAD', targetId: 't1', status: 'OPEN' }], { reporterUserId: 'u1', targetType: 'THREAD', targetId: 't1' }), true);
  assert.equal(hasDuplicateOpenReport([{ reporterUserId: 'u1', targetType: 'THREAD', targetId: 't1', status: 'RESOLVED' }], { reporterUserId: 'u1', targetType: 'THREAD', targetId: 't1' }), false);
});

test('assignment and restriction expiry rules are explicit', () => {
  assert.equal(canHandleAssignedReport(null, 'm1'), true);
  assert.equal(canHandleAssignedReport('m1', 'm1'), true);
  assert.equal(canHandleAssignedReport('m2', 'm1'), false);
  const now = new Date('2026-07-12T12:00:00.000Z');
  assert.equal(assignmentIsStale(new Date('2026-07-12T09:59:59.000Z'), now), true);
  assert.equal(assignmentIsStale(new Date('2026-07-12T11:00:00.000Z'), now), false);
  assert.equal(restrictionIsActive({ startsAt: new Date('2026-07-12T11:00:00.000Z'), expiresAt: new Date('2026-07-12T13:00:00.000Z') }, now), true);
  assert.equal(restrictionIsActive({ startsAt: new Date('2026-07-11T11:00:00.000Z'), expiresAt: new Date('2026-07-12T11:00:00.000Z') }, now), false);
});

test('visibility, warnings, immutable audit records, and appeal ownership persist safely', async () => {
  const suffix = Date.now().toString();
  const [owner, moderator, other] = await Promise.all([
    prisma.user.create({ data: { name: 'Safety owner', email: `safety-owner-${suffix}@example.test`, role: 'CURRENT_STUDENT' } }),
    prisma.user.create({ data: { name: 'Safety moderator', email: `safety-mod-${suffix}@example.test`, role: 'MODERATOR' } }),
    prisma.user.create({ data: { name: 'Safety other', email: `safety-other-${suffix}@example.test`, role: 'ASPIRANT' } }),
  ]);
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });
  const thread = await prisma.question.create({ data: { collegeId: college.id, userId: owner.id, title: 'Safety workflow context thread', body: 'This fictional thread verifies moderation visibility and history behavior.', category: 'Student context' } });
  try {
    const target = await getModerationTarget(prisma, 'THREAD', thread.id);
    assert.equal(target?.userId, owner.id);
    await updateTargetVisibility(prisma, 'THREAD', thread.id, 'HIDDEN');
    assert.equal((await prisma.question.findUniqueOrThrow({ where: { id: thread.id } })).visibility, 'HIDDEN');
    await updateTargetVisibility(prisma, 'THREAD', thread.id, 'VISIBLE');
    const action = await prisma.moderationAction.create({ data: { actionType: 'content:restored', moderatorId: moderator.id, targetType: 'THREAD', targetId: thread.id } });
    const warning = await prisma.userWarning.create({ data: { recipientUserId: owner.id, issuedByUserId: moderator.id, reason: 'Privacy-safe context reminder.', targetType: 'THREAD', targetId: thread.id } });
    const appeal = await prisma.moderationAppeal.create({ data: { userId: owner.id, moderationActionId: action.id, clarification: 'I removed the private detail and clarified the student context.' } });
    assert.equal(appeal.userId, owner.id);
    assert.notEqual(appeal.userId, other.id);
    assert.equal((await prisma.moderationAction.count({ where: { id: action.id } })), 1);
    assert.equal((await prisma.userWarning.findUniqueOrThrow({ where: { id: warning.id } })).acknowledgedAt, null);
  } finally {
    await prisma.moderationAppeal.deleteMany({ where: { moderationAction: { targetId: thread.id } } });
    await prisma.userWarning.deleteMany({ where: { targetId: thread.id } });
    await prisma.moderationAction.deleteMany({ where: { targetId: thread.id } });
    await prisma.question.delete({ where: { id: thread.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, moderator.id, other.id] } } });
  }
});

test('hidden contributions are excluded from public contribution search', async () => {
  const suffix = Date.now().toString();
  const user = await prisma.user.create({ data: { name: 'Hidden search owner', email: `hidden-search-${suffix}@example.test`, role: 'CURRENT_STUDENT' } });
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });
  const uniqueTitle = `privatecontext${suffix}`;
  const thread = await prisma.question.create({ data: { collegeId: college.id, userId: user.id, title: uniqueTitle, body: 'This hidden fictional context must never appear in public search.', category: 'Student context', visibility: 'HIDDEN' } });
  try {
    const visible = await prisma.question.findMany({ where: { title: { contains: uniqueTitle }, visibility: 'VISIBLE' } });
    assert.equal(visible.length, 0);
  } finally {
    await prisma.question.delete({ where: { id: thread.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
