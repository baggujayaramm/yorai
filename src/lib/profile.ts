import type { College, ProfileVisibility, User, UserRole, VerificationStatus } from '@prisma/client';

export type ProductProfileVisibility = 'PUBLIC' | 'COMMUNITY_ONLY' | 'PRIVATE';
export type ProfileRelationship = 'current_student' | 'alumni' | 'applicant' | 'prefer_not';

export const reservedUsernames = new Set(['admin', 'moderator', 'support', 'yorai', 'system', 'login', 'signup', 'settings', 'api']);
export const productProfileVisibilities = ['PUBLIC', 'COMMUNITY_ONLY', 'PRIVATE'] as const;
export const profileRelationships = ['current_student', 'alumni', 'applicant', 'prefer_not'] as const;

export type ProfileValidationResult = {
  ok: boolean;
  error?: string;
};

export type PublicProfile = {
  username: string;
  displayName: string;
  contextLabel: string;
  relationshipLabel: string;
  college?: string;
  branch?: string;
  year?: string;
  bio?: string;
  roleLabel?: string;
  joinedAt: string;
  visibility: ProductProfileVisibility;
  verificationLabel?: string;
  contributions: {
    threads: number;
    replies: number;
    experiences: number;
    insights: number;
  };
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(username: string): ProfileValidationResult {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3 || normalized.length > 24) {
    return { ok: false, error: 'Username must be 3-24 characters.' };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return { ok: false, error: 'Use only lowercase letters, numbers, and underscores.' };
  }
  if (reservedUsernames.has(normalized)) {
    return { ok: false, error: 'This username is reserved.' };
  }
  return { ok: true };
}

export function isProductProfileVisibility(value: string): value is ProductProfileVisibility {
  return productProfileVisibilities.includes(value as ProductProfileVisibility);
}

export function isProfileRelationship(value: string): value is ProfileRelationship {
  return profileRelationships.includes(value as ProfileRelationship);
}

export function mapVisibilityToProduct(value: ProfileVisibility): ProductProfileVisibility {
  if (value === 'LIMITED_CONTEXT') return 'COMMUNITY_ONLY';
  if (value === 'PRIVATE') return 'PRIVATE';
  return 'PUBLIC';
}

export function mapVisibilityToDb(value: string): ProfileVisibility {
  if (value === 'COMMUNITY_ONLY') return 'LIMITED_CONTEXT';
  if (value === 'PRIVATE') return 'PRIVATE';
  return 'PUBLIC_CONTEXT';
}

export function relationshipFromRole(role: UserRole): ProfileRelationship {
  if (role === 'CURRENT_STUDENT') return 'current_student';
  if (role === 'ALUMNI') return 'alumni';
  if (role === 'ASPIRANT') return 'applicant';
  return 'prefer_not';
}

export function roleFromRelationship(relationship: string, currentRole: UserRole): UserRole {
  if (currentRole === 'MODERATOR' || currentRole === 'ADMIN') return currentRole;
  if (relationship === 'current_student') return 'CURRENT_STUDENT';
  if (relationship === 'alumni') return 'ALUMNI';
  if (relationship === 'applicant') return 'ASPIRANT';
  return 'USER';
}

export function relationshipLabel(role: UserRole) {
  if (role === 'CURRENT_STUDENT') return 'Current Student';
  if (role === 'ALUMNI') return 'Alumni';
  if (role === 'ASPIRANT') return 'Prospective Student';
  if (role === 'COLLEGE_REP' || role === 'COLLEGE_REPRESENTATIVE') return 'College Representative';
  if (role === 'MODERATOR') return 'Moderator';
  if (role === 'ADMIN') return 'Admin';
  return 'Yorai user';
}

