export const reportStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;

export type ReportLifecycleStatus = (typeof reportStatuses)[number];

const allowedTransitions: Record<ReportLifecycleStatus, ReportLifecycleStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
  UNDER_REVIEW: ['RESOLVED', 'DISMISSED', 'OPEN'],
  RESOLVED: ['UNDER_REVIEW'],
  DISMISSED: ['UNDER_REVIEW'],
};

export function canTransitionReportStatus(from: string, to: string) {
  if (!isReportLifecycleStatus(from) || !isReportLifecycleStatus(to)) return false;
  return allowedTransitions[from].includes(to);
}

export function isReportLifecycleStatus(value: string): value is ReportLifecycleStatus {
  return reportStatuses.includes(value as ReportLifecycleStatus);
}

export function canHandleAssignedReport(assignedModeratorId: string | null | undefined, moderatorId: string) {
  return !assignedModeratorId || assignedModeratorId === moderatorId;
}

export const MODERATOR_ASSIGNMENT_STALE_MS = 2 * 60 * 60 * 1000;

export function assignmentIsStale(assignedAt: Date | null | undefined, now = new Date(), maxAgeMs = MODERATOR_ASSIGNMENT_STALE_MS) {
  return Boolean(assignedAt && assignedAt.getTime() <= now.getTime() - maxAgeMs);
}
