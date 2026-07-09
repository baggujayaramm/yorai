import { formatUserContext, getCurrentUserContext } from './user-context-storage';

export const COMMUNITY_CONTEXT_EVENT = 'yorai-community-context-change';

const COMMUNITY_CONTEXT_KEY = 'yorai.communityContext.v1';

export type CommunityTargetType = 'thread' | 'reply' | 'experience' | 'insight';

export type CommunityActionType =
  | 'MATCHES'
  | 'PARTLY_TRUE'
  | 'NOT_MY_BRANCH'
  | 'CHANGED_RECENTLY'
  | 'NEEDS_CONTEXT'
  | 'CAN_ADD_CONTEXT'
  | 'CURRENT_STUDENTS_UPDATE';

export type CommunityContextRecord = {
  targetType: CommunityTargetType;
  targetId: string;
  actionType: CommunityActionType;
  userId: string;
  createdDate: string;
  userContext: string;
  userRole: string;
};

export const communityActions: Array<{ type: CommunityActionType; label: string; summaryLabel: string }> = [
  { type: 'MATCHES', label: 'Matches my experience', summaryLabel: 'matches their experience' },
  { type: 'PARTLY_TRUE', label: 'Partly true', summaryLabel: 'say this is partly true' },
  { type: 'NOT_MY_BRANCH', label: 'Not true for my branch', summaryLabel: 'say this may not apply to their branch' },
  { type: 'CHANGED_RECENTLY', label: 'Changed recently', summaryLabel: 'say this changed recently' },
  { type: 'NEEDS_CONTEXT', label: 'Needs more context', summaryLabel: 'say this needs more context' },
  { type: 'CAN_ADD_CONTEXT', label: 'I can add context', summaryLabel: 'can add context' },
  { type: 'CURRENT_STUDENTS_UPDATE', label: 'Current students should update this', summaryLabel: 'asked current students to update this' },
];

export function getCommunityContextRecords(targetType: CommunityTargetType, targetId: string) {
  return readAll().filter((record) => record.targetType === targetType && record.targetId === targetId);
}

export async function fetchCommunityContextRecords(targetType: CommunityTargetType, targetId: string) {
  const params = new URLSearchParams({ targetType, targetId });
  const response = await fetch(`/api/community-context?${params.toString()}`, { cache: 'no-store' });
  const data = (await response.json()) as { records?: CommunityContextRecord[] };
  return data.records ?? [];
}

export function addCommunityContext(targetType: CommunityTargetType, targetId: string, actionType: CommunityActionType) {
  const context = getCurrentUserContext();
  const userContext = formatUserContext(context);
  const userId = `mock-${userContext || context.role}`.toLowerCase().replace(/\s+/g, '-');
  const records = readAll();
  const exists = records.some(
    (record) =>
      record.targetType === targetType &&
      record.targetId === targetId &&
      record.actionType === actionType &&
      record.userId === userId,
  );

  if (exists) return records;

  const next = [
    {
      targetType,
      targetId,
      actionType,
      userId,
      createdDate: new Date().toISOString().slice(0, 10),
      userContext,
      userRole: context.role,
    },
    ...records,
  ];
  writeAll(next);
  window.dispatchEvent(new Event(COMMUNITY_CONTEXT_EVENT));
  return next;
}

export async function addPersistentCommunityContext(targetType: CommunityTargetType, targetId: string, actionType: CommunityActionType) {
  const response = await fetch('/api/community-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId, actionType }),
  });
  const data = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not save this yet. Try again.');
  window.dispatchEvent(new Event(COMMUNITY_CONTEXT_EVENT));
}

export function getCounts(records: CommunityContextRecord[], initialCounts: Array<{ label: string; count: number }> = []) {
  const counts = new Map<CommunityActionType, number>();

  for (const action of communityActions) {
    const initial = initialCounts.find((item) => item.label === action.label)?.count ?? 0;
    counts.set(action.type, initial);
  }

  for (const record of records) {
    counts.set(record.actionType, (counts.get(record.actionType) ?? 0) + 1);
  }

  return counts;
}

export function getCommunitySummary(input: {
  records: CommunityContextRecord[];
  initialFreshness?: string;
  initialCounts?: Array<{ label: string; count: number }>;
  compact?: boolean;
}) {
  const counts = getCounts(input.records, input.initialCounts);
  const changed = counts.get('CHANGED_RECENTLY') ?? 0;
  const needs = (counts.get('NEEDS_CONTEXT') ?? 0) + (counts.get('CURRENT_STUDENTS_UPDATE') ?? 0);
  const matches = counts.get('MATCHES') ?? 0;
  const branchSpecific = counts.get('NOT_MY_BRANCH') ?? 0;
  const currentStudentReconfirmed = input.records.some(
    (record) =>
      (record.actionType === 'MATCHES' || record.actionType === 'CAN_ADD_CONTEXT') &&
      record.userRole === 'Current student',
  );

  if (changed > 0) return input.compact ? 'Changed recently' : `${changed} students say this changed recently. Check newer replies.`;
  if (needs > 0) return input.compact ? 'Needs current context' : 'Needs current student update.';
  if (currentStudentReconfirmed) return input.compact ? 'Reconfirmed' : 'Reconfirmed by current students.';
  if (matches > 0) return input.compact ? 'Mostly matched by students' : `${matches} students say this matches their experience.`;
  if (branchSpecific > 0) return input.compact ? 'Branch-specific context' : `${branchSpecific} students say this may not apply to their branch.`;
  if (input.initialFreshness?.includes('Past')) return input.compact ? 'Needs current context' : 'Past experience. Needs current context.';
  if (input.initialFreshness?.includes('Reconfirmed')) return input.compact ? 'Reconfirmed' : 'Reconfirmed by current students.';

  return input.compact ? 'Context can be added' : 'Add community context to help future students understand where this applies.';
}

function readAll() {
  if (typeof window === 'undefined') return [] as CommunityContextRecord[];
  try {
    const raw = window.localStorage.getItem(COMMUNITY_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as CommunityContextRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: CommunityContextRecord[]) {
  window.localStorage.setItem(COMMUNITY_CONTEXT_KEY, JSON.stringify(records));
}