export function profileContextLabel(user: Pick<User, 'role' | 'branch' | 'year' | 'batch' | 'hostelStatus' | 'interestedBranch'>, minimal = false) {
  if (minimal) return relationshipLabel(user.role);
  if (user.role === 'CURRENT_STUDENT') return ['Current Student', user.branch, user.year, user.hostelStatus].filter(Boolean).join(' · ');
  if (user.role === 'ALUMNI') return ['Alumni', user.branch, user.batch ? `Class of ${user.batch}` : undefined].filter(Boolean).join(' · ');
  if (user.role === 'ASPIRANT') return ['Prospective Student', user.interestedBranch ? `Interested in ${user.interestedBranch}` : undefined].filter(Boolean).join(' · ');
  if (user.role === 'COLLEGE_REP' || user.role === 'COLLEGE_REPRESENTATIVE') return 'College Representative · Factual metadata only';
  return relationshipLabel(user.role);
}

export function contributionContextLabel(user: Pick<User, 'role' | 'branch' | 'year' | 'batch' | 'hostelStatus' | 'interestedBranch' | 'profileVisibility'>) {
  return profileContextLabel(user, user.profileVisibility === 'PRIVATE');
}

export function verificationDisplay(status: VerificationStatus) {
  if (status === 'MODERATOR_CONFIRMED') return 'Moderator confirmed';
  if (status === 'COMMUNITY_CONFIRMED') return 'Community confirmed';
  if (status === 'CONTEXT_ADDED') return 'Self-declared context';
  return undefined;
}

export async function isValidProfileCollegeId(
  lookup: { college: { findUnique: (input: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null> } },
  collegeId?: string | null,
) {
  if (!collegeId) return true;
  const college = 'findFirst' in lookup.college
    ? await (lookup.college as { findFirst: (input: { where: { id: string; recordStatus: 'PUBLISHED' }; select: { id: true } }) => Promise<{ id: string } | null> }).findFirst({ where: { id: collegeId, recordStatus: 'PUBLISHED' }, select: { id: true } })
    : await lookup.college.findUnique({ where: { id: collegeId }, select: { id: true } });
  return Boolean(college);
}

export function canViewProfile(visibility: ProductProfileVisibility, input: { isOwner: boolean; viewerSignedIn: boolean }) {
  if (input.isOwner) return true;
  if (visibility === 'PUBLIC') return true;
  if (visibility === 'COMMUNITY_ONLY') return input.viewerSignedIn;
  return false;
}

export function toPublicProfile(
  user: User & { college?: Pick<College, 'name'> | null; _count?: { questions: number; answers: number; experiences: number; whatWorksPosts: number } },
  input: { isOwner: boolean; viewerSignedIn: boolean },
): PublicProfile | null {
  const visibility = mapVisibilityToProduct(user.profileVisibility);
  if (!canViewProfile(visibility, input)) return null;
  const privateView = visibility === 'PRIVATE' && input.isOwner;
  const limited = visibility === 'PRIVATE' && !input.isOwner;

  return {
    username: user.username ?? user.id,
    displayName: user.displayName ?? user.anonymousDisplayName ?? user.name,
    contextLabel: profileContextLabel(user, limited),
    relationshipLabel: relationshipLabel(user.role),
    college: privateView ? user.college?.name : user.college?.name,
    branch: privateView ? user.branch ?? undefined : user.branch ?? undefined,
    year: privateView ? user.year ?? user.batch ?? undefined : user.year ?? user.batch ?? undefined,
    bio: user.publicBio ?? undefined,
    roleLabel: user.role === 'MODERATOR' || user.role === 'ADMIN' || user.role === 'COLLEGE_REP' || user.role === 'COLLEGE_REPRESENTATIVE' ? relationshipLabel(user.role) : undefined,
    joinedAt: user.createdAt.toISOString().slice(0, 10),
    visibility,
    verificationLabel: verificationDisplay(user.verificationStatus),
    contributions: {
      threads: user._count?.questions ?? 0,
      replies: user._count?.answers ?? 0,
      experiences: user._count?.experiences ?? 0,
      insights: user._count?.whatWorksPosts ?? 0,
    },
  };
}
