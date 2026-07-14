import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse } from '../src/lib/api-response';
import { isAnalyticsEventType, routeCategoryForPath } from '../src/lib/analytics';
import { runtimeEnvironment, validateEnvironment } from '../src/lib/environment';
import { boundedInteger, boundedSearchTerm } from '../src/lib/query-limits';
import { collegeSearchTerms } from '../src/lib/college-search';

test('production environment validation is strict without exposing values', () => {
  const invalid = validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'secret-db', NEXT_PUBLIC_APP_URL: 'http://unsafe.test', YORAI_DEMO_AUTH_ENABLED: 'true', YORAI_SESSION_DAYS: '0' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.some((item) => item.includes('secret-db')), false);
  const valid = validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://private', NEXT_PUBLIC_APP_URL: 'https://yorai.example', YORAI_DEMO_AUTH_ENABLED: 'false', YORAI_SESSION_DAYS: '30' });
  assert.equal(valid.ok, true);
  assert.equal(runtimeEnvironment({ VERCEL_ENV: 'preview' }), 'preview');
});

test('bounded query inputs reject NaN, infinity, oversized limits, and long searches', () => {
  assert.equal(boundedInteger('not-a-number', 20, 1, 50), 20);
  assert.equal(boundedInteger(Infinity, 20, 1, 50), 20);
  assert.equal(boundedInteger('9999', 20, 1, 50), 50);
  assert.equal(boundedInteger('-4', 20, 1, 50), 1);
  assert.equal(boundedSearchTerm(`  ${'x'.repeat(200)}  `).length, 80);
});

test('college search expands common branch acronyms without unbounded input', () => {
  assert.equal(collegeSearchTerms('CSE').includes('Computer Science and Engineering'), true);
  assert.equal(collegeSearchTerms('unknown').length <= 3, true);
});

test('safe API errors preserve validation and hide unexpected internals', async () => {
  const request = new NextRequest('http://localhost/api/test', { headers: { 'x-request-id': 'request-safe-123' } });
  const known = apiErrorResponse(new ApiError(409, 'This thread is closed.', 'thread_closed'), 'Failed.', request, 'test');
  assert.equal(known.status, 409);
  assert.equal((await known.json()).error, 'This thread is closed.');
  const hidden = apiErrorResponse(new Error('Prisma P2002 at /home/private with DATABASE_URL'), 'Could not complete this request.', request, 'test');
  const body = await hidden.json();
  assert.equal(hidden.status, 500);
  assert.equal(body.error, 'Could not complete this request.');
  assert.equal(JSON.stringify(body).includes('/home/private'), false);
  assert.equal(body.errorId, 'request-safe-123');
});

test('analytics categories contain no raw path or query content', () => {
  assert.equal(routeCategoryForPath('/colleges/fictional-college/threads/abc'), 'THREAD');
  assert.equal(routeCategoryForPath('/admin/system'), 'ADMIN');
  assert.equal(isAnalyticsEventType('PAGE_VIEW'), true);
  assert.equal(isAnalyticsEventType('RAW_SEARCH_QUERY'), false);
});

test('high-impact controls expose semantic accessibility hooks', async () => {
  const [layout, theme, auth, report, preview] = await Promise.all([
    readFile('src/app/layout.tsx', 'utf8'), readFile('src/components/ThemeToggle.tsx', 'utf8'), readFile('src/components/AuthForm.tsx', 'utf8'), readFile('src/components/ReportButton.tsx', 'utf8'), readFile('src/components/CollegePreviewSearch.tsx', 'utf8'),
  ]);
  assert.match(layout, /Skip to main content/);
  assert.match(layout, /id="main-content"/);
  assert.match(theme, /aria-label=/);
  assert.match(auth, /htmlFor=/);
  assert.match(auth, /role="alert"/);
  assert.match(report, /aria-modal="true"/);
  assert.match(report, /aria-labelledby="report-dialog-title"/);
  assert.match(preview, /aria-label="Close college preview"/);
});
