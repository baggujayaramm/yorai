import type { College, Question, ThreadReply } from './types';
import { formatUserContext, getCurrentUserContext, trustLabelForRole } from './user-context-storage';

export const LOCAL_THREAD_EVENT = 'yorai-local-threads-change';

const THREADS_KEY = 'yorai.localThreads.v1';
const REPLIES_KEY = 'yorai.localReplies.v1';

export type LocalThread = Question & {
  isLocal: true;
};

export type LocalReply = ThreadReply & {
  isLocal: true;
};

export type LocalThreadDraft = {
  title: string;
  context: string;
  tags: string[];
  body: string;
};

export function getLocalThreads() {
  return read<LocalThread[]>(THREADS_KEY, []);
}

export function getLocalThreadsForCollege(collegeId: string) {
  return getLocalThreads()
    .filter((thread) => thread.collegeId === collegeId)
    .sort((a, b) => Date.parse(b.lastActiveDate) - Date.parse(a.lastActiveDate));
}

export function getLocalThread(threadId: string) {
  return getLocalThreads().find((thread) => thread.id === threadId);
}

export function saveLocalThread(college: College, draft: LocalThreadDraft) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const id = `local-${now.getTime()}`;
  const userContext = getCurrentUserContext();
  const speakerContext = formatUserContext(userContext);
  const trustLabel = trustLabelForRole(userContext.role);
  const contextParts = draft.context
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const thread: LocalThread = {
    id,
    collegeId: college.id,
    userId: 'local-user',
    title: draft.title,
    body: draft.body,
    category: draft.tags[0] ?? 'Student context',
    branch: contextParts[0],
    status: 'OPEN',
    lastActivity: 'Just now',
    lastActiveDate: date,
    freshnessLabel: 'Fresh student context',
    participantContext: `${speakerContext || trustLabel} started this thread. Awaiting student context.`,
    topicTags: draft.tags,
    latestReplies: ['Awaiting student context'],
    contextBadge: 'Context added',
    speakerContext,
    trustLabel,
    currentStudentSignal: trustLabel === 'Current student' ? 'Current student' : 'Awaiting student context',
    reconfirmationSignal: 'Recently active',
    reportTone: 'Report concern',
    isLocal: true,
  };

  write(THREADS_KEY, [thread, ...getLocalThreads()]);
  notify();
  return thread;
}

export function getLocalReplies(threadId: string) {
  return read<LocalReply[]>(REPLIES_KEY, [])
    .filter((reply) => reply.questionId === threadId)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

export function saveLocalReply(input: {
  threadId: string;
  collegeId: string;
  role: string;
  context: string;
  body: string;
  attachmentLabel?: string;
}) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const userContext = getCurrentUserContext();
  const speakerContext = formatUserContext(userContext);
  const trustLabel = trustLabelForRole(userContext.role);
  const reply: LocalReply = {
    id: `local-reply-${now.getTime()}`,
    questionId: input.threadId,
    collegeId: input.collegeId,
    userId: 'local-user',
    body: input.body,
    branchContext: input.context || undefined,
    batchContext: undefined,
    studentTypeContext: trustLabel,
    createdAt: date,
    contextBadge: input.attachmentLabel ? 'Context attached' : 'Context added',
    communityContext: trustLabel === 'Current student' ? 'Fresh student context' : 'I can add context',
    speakerContext: speakerContext || input.context,
    trustLabel,
    authorLabel: speakerContext || trustLabel,
    postedAt: date,
    freshnessLabel: trustLabel === 'Current student' ? 'Fresh student context' : 'Recent student context',
    isLocal: true,
  };

  write(REPLIES_KEY, [reply, ...read<LocalReply[]>(REPLIES_KEY, [])]);
  touchLocalThread(input.threadId, reply);
  notify();
  return reply;
}

function touchLocalThread(threadId: string, reply: LocalReply) {
  const threads = getLocalThreads();
  const nextThreads = threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    return {
      ...thread,
      status: 'ANSWERED' as const,
      lastActivity: 'Just now',
      lastActiveDate: reply.postedAt,
      currentStudentSignal: reply.trustLabel === 'Current student' ? 'Current students responding' : 'Recently active',
      participantContext: `${thread.participantContext} New ${reply.studentTypeContext.toLowerCase()} reply added.`,
      latestReplies: [`${reply.studentTypeContext}: ${reply.body}`, ...thread.latestReplies].slice(0, 3),
    };
  });
  write(THREADS_KEY, nextThreads);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function notify() {
  window.dispatchEvent(new Event(LOCAL_THREAD_EVENT));
}
