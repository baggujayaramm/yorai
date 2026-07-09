export const USER_CONTEXT_EVENT = 'yorai-user-context-change';

const USER_CONTEXT_KEY = 'yorai.userContext.v1';

export type UserRoleLabel = 'Aspirant' | 'Current student' | 'Alumni' | 'Moderator';

export type UserContext = {
  role: UserRoleLabel;
  college?: string;
  branch?: string;
  year?: string;
  batch?: string;
  hostelStatus?: string;
  interestedBranch?: string;
};

export const defaultUserContext: UserContext = {
  role: 'Aspirant',
  interestedBranch: 'CSE',
};

export function getCurrentUserContext() {
  if (typeof window === 'undefined') return defaultUserContext;
  try {
    const raw = window.localStorage.getItem(USER_CONTEXT_KEY);
    return raw ? ({ ...defaultUserContext, ...JSON.parse(raw) } as UserContext) : defaultUserContext;
  } catch {
    return defaultUserContext;
  }
}

export function saveCurrentUserContext(context: UserContext) {
  window.localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context));
  window.dispatchEvent(new Event(USER_CONTEXT_EVENT));
}

export function formatUserContext(context: UserContext) {
  if (context.role === 'Aspirant') {
    return ['Aspirant', context.interestedBranch ? `Interested in ${context.interestedBranch}` : undefined]
      .filter(Boolean)
      .join(' · ');
  }

  if (context.role === 'Alumni') {
    return ['Alumni', context.branch, context.batch ? `${context.batch} batch` : undefined]
      .filter(Boolean)
      .join(' · ');
  }

  return [context.role, context.branch, context.year, context.batch ? `${context.batch} batch` : undefined, context.hostelStatus]
    .filter(Boolean)
    .join(' · ');
}

export function trustLabelForRole(role: UserRoleLabel) {
  if (role === 'Current student') return 'Current student';
  if (role === 'Alumni') return 'Alumni';
  if (role === 'Moderator') return 'Context added';
  return 'Aspirant';
}
