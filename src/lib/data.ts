import { answers, claimRealities, colleges, experiences, questions, users, whatWorksPosts } from './seed-data';
import { prisma } from './prisma';
import type { Answer, ExperiencePost, Question, ThreadReply, WhatWorksPost } from './types';
import { toPublicCollege } from './college-search';

export function getCollegeBySlug(slug: string) {
  return colleges.find((college) => college.slug === slug);
}

export async function getCollegeBySlugWithDb(slug: string) {
  const seeded = getCollegeBySlug(slug);
  if (seeded) return seeded;

  try {
    const college = await prisma.college.findFirst({ where: { slug, recordStatus: 'PUBLISHED' } });
    return college ? toPublicCollege(college) : undefined;
  } catch {
    return undefined;
  }
}

export function getCollegeStats(collegeId: string) {
  return {
    questions: questions.filter((question) => question.collegeId === collegeId).length,
    answered: questions.filter((question) => question.collegeId === collegeId && question.status === 'ANSWERED').length,
    experiences: experiences.filter((post) => post.collegeId === collegeId).length,
    contextAdded: experiences.filter((post) => post.collegeId === collegeId && post.proofStatus !== 'Open experience').length,
  };
}

export function getCollegeActivity(collegeId: string) {
  const recent = questions.find((question) => question.collegeId === collegeId)?.lastActivity;
  return recent ? `Active ${recent}` : 'Needs more recent responses';
}

export async function getCollegeProfileData(collegeId: string) {
  const dbThreads = await getDbThreadsForCollege(collegeId);
  const [dbExperiences, dbWhatWorks] = await Promise.all([
    getDbExperiencesForCollege(collegeId),
    getDbWhatWorksForCollege(collegeId),
  ]);
  const dbThreadIds = new Set(dbThreads.map((thread) => thread.id));
  const dbExperienceIds = new Set(dbExperiences.map((post) => post.id));
  const dbWhatWorksIds = new Set(dbWhatWorks.map((post) => post.id));
  return {
    questions: [
      ...dbThreads,
      ...questions
        .filter((question) => question.collegeId === collegeId && !dbThreadIds.has(question.id)),
    ].sort((a, b) => Date.parse(b.lastActiveDate) - Date.parse(a.lastActiveDate)),
    answers: answers.filter((answer) => answer.collegeId === collegeId),
    experiences: experiences
      .filter((post) => post.collegeId === collegeId && !dbExperienceIds.has(post.id))
      .concat(dbExperiences)
      .sort((a, b) => freshnessRank(a.freshnessLabel) - freshnessRank(b.freshnessLabel)),
    claims: claimRealities.filter((claim) => claim.collegeId === collegeId),
    whatWorks: whatWorksPosts
      .filter((post) => post.collegeId === collegeId && !dbWhatWorksIds.has(post.id))
      .concat(dbWhatWorks)
      .sort((a, b) => freshnessRank(a.freshnessLabel) - freshnessRank(b.freshnessLabel)),
  };
}

export function getSeedCollegeProfileData(collegeId: string) {
  return {
    questions: questions
      .filter((question) => question.collegeId === collegeId)
      .sort((a, b) => Date.parse(b.lastActiveDate) - Date.parse(a.lastActiveDate)),
    answers: answers.filter((answer) => answer.collegeId === collegeId),
    experiences: experiences
      .filter((post) => post.collegeId === collegeId)
      .sort((a, b) => freshnessRank(a.freshnessLabel) - freshnessRank(b.freshnessLabel)),
    claims: claimRealities.filter((claim) => claim.collegeId === collegeId),
    whatWorks: whatWorksPosts
      .filter((post) => post.collegeId === collegeId)
      .sort((a, b) => freshnessRank(a.freshnessLabel) - freshnessRank(b.freshnessLabel)),
  };
}

export function getThreadsForCollege(collegeId: string) {
  return questions
    .filter((question) => question.collegeId === collegeId)
    .sort((a, b) => threadRank(a.freshnessLabel) - threadRank(b.freshnessLabel) || Date.parse(b.lastActiveDate) - Date.parse(a.lastActiveDate));
}

export function getThreadById(threadId: string) {
  return questions.find((question) => question.id === threadId);
}

