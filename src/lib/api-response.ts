import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logEvent, requestIdFor } from './observability';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'request_failed') { super(message); }
}

export function apiErrorResponse(error: unknown, fallback: string, request?: NextRequest, category = 'api') {
  const requestId = requestIdFor(request);
  const known = error instanceof ApiError;
  const raw = error instanceof Error ? error.message : '';
  const safeKnown = known || isSafeExistingMessage(raw);
  const status = known ? error.status : statusForMessage(raw);
  const message = safeKnown ? raw : fallback;
  const responseStatus = safeKnown ? status : 500;
  const level = responseStatus >= 500 ? 'error' : responseStatus === 429 ? 'warn' : 'debug';
  logEvent(level, category, { requestId, code: known ? error.code : safeKnown ? 'handled_request' : 'unexpected_error', details: { status: responseStatus, errorType: error instanceof Error ? error.constructor.name : 'unknown' } });
  const response = NextResponse.json({ ok: false, error: message, errorId: requestId }, { status: responseStatus });
  response.headers.set('x-request-id', requestId);
  return response;
}

const safePrefixes = [
  'Sign in', 'You need to', 'This area is', 'Only ', 'You can ', 'You cannot ', 'Choose ', 'Missing ',
  'Could not ', 'Invalid ', 'Use at least', 'Add a valid', 'An account ', 'This thread ', 'Thread not found',
  'Experience not found', 'Insight not found', 'Reply not found', 'Report not found', 'Unsupported ', 'Cannot move',
  'Another moderator', 'Moderators can', 'One clarification', 'Runtime configuration', 'There have been', 'You have ',
  'A temporary ',
  'Too many ',
];
function isSafeExistingMessage(message: string) { return safePrefixes.some((prefix) => message.startsWith(prefix)); }
function statusForMessage(message: string) {
  if (/Sign in|only for|Only |cannot access/i.test(message)) return 403;
  if (/not found|unavailable/i.test(message)) return 404;
  if (/duplicate|already|closed|restriction|currently handling/i.test(message)) return 409;
  if (/many|several|pause|wait a moment/i.test(message)) return 429;
  return 400;
}
