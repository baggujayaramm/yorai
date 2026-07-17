export const PERSONAL_STATE_EVENT = 'yorai-personal-state-change';

export type PersonalTargetType = 'college' | 'thread' | 'experience' | 'insight';

export type PersonalRecord = {
  id: string;
  userId: string;
  targetType: PersonalTargetType;
  targetId: string;
  createdAt: string;
};

export async function fetchPersonalRecords(targetType?: PersonalTargetType) {
  const response = await fetch('/api/personal', { cache: 'no-store' });
  const data = (await response.json()) as { records?: PersonalRecord[] };
  const records = data.records ?? [];
  return targetType ? records.filter((record) => record.targetType === targetType) : records;
}

export async function togglePersistentPersonalTarget(targetType: PersonalTargetType, targetId: string) {
  const response = await fetch('/api/personal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId }),
  });
  const data = (await response.json()) as { ok: boolean; active?: boolean; error?: string };
  if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not save this yet. Try again.');
  window.dispatchEvent(new Event(PERSONAL_STATE_EVENT));
  return Boolean(data.active);
}
