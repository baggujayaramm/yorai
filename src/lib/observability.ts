import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = { requestId?: string; code: string; details?: Record<string, string | number | boolean | null | undefined> };

export function requestIdFor(request?: Pick<NextRequest, 'headers'>) {
  const supplied = request?.headers.get('x-request-id')?.trim();
  return supplied && /^[a-zA-Z0-9._-]{8,80}$/.test(supplied) ? supplied : randomUUID();
}

export function logEvent(level: LogLevel, category: string, context: LogContext) {
  const safe = { timestamp: new Date().toISOString(), level, category, requestId: context.requestId, code: context.code, details: sanitizeDetails(context.details) };
  const line = JSON.stringify(safe);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') { if (process.env.NODE_ENV !== 'production') console.debug(line); }
  else console.info(line);
  if ((level === 'warn' || level === 'error') && !process.env.NODE_TEST_CONTEXT) {
    void prisma.operationalEvent.create({ data: { level, category, code: context.code, requestId: context.requestId, details: safe.details } }).catch(() => undefined);
  }
}

function sanitizeDetails(details?: LogContext['details']) {
  if (!details) return undefined;
  const blocked = /password|token|secret|cookie|authorization|email|body|content|profile/i;
  return Object.fromEntries(Object.entries(details).filter(([key, value]) => !blocked.test(key) && ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 120) : value]));
}
