import type { Question, ThreadReply } from './types';

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

export function getLocalReplies(threadId: string) {
  return read<LocalReply[]>(REPLIES_KEY, [])
    .filter((reply) => reply.questionId === threadId)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
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
