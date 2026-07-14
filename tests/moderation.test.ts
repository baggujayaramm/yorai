import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionReportStatus } from '../src/lib/moderation';
import { canModerate } from '../src/lib/permissions';

test('moderation roles allow moderator and admin only', () => {
  assert.equal(canModerate('MODERATOR'), true);
  assert.equal(canModerate('ADMIN'), true);
  assert.equal(canModerate('CURRENT_STUDENT'), false);
  assert.equal(canModerate('ASPIRANT'), false);
});

test('report lifecycle allows normal review transitions', () => {
  assert.equal(canTransitionReportStatus('OPEN', 'UNDER_REVIEW'), true);
  assert.equal(canTransitionReportStatus('UNDER_REVIEW', 'RESOLVED'), true);
  assert.equal(canTransitionReportStatus('UNDER_REVIEW', 'DISMISSED'), true);
});

test('report lifecycle rejects unsupported transitions', () => {
  assert.equal(canTransitionReportStatus('RESOLVED', 'OPEN'), false);
  assert.equal(canTransitionReportStatus('PENDING', 'RESOLVED'), false);
});
