import { cookies } from 'next/headers';
import type { User } from './types';
import { users } from './seed-data';

export const DEMO_USER_COOKIE = 'yorai_demo_user_id';

export const demoUserIds = ['u1', 'u2', 'u7', 'u3', 'u6'] as const;

export type DemoUserId = (typeof demoUserIds)[number];

export function getDemoUsers() {
  return demoUserIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user));
}

export function isDemoAuthEnabled() {
  return process.env.YORAI_DEMO_AUTH_ENABLED === 'true' && process.env.VERCEL_ENV !== 'production';
}

export async function getCurrentDemoUserId() {
  if (!isDemoAuthEnabled()) return null;
  const store = await cookies();
  const value = store.get(DEMO_USER_COOKIE)?.value;
  return demoUserIds.includes(value as DemoUserId) ? (value as DemoUserId) : null;
}

export async function requireDemoUserId() {
  if (!isDemoAuthEnabled()) {
    throw new Error('Demo identity is disabled. Enable YORAI_DEMO_AUTH_ENABLED=true for private preview writes.');
  }

  const userId = await getCurrentDemoUserId();
  if (!userId) {
    throw new Error('You need to choose a demo user before posting.');
  }
  return userId;
}

export function formatPublicUserContext(user: {
  role: string;
  branch?: string | null;
  year?: string | null;
  batch?: string | null;
  hostelStatus?: string | null;
  interestedBranch?: string | null;
}) {
  if (user.role === 'ASPIRANT') {
    return ['Aspirant', user.interestedBranch ? `Interested in ${user.interestedBranch}` : undefined].filter(Boolean).join(' · ');
  }

  if (user.role === 'ALUMNI') {
    return ['Alumni', user.branch, user.batch ? `${user.batch} batch` : undefined].filter(Boolean).join(' · ');
  }

  if (user.role === 'MODERATOR') return 'Moderator';
  if (user.role === 'ADMIN') return 'Admin';
  if (user.role === 'COLLEGE_REP' || user.role === 'COLLEGE_REPRESENTATIVE') return 'College Representative · Factual metadata only';
  if (user.role === 'USER') return 'Yorai user';

  return ['Current student', user.branch, user.year, user.hostelStatus].filter(Boolean).join(' · ');
}

export function trustLabelFromRole(role: string) {
  if (role === 'CURRENT_STUDENT') return 'Current student';
  if (role === 'ALUMNI') return 'Alumni';
  if (role === 'COLLEGE_REP' || role === 'COLLEGE_REPRESENTATIVE') return 'College representative';
  if (role === 'MODERATOR' || role === 'ADMIN') return 'Context added';
  return 'Aspirant';
}
