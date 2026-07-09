import { formatUserContext, getCurrentUserContext } from './user-context-storage';

export const PERSONAL_STATE_EVENT = 'yorai-personal-state-change';

const PERSONAL_STATE_KEY = 'yorai.personalState.v1';

export type PersonalTargetType = 'college' | 'thread' | 'experience' | 'insight';

export type PersonalRecord = {
  id: string;
  userId: string;
  targetType: PersonalTargetType;
  targetId: string;
  createdAt: string;
};

export function getPersonalRecords(targetType?: PersonalTargetType) {
  const records = readAll();
  return targetType ? records.filter((record) => record.targetType === targetType) : records;
}

export async function fetchPersonalRecords(targetType?: PersonalTargetType) {
  const response = await fetch('/api/personal', { cache: 'no-store' });
  const data = (await response.json()) as { records?: PersonalRecord[] };
  const records = data.records ?? [];
  return targetType ? records.filter((record) => record.targetType === targetType) : records;
}

export function isPersonalTargetSaved(targetType: PersonalTargetType, targetId: string) {
  return readAll().some((record) => record.targetType === targetType && record.targetId === targetId);
}

export function togglePersonalTarget(targetType: PersonalTargetType, targetId: string) {
  const records = readAll();
  const existing = records.find((record) => record.targetType === targetType && record.targetId === targetId);
  const next = existing
    ? records.filter((record) => record.id !== existing.id)
    : [
        {
          id: `${targetType}-${targetId}-${Date.now()}`,
          userId: getMockUserId(),
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        },
        ...records,
      ];

  writeAll(next);
  window.dispatchEvent(new Event(PERSONAL_STATE_EVENT));
  return !existing;
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

function getMockUserId() {
  const context = getCurrentUserContext();
  return `mock-${formatUserContext(context) || context.role}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function readAll() {
  if (typeof window === 'undefined') return [] as PersonalRecord[];
  try {
    const raw = window.localStorage.getItem(PERSONAL_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersonalRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: PersonalRecord[]) {
  window.localStorage.setItem(PERSONAL_STATE_KEY, JSON.stringify(records));
}
