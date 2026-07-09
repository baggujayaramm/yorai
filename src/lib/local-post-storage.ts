import type { College, ExperiencePost, WhatWorksPost } from './types';
import { formatUserContext, getCurrentUserContext, trustLabelForRole } from './user-context-storage';

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

export function saveLocalExperience(college: College, input: {
  title: string;
  studentType: string;
  branch: string;
  yearOrBatch: string;
  hostelStatus: string;
  body: string;
  whatWorked: string;
  wishIKnewEarlier: string;
  recentChanges: string;
  whoThisMayHelp: string;
  tags: string[];
}) {
  const userContext = getCurrentUserContext();
  const speakerContext = formatUserContext(userContext);
  const trustLabel = trustLabelForRole(userContext.role);
  const post: LocalExperience = {
    id: `local-exp-${Date.now()}`,
    collegeId: college.id,
    userId: 'local-user',
    title: input.title,
    body: input.body,
    category: 'Student experience',
    branch: input.branch,
    batch: input.yearOrBatch,
    yearOrBatch: input.yearOrBatch,
    hostelStatus: input.hostelStatus,
    tags: input.tags,
    whatWorked: input.whatWorked,
    whatDidNotWork: 'Not framed as a complaint; context can be added in replies.',
    advice: input.whoThisMayHelp,
    wishIKnewEarlier: input.wishIKnewEarlier,
    actuallyWorksHere: input.whatWorked,
    whoThisMayHelp: input.whoThisMayHelp,
    communityContext: 'Fresh student context. Community context can be added.',
    studentContext: speakerContext || [input.studentType, input.branch, input.yearOrBatch, input.hostelStatus].filter(Boolean).join(' · '),
    trustLabel,
    freshnessLabel: 'Fresh student context',
    contextBadge: 'Context can be added',
    recentChanges: input.recentChanges,
    proofStatus: 'Context added',
    isLocal: true,
  };

  write(EXPERIENCES_KEY, [post, ...read<LocalExperience[]>(EXPERIENCES_KEY, [])]);
  notify();
  return post;
}

export function saveLocalWhatWorks(college: College, input: {
  title: string;
  category: string;
  branch: string;
  practicalAdvice: string;
  whyItHelps: string;
  whoShouldKnow: string;
  tags: string[];
}) {
  const userContext = getCurrentUserContext();
  const speakerContext = formatUserContext(userContext);
  const trustLabel = trustLabelForRole(userContext.role);
  const post: LocalWhatWorks = {
    id: `local-works-${Date.now()}`,
    collegeId: college.id,
    userId: 'local-user',
    title: input.title,
    body: input.practicalAdvice,
    category: input.category,
    branch: input.branch,
    practicalAdvice: input.practicalAdvice,
    whyItHelps: input.whyItHelps,
    whoShouldKnow: input.whoShouldKnow,
    studentContext: speakerContext || 'Student-added practical insight',
    trustLabel,
    tags: input.tags,
    freshnessLabel: 'Fresh student context',
    contextBadge: 'Context can be added',
    isLocal: true,
  };

  write(WHAT_WORKS_KEY, [post, ...read<LocalWhatWorks[]>(WHAT_WORKS_KEY, [])]);
  notify();
  return post;
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
  window.dispatchEvent(new Event(LOCAL_POST_EVENT));
}
