export type FreshnessLabel = 'Fresh' | 'Recent' | 'Needs current context' | 'Past experience' | 'Reconfirmed';

export function getFreshnessLabel(input: {
  createdAt: Date;
  now?: Date;
  reconfirmedAt?: Date | null;
  reconfirmedByCurrentStudent?: boolean;
}): FreshnessLabel {
  const now = input.now ?? new Date();
  const ageMonths = monthsBetween(input.createdAt, now);

  if (ageMonths >= 24 && input.reconfirmedByCurrentStudent && input.reconfirmedAt) {
    return 'Reconfirmed';
  }

  if (ageMonths < 6) return 'Fresh';
  if (ageMonths < 12) return 'Recent';
  if (ageMonths < 24) return 'Needs current context';
  return 'Past experience';
}

export function getFreshnessSummary(label: FreshnessLabel) {
  if (label === 'Fresh') return 'Fresh student context';
  if (label === 'Recent') return 'Recent student context';
  if (label === 'Needs current context') return 'Needs current context';
  if (label === 'Reconfirmed') return 'Reconfirmed by current students';
  return 'Past experience. Needs current context.';
}

function monthsBetween(start: Date, end: Date) {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  const dayAdjustment = end.getUTCDate() < start.getUTCDate() ? -1 : 0;
  return years * 12 + months + dayAdjustment;
}
