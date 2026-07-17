import type { ExperiencePost, WhatWorksPost } from './types';

export const LOCAL_POST_EVENT = 'yorai-local-post-change';

const EXPERIENCES_KEY = 'yorai.localExperiences.v1';
const WHAT_WORKS_KEY = 'yorai.localWhatWorks.v1';

export type LocalExperience = ExperiencePost & { isLocal: true };
export type LocalWhatWorks = WhatWorksPost & { isLocal: true };

export function getLocalExperiences(collegeId: string) {
  return read<LocalExperience[]>(EXPERIENCES_KEY, []).filter((post) => post.collegeId === collegeId);
}

export function getAllLocalExperiences() {
  return read<LocalExperience[]>(EXPERIENCES_KEY, []);
}

export function getLocalWhatWorks(collegeId: string) {
  return read<LocalWhatWorks[]>(WHAT_WORKS_KEY, []).filter((post) => post.collegeId === collegeId);
}

export function getAllLocalWhatWorks() {
  return read<LocalWhatWorks[]>(WHAT_WORKS_KEY, []);
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
