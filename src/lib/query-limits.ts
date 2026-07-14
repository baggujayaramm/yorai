export function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

export function boundedSearchTerm(value: string, maximum = 80) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum);
}
