import type { User } from '@prisma/client';
import type { LaunchMode } from '@prisma/client';
import { prisma } from './prisma';
import { ApiError } from './api-response';

export const featureDefaults = {
  public_browsing: true,
  public_registration: false,
  invite_only_registration: true,
  approved_domain_registration: false,
  registration_paused: false,
  waitlist: true,
  feedback_system: true,
  college_imports: true,
  beta_only_contributions: true,
  public_contributions: false,
  read_only_mode: false,
  emergency_pause_contributions: false,
  notifications: true,
  moderation_tools: true,
  college_claims: true,
  data_exports: true,
  account_deletion_requests: true,
  experimental_features: false,
} as const;
export type FeatureKey = keyof typeof featureDefaults;

export const launchModes = ['CLOSED_BETA', 'INVITE_ONLY', 'LIMITED_PUBLIC', 'PUBLIC'] as const;
export type LaunchModeValue = (typeof launchModes)[number];

export const launchModeLabels: Record<LaunchModeValue, string> = {
  CLOSED_BETA: 'Closed beta',
  INVITE_ONLY: 'Invite only',
  LIMITED_PUBLIC: 'Limited public',
  PUBLIC: 'Public',
};

export async function featureEnabled(key: FeatureKey) {
  const override = process.env[`YORAI_FLAG_${key.toUpperCase()}`];
  if (override === 'true' || override === 'false') return override === 'true';
  const record = await prisma.featureFlag.findUnique({ where: { key }, select: { enabled: true } }).catch(() => null);
  return record?.enabled ?? featureDefaults[key];
}

export function normalizeLaunchMode(value?: string | null): LaunchModeValue | null {
  const normalized = value?.trim().toUpperCase().replaceAll('-', '_');
  return launchModes.includes(normalized as LaunchModeValue) ? normalized as LaunchModeValue : null;
}

export async function getPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  const record = await prisma.platformSetting.findUnique({ where: { key }, select: { value: true } }).catch(() => null);
  return record?.value as T ?? fallback;
}

export async function setPlatformSetting(key: string, value: unknown, updatedById?: string | null) {
  return prisma.platformSetting.upsert({
    where: { key },
    update: { value: value as never, updatedById: updatedById ?? undefined },
    create: { key, value: value as never, updatedById: updatedById ?? undefined },
  });
}

export async function getLaunchMode(): Promise<LaunchMode> {
  const envMode = normalizeLaunchMode(process.env.YORAI_LAUNCH_MODE);
  if (envMode) return envMode;
  const stored = await getPlatformSetting<{ mode?: string }>('launch_mode', { mode: 'CLOSED_BETA' });
  return normalizeLaunchMode(stored.mode) ?? 'CLOSED_BETA';
}

export async function getLaunchState() {
  const [
    launchMode,
    publicBrowsing,
    publicRegistration,
    inviteOnlyRegistration,
    approvedDomainRegistration,
    registrationPaused,
    publicContributions,
    readOnlyMode,
    emergencyPauseContributions,
  ] = await Promise.all([
    getLaunchMode(),
    featureEnabled('public_browsing'),
    featureEnabled('public_registration'),
    featureEnabled('invite_only_registration'),
    featureEnabled('approved_domain_registration'),
    featureEnabled('registration_paused'),
    featureEnabled('public_contributions'),
    featureEnabled('read_only_mode'),
    featureEnabled('emergency_pause_contributions'),
  ]);

  return {
    launchMode,
    label: launchModeLabels[launchMode],
    publicBrowsing,
    publicRegistration,
    inviteOnlyRegistration,
    approvedDomainRegistration,
    registrationPaused,
    publicContributions,
    readOnlyMode,
    emergencyPauseContributions,
  };
}

export function maintenanceMode(env: Record<string, string | undefined> = process.env) {
  const value = env.YORAI_MAINTENANCE_MODE?.toLowerCase();
  return value === 'full' || value === 'write' ? value : 'off';
}

export function announcementAudiencesFor(user?: Pick<User, 'role' | 'betaStatus'> | null) {
  if (!user) return ['ALL_USERS'] as const;
  if (user.role === 'ADMIN') return ['ALL_USERS', 'BETA_USERS', 'MODERATORS', 'ADMINS'] as const;
  if (user.role === 'MODERATOR') return ['ALL_USERS', 'BETA_USERS', 'MODERATORS'] as const;
  if (user.betaStatus === 'ACTIVE') return ['ALL_USERS', 'BETA_USERS'] as const;
  return ['ALL_USERS'] as const;
}

export async function assertBetaWriteAccess(user: Pick<User, 'role' | 'betaStatus'>, feature?: FeatureKey) {
  if (user.role === 'ADMIN') return;
  if (maintenanceMode() !== 'off') throw new ApiError(503, 'Yorai is temporarily pausing contributions for maintenance. Public browsing remains available.', 'maintenance_write_pause');
  if (await featureEnabled('read_only_mode') || await featureEnabled('emergency_pause_contributions')) {
    throw new ApiError(503, 'Yorai is temporarily in read-only mode. Public browsing remains available.', 'read_only_mode');
  }
  if (feature && !await featureEnabled(feature)) throw new ApiError(503, 'This beta feature is temporarily unavailable.', 'feature_disabled');
  const launchMode = await getLaunchMode();
  const publicContributionAccess = await featureEnabled('public_contributions') && (launchMode === 'PUBLIC' || launchMode === 'LIMITED_PUBLIC');
  if (await featureEnabled('beta_only_contributions') && !publicContributionAccess && user.betaStatus !== 'ACTIVE') {
    const message = user.betaStatus === 'SUSPENDED' ? 'Your beta contribution access is temporarily suspended.' : user.betaStatus === 'EXPIRED' ? 'Your beta access has expired.' : 'Active beta access is required to contribute.';
    throw new ApiError(403, message, 'beta_access_required');
  }
}

export function safeReleaseMetadata(env: Record<string, string | undefined> = process.env) {
  return {
    version: env.NEXT_PUBLIC_APP_VERSION ?? '2.0.0',
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
    buildIdentifier: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? env.YORAI_BUILD_ID?.slice(0, 40) ?? null,
    migrationVersion: '20260713103000_v2_0_public_launch_foundation',
  };
}
