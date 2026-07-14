import assert from 'node:assert/strict';
import test from 'node:test';
import { getFreshnessLabel } from '../src/lib/freshness';

const now = new Date('2026-07-01T00:00:00.000Z');

test('freshness labels content under 6 months as fresh', () => {
  assert.equal(getFreshnessLabel({ createdAt: new Date('2026-01-02T00:00:00.000Z'), now }), 'Fresh');
});

test('freshness labels exact 6 month boundary as recent', () => {
  assert.equal(getFreshnessLabel({ createdAt: new Date('2026-01-01T00:00:00.000Z'), now }), 'Recent');
});

test('freshness labels exact 12 month boundary as needs current context', () => {
  assert.equal(getFreshnessLabel({ createdAt: new Date('2025-07-01T00:00:00.000Z'), now }), 'Needs current context');
});

test('freshness labels exact 24 month boundary as past experience', () => {
  assert.equal(getFreshnessLabel({ createdAt: new Date('2024-07-01T00:00:00.000Z'), now }), 'Past experience');
});

test('freshness labels old content reconfirmed by current students as reconfirmed', () => {
  assert.equal(
    getFreshnessLabel({
      createdAt: new Date('2024-06-01T00:00:00.000Z'),
      reconfirmedAt: new Date('2026-06-15T00:00:00.000Z'),
      reconfirmedByCurrentStudent: true,
      now,
    }),
    'Reconfirmed',
  );
});
