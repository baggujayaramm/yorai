import { createHash, randomBytes } from 'node:crypto';
import type { BetaInvite } from '@prisma/client';

export function normalizeInviteCode(value?: string | null) { return (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 48); }
export function hashInviteCode(value: string) { return createHash('sha256').update(normalizeInviteCode(value)).digest('hex'); }
export function generateInviteCode() { return `YORAI-${randomBytes(6).toString('hex').toUpperCase()}`; }

export function inviteAvailability(invite: Pick<BetaInvite, 'active' | 'expiresAt' | 'usageCount' | 'maxUses'>, now = new Date()) {
  if (!invite.active) return { valid: false, reason: 'inactive' as const };
  if (invite.expiresAt && invite.expiresAt <= now) return { valid: false, reason: 'expired' as const };
  if (invite.usageCount >= invite.maxUses) return { valid: false, reason: 'exhausted' as const };
  return { valid: true, reason: null };
}

export function emailHasBetaApproval(email: string, env: Record<string, string | undefined> = process.env) {
  const normalized = email.trim().toLowerCase();
  const domains = (env.YORAI_BETA_ALLOWED_DOMAINS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  const emails = (env.YORAI_BETA_APPROVED_EMAILS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return emails.includes(normalized) || domains.includes(normalized.split('@')[1] ?? '');
}

export const waitlistTransitions = { PENDING: ['APPROVED', 'REJECTED', 'INVITED'], APPROVED: ['INVITED', 'REJECTED'], REJECTED: ['APPROVED'], INVITED: [] } as const;
export function canTransitionWaitlist(from: string, to: string) { return (waitlistTransitions[from as keyof typeof waitlistTransitions] as readonly string[] | undefined)?.includes(to) ?? false; }

export const betaAccessStatuses = ['INVITED', 'ACTIVE', 'WAITLISTED', 'SUSPENDED', 'EXPIRED'] as const;
export function isBetaAccessStatus(value: unknown): value is typeof betaAccessStatuses[number] {
  return typeof value === 'string' && betaAccessStatuses.includes(value as typeof betaAccessStatuses[number]);
}

export function betaStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Active beta tester';
  if (status === 'WAITLISTED') return 'Waitlisted';
  if (status === 'SUSPENDED') return 'Contribution access suspended';
  if (status === 'EXPIRED') return 'Beta access expired';
  return 'Invited';
}
