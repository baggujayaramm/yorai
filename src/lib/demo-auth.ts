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

export async function getCurrentDemoUserId() {
  const store = await cookies();
  const value = store.get(DEMO_USER_COOKIE)?.value;
  return demoUserIds.includes(value as DemoUserId) ? (value as DemoUserId) : null;
}

export async function requireDemoUserId() {
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

  return ['Current student', user.branch, user.year, user.hostelStatus].filter(Boolean).join(' · ');
}

export function trustLabelFromRole(role: string) {
  if (role === 'CURRENT_STUDENT') return 'Current student';
  if (role === 'ALUMNI') return 'Alumni';
  if (role === 'MODERATOR') return 'Context added';
  return 'Aspirant';
}
