export function canModerate(role?: string | null) {
  return role === 'MODERATOR' || role === 'ADMIN';
}

export function canAdminCollegeData(role?: string | null) {
  return role === 'ADMIN';
}

export function isCollegeRepresentativeRole(role?: string | null) {
  return role === 'COLLEGE_REP' || role === 'COLLEGE_REPRESENTATIVE';
}

export function canManageOwnContent(userId: string | undefined | null, ownerId: string | undefined | null) {
  return Boolean(userId && ownerId && userId === ownerId);
}

export function canModerateOrAdmin(role?: string | null) {
  return canModerate(role) || role === 'ADMIN';
}
