import type { PolicyType, Prisma } from '@prisma/client';
import { ApiError } from './api-response';

export const currentPolicyVersions: Record<PolicyType, string> = {
  TERMS: '2026-07-13',
  PRIVACY: '2026-07-13',
  COMMUNITY_GUIDELINES: '2026-07-13',
  CONTENT_POLICY: '2026-07-13',
  DATA_CORRECTION: '2026-07-13',
  COLLEGE_REPRESENTATIVE: '2026-07-13',
  ACCOUNT_SUSPENSION: '2026-07-13',
};

export const accountCreationPolicies: PolicyType[] = ['TERMS', 'PRIVACY', 'COMMUNITY_GUIDELINES', 'CONTENT_POLICY'];

export function assertPolicyAcceptance(accepted?: boolean) {
  if (!accepted) throw new ApiError(400, 'You need to accept Yorai policies before creating an account.', 'policy_acceptance_required');
}

export async function recordPolicyAcceptance(tx: Prisma.TransactionClient, userId: string, policies = accountCreationPolicies) {
  await Promise.all(policies.map((policyType) => tx.policyAcceptance.upsert({
    where: { userId_policyType_version: { userId, policyType, version: currentPolicyVersions[policyType] } },
    update: {},
    create: { userId, policyType, version: currentPolicyVersions[policyType] },
  })));
}
