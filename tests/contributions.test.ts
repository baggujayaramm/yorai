import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureNotDuplicate, normalizeTags, validateContent } from '../src/lib/content-quality';
import { canManageOwnContent, canModerate, canModerateOrAdmin } from '../src/lib/permissions';
import { prisma } from '../src/lib/prisma';

test('content quality rejects empty, short, unsafe, repeated, and overly linked content', () => {
  assert.equal(validateContent('   ', { label: 'Reply' }).ok, false);
  assert.match(validateContent('too short', { label: 'Reply', minLength: 20 }).errors.join(' '), /more context/);
  assert.match(validateContent('<b>private</b> content with enough words here', { label: 'Reply', minLength: 10 }).errors.join(' '), /HTML/);
  assert.match(validateContent('aaaaaaaaaaaa content with enough words here', { label: 'Reply', minLength: 10 }).errors.join(' '), /repeated/);
  assert.match(validateContent('Context https://a.test https://b.test https://c.test', { label: 'Reply', minLength: 10, allowLinks: 1 }).errors.join(' '), /links/);
});

test('content quality warns on accidental private information patterns', () => {
  const result = validateContent('My phone is 9876543210 and this has enough context to trigger warning.', { label: 'Reply', minLength: 10 });
  assert.equal(result.ok, false);
  assert.match(result.warnings.join(' '), /phone/);
  assert.equal(validateContent('Students use laptops for regular coding practice after class hours.', { label: 'Reply', minLength: 10 }).ok, true);
});

test('tag normalization removes blanks, duplicates, and unsafe characters', () => {
  assert.deepEqual(normalizeTags([' Labs ', 'labs', 'First Year!', '', 'CSE Projects'], 5), ['labs', 'first-year', 'cse-projects']);
});

test('duplicate submission detection compares same user title and body', () => {
  assert.equal(ensureNotDuplicate(
    { userId: 'u1', title: 'Same', body: 'Same body' },
    [{ userId: 'u1', title: ' Same ', body: 'Same   body' }],
  ), false);
  assert.equal(ensureNotDuplicate(
    { userId: 'u2', title: 'Same', body: 'Same body' },
    [{ userId: 'u1', title: 'Same', body: 'Same body' }],
  ), true);
});

test('ownership and moderation permissions stay server-side friendly', () => {
  assert.equal(canManageOwnContent('u1', 'u1'), true);
  assert.equal(canManageOwnContent('u1', 'u2'), false);
  assert.equal(canModerate('MODERATOR'), true);
  assert.equal(canModerateOrAdmin('ADMIN'), true);
  assert.equal(canModerateOrAdmin('CURRENT_STUDENT'), false);
});

test('closed thread data state can be represented without deleting content', async () => {
  const user = await prisma.user.create({ data: { name: 'Contribution Test User', email: `contrib-${Date.now()}@example.test`, role: 'USER' } });
  const college = await prisma.college.findFirstOrThrow({ where: { recordStatus: 'PUBLISHED' } });
  const thread = await prisma.question.create({
    data: {
      collegeId: college.id,
      userId: user.id,
      title: 'Contribution state test thread',
      body: 'This thread has enough context to verify closed state behavior.',
      category: 'Student context',
      status: 'CLOSED',
    },
  });

  try {
    const saved = await prisma.question.findUniqueOrThrow({ where: { id: thread.id } });
    assert.equal(saved.status, 'CLOSED');
    assert.equal(saved.body.includes('closed state'), true);
  } finally {
    await prisma.question.delete({ where: { id: thread.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
