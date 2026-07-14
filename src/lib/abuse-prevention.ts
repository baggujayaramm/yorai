import type { RestrictionType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { prisma } from './prisma';

export type RateLimitPolicy = { limit: number; windowMs: number; message: string };

export const ratePolicies = {
  thread: { limit: 5, windowMs: 60 * 60 * 1000, message: 'You have started several threads recently. Please pause before starting another.' },
  reply: { limit: 20, windowMs: 60 * 60 * 1000, message: 'You have added several replies recently. Please pause briefly before replying again.' },
  experience: { limit: 4, windowMs: 24 * 60 * 60 * 1000, message: 'You have shared several experiences today. Please try again later.' },
  insight: { limit: 6, windowMs: 24 * 60 * 60 * 1000, message: 'You have shared several insights today. Please try again later.' },
  report: { limit: 8, windowMs: 24 * 60 * 60 * 1000, message: 'You have submitted several reports recently. Please pause before reporting more content.' },
  personal: { limit: 40, windowMs: 10 * 60 * 1000, message: 'There have been many account actions in a short time. Please wait a moment.' },
  context: { limit: 30, windowMs: 10 * 60 * 1000, message: 'There have been many context actions in a short time. Please wait a moment.' },
} satisfies Record<string, RateLimitPolicy>;

export function rateLimitDecision(count: number, policy: RateLimitPolicy) {
  return count >= policy.limit ? { allowed: false, retryAfterMs: policy.windowMs, message: policy.message } : { allowed: true, retryAfterMs: 0 };
}

const actionWindows = new Map<string, number[]>();

export function consumeInMemoryLimit(key: string, policy: RateLimitPolicy, now = Date.now()) {
  const active = (actionWindows.get(key) ?? []).filter((timestamp) => timestamp > now - policy.windowMs);
  const decision = rateLimitDecision(active.length, policy);
  if (decision.allowed) active.push(now);
  actionWindows.set(key, active);
  return decision;
}

export function clearInMemoryLimits() {
  actionWindows.clear();
}

export function contentFingerprint(title: string | undefined, body: string) {
  const normalized = `${title ?? ''}\n${body}`.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

export async function assertNoActiveRestriction(userId: string, type: RestrictionType, now = new Date()) {
  const restriction = await prisma.temporaryRestriction.findFirst({
    where: { userId, type, startsAt: { lte: now }, expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
  });
  if (restriction) {
    throw new Error(`A temporary ${type.toLowerCase()} restriction is active. You can try again after ${restriction.expiresAt.toLocaleString('en-IN')}.`);
  }
}

export function restrictionIsActive(input: { startsAt: Date; expiresAt: Date }, now = new Date()) {
  return input.startsAt <= now && input.expiresAt > now;
}