export async function getThreadByIdWithDb(threadId: string) {
  try {
    const thread = await prisma.question.findFirst({ where: { id: threadId, visibility: 'VISIBLE' }, include: { answers: { where: { visibility: 'VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 2 } } });
    if (thread) return toQuestion(thread);
  } catch {
    return getThreadById(threadId);
  }

  return getThreadById(threadId);
}

export function getExperienceById(experienceId: string) {
  return experiences.find((experience) => experience.id === experienceId);
}

export function getWhatWorksById(postId: string) {
  return whatWorksPosts.find((post) => post.id === postId);
}

export async function getExperienceByIdWithDb(experienceId: string) {
  const seeded = getExperienceById(experienceId);
  if (seeded) return { experience: seeded, college: colleges.find((item) => item.id === seeded.collegeId) };
  const record = await prisma.experiencePost.findFirst({ where: { id: experienceId, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' }, include: { college: true } }).catch(() => null);
  if (!record || record.college.recordStatus !== 'PUBLISHED') return null;
  return {
    experience: (await getDbExperiencesForCollege(record.collegeId)).find((item) => item.id === record.id),
    college: toPublicCollege(record.college),
  };
}

export async function getWhatWorksByIdWithDb(postId: string) {
  const seeded = getWhatWorksById(postId);
  if (seeded) return { post: seeded, college: colleges.find((item) => item.id === seeded.collegeId) };
  const record = await prisma.whatWorksPost.findFirst({ where: { id: postId, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' }, include: { college: true } }).catch(() => null);
  if (!record || record.college.recordStatus !== 'PUBLISHED') return null;
  return {
    post: (await getDbWhatWorksForCollege(record.collegeId)).find((item) => item.id === record.id),
    college: toPublicCollege(record.college),
  };
}

export function getThreadReplies(threadId: string): ThreadReply[] {
  return answers
    .filter((answer) => answer.questionId === threadId)
    .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
    .map((answer) => toThreadReply(answer));
}

export async function getThreadRepliesWithDb(threadId: string): Promise<ThreadReply[]> {
  const seeded = getThreadReplies(threadId);
  try {
    const dbReplies = await prisma.answer.findMany({ where: { questionId: threadId, visibility: 'VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 100 });
    const dbReplyIds = new Set(dbReplies.map((reply) => reply.id));
    return [
      ...dbReplies.map(toDbThreadReply),
      ...seeded.filter((reply) => !dbReplyIds.has(reply.id)),
    ];
  } catch {
    return seeded;
  }
}

export function getThreadAuthorName(userId: string) {
  return users.find((user) => user.id === userId)?.anonymousDisplayName ?? 'Student voice';
}

export const communityContextOptions = [
  'Matches my experience',
  'Partly true',
  'Not true for my branch',
  'Changed recently',
  'Needs more context',
  'I can add context',
  'Current students should update this',
];

function freshnessRank(label = '') {
  if (label.includes('Fresh')) return 0;
  if (label.includes('Reconfirmed')) return 1;
  if (label.includes('Recent')) return 2;
  if (label.includes('Needs current')) return 3;
  return 4;
}

function threadRank(label = '') {
  if (label.includes('Fresh') || label.includes('Updated')) return 0;
  if (label.includes('Reconfirmed')) return 1;
  if (label.includes('Recent')) return 2;
  if (label.includes('Needs current')) return 3;
  if (label.includes('Past')) return 4;
  return 5;
}

function toThreadReply(answer: Answer): ThreadReply {
  const speakerContext = [answer.studentTypeContext, answer.branchContext, answer.batchContext]
    .filter(Boolean)
    .join(' · ');

  return {
    ...answer,
    authorLabel: getThreadAuthorName(answer.userId),
    postedAt: answer.createdAt ?? '2026-07-01',
    freshnessLabel: answer.studentTypeContext === 'Current student' ? 'Fresh student context' : 'Past experience',
    speakerContext,
    trustLabel: answer.studentTypeContext,
  };
}

async function getDbThreadsForCollege(collegeId: string): Promise<Question[]> {
  try {
    const dbThreads = await prisma.question.findMany({
      where: { collegeId, visibility: 'VISIBLE' },
      include: { answers: { where: { visibility: 'VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 2 } },
      orderBy: { lastActiveAt: 'desc' },
    });
    return dbThreads.map(toQuestion);
  } catch {
    return [];
  }
}

async function getDbExperiencesForCollege(collegeId: string): Promise<ExperiencePost[]> {
  try {
    const records = await prisma.experiencePost.findMany({
      where: { collegeId, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return records.map((post) => ({
      id: post.id,
      collegeId: post.collegeId,
      userId: post.userId,
      title: post.title,
      body: post.body,
      category: post.category,
      branch: post.branch ?? undefined,
      batch: post.batch ?? undefined,
      yearOrBatch: post.yearOrBatch ?? undefined,
      hostelStatus: post.hostelStatus ?? undefined,
      tags: post.tags,
      whatWorked: post.whatWorked,
      whatDidNotWork: post.whatDidNotWork,
      advice: post.advice,
      wishIKnewEarlier: post.wishIKnewEarlier,
      actuallyWorksHere: post.actuallyWorksHere,
      whoThisMayHelp: post.whoThisMayHelp,
      communityContext: post.communityContext,
      studentContext: post.studentContext,
      trustLabel: post.trustLabel ?? undefined,
      freshnessLabel: post.freshnessLabel ?? 'Fresh',
      contextBadge: post.contextBadge ?? undefined,
      recentChanges: post.recentChanges ?? undefined,
      proofStatus: post.proofStatus,
    }));
  } catch {
    return [];
  }
}

async function getDbWhatWorksForCollege(collegeId: string): Promise<WhatWorksPost[]> {
  try {
    const records = await prisma.whatWorksPost.findMany({
      where: { collegeId, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return records.map((post) => ({
      id: post.id,
      collegeId: post.collegeId,
      userId: post.userId,
      title: post.title,
      body: post.body,
      category: post.category,
      branch: post.branch ?? undefined,
      practicalAdvice: post.practicalAdvice ?? undefined,
      whyItHelps: post.whyItHelps ?? undefined,
      whoShouldKnow: post.whoShouldKnow ?? undefined,
      studentContext: post.studentContext ?? undefined,
      trustLabel: post.trustLabel ?? undefined,
      tags: post.tags,
      freshnessLabel: post.freshnessLabel ?? 'Fresh',
      contextBadge: post.contextBadge ?? undefined,
    }));
  } catch {
    return [];
  }
}

function toQuestion(thread: {
  id: string;
  collegeId: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  branch: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  branchYearContext?: string | null;
  topicTags?: string[];
  freshnessLabel?: string | null;
  participantContext?: string | null;
  contextBadge?: string | null;
  currentStudentSignal?: string | null;
  reconfirmationSignal?: string | null;
  speakerContext?: string | null;
  trustLabel?: string | null;
  lastActiveAt?: Date;
  answers?: Array<{ studentTypeContext: string; body: string }>;
}): Question {
  const lastActiveAt = thread.lastActiveAt ?? thread.updatedAt;
  return {
    id: thread.id,
    collegeId: thread.collegeId,
    userId: thread.userId,
    title: thread.title,
    body: thread.body,
    category: thread.category,
    branch: thread.branch ?? thread.branchYearContext ?? undefined,
    status: ['OPEN', 'ACTIVE', 'ANSWERED', 'CLOSED', 'ARCHIVED'].includes(thread.status) ? thread.status as Question['status'] : 'OPEN',
    lastActivity: 'Recently active',
    lastActiveDate: lastActiveAt.toISOString().slice(0, 10),
    freshnessLabel: thread.freshnessLabel ?? 'Fresh student context',
    participantContext: thread.participantContext ?? 'Student context added by demo user.',
    topicTags: thread.topicTags ?? [],
    latestReplies: (thread.answers ?? []).map((answer) => `${answer.studentTypeContext}: ${answer.body}`),
    contextBadge: thread.contextBadge ?? undefined,
    currentStudentSignal: thread.currentStudentSignal ?? 'Recently active',
    reconfirmationSignal: thread.reconfirmationSignal ?? 'Recently active',
    reportTone: 'Report concern',
    speakerContext: thread.speakerContext ?? undefined,
    trustLabel: thread.trustLabel ?? undefined,
  };
}

function toDbThreadReply(answer: {
  id: string;
  questionId: string;
  collegeId: string;
  userId: string;
  body: string;
  branchContext: string | null;
  batchContext: string | null;
  studentTypeContext: string;
  contextBadge: string | null;
  communityContext: string | null;
  createdAt: Date;
  speakerContext: string | null;
  trustLabel: string | null;
  editedAt?: Date | null;
  deletedAt?: Date | null;
}): ThreadReply {
  const removed = Boolean(answer.deletedAt);
  return {
    id: answer.id,
    questionId: answer.questionId,
    collegeId: answer.collegeId,
    userId: answer.userId,
    body: removed ? 'This reply was removed but the thread structure is preserved.' : answer.body,
    branchContext: answer.branchContext ?? undefined,
    batchContext: answer.batchContext ?? undefined,
    studentTypeContext: answer.studentTypeContext,
    contextBadge: answer.contextBadge ?? undefined,
    communityContext: answer.communityContext ?? undefined,
    authorLabel: answer.speakerContext ?? answer.studentTypeContext,
    postedAt: answer.createdAt.toISOString().slice(0, 10),
    createdAt: answer.createdAt.toISOString().slice(0, 10),
    editedAt: answer.editedAt?.toISOString().slice(0, 10),
    deletedAt: answer.deletedAt?.toISOString().slice(0, 10),
    freshnessLabel: removed ? 'Past experience' : answer.trustLabel === 'Current student' ? 'Fresh student context' : 'Recent student context',
    speakerContext: answer.speakerContext ?? undefined,
    trustLabel: answer.trustLabel ?? undefined,
  };
}
