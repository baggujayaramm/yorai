export function canReportTarget(reporterUserId: string, ownerUserId: string) {
  return Boolean(reporterUserId && ownerUserId && reporterUserId !== ownerUserId);
}

export function hasDuplicateOpenReport(existing: Array<{ reporterUserId: string; targetType: string; targetId: string; status: string }>, input: { reporterUserId: string; targetType: string; targetId: string }) {
  const open = new Set(['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED']);
  return existing.some((item) => item.reporterUserId === input.reporterUserId && item.targetType === input.targetType && item.targetId === input.targetId && open.has(item.status));
}
