import { answers, claimRealities, colleges, experiences, questions, users, whatWorksPosts } from './seed-data';
import { prisma } from './prisma';
import type { Answer, Question, ThreadReply } from './types';

export function getCollegeBySlug(slug: string) {
  return colleges.find((college) => college.slug === slug);
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
  const dbThreadIds = new Set(dbThreads.map((thread) => thread.id));
  return {
    questions: [
      ...dbThreads,
      ...questions
        .filter((question) => question.collegeId === collegeId && !dbThreadIds.has(question.id)),
    ].sort((a, b) => Date.parse(b.lastActiveDate) - Date.parse(a.lastActiveDate)),
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
    const thread = await prisma.question.findUnique({ where: { id: threadId }, include: { answers: { orderBy: { createdAt: 'desc' }, take: 2 } } });
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

export function getThreadReplies(threadId: string): ThreadReply[] {
  return answers
    .filter((answer) => answer.questionId === threadId)
    .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
    .map((answer) => toThreadReply(answer));
}

export async function getThreadRepliesWithDb(threadId: string): Promise<ThreadReply[]> {
  const seeded = getThreadReplies(threadId);
  try {
    const dbReplies = await prisma.answer.findMany({ where: { questionId: threadId }, orderBy: { createdAt: 'desc' } });
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
      where: { collegeId },
      include: { answers: { orderBy: { createdAt: 'desc' }, take: 2 } },
      orderBy: { lastActiveAt: 'desc' },
    });
    return dbThreads.map(toQuestion);
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
    status: thread.status === 'ANSWERED' ? 'ANSWERED' : 'OPEN',
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
}): ThreadReply {
  return {
    id: answer.id,
    questionId: answer.questionId,
    collegeId: answer.collegeId,
    userId: answer.userId,
    body: answer.body,
    branchContext: answer.branchContext ?? undefined,
    batchContext: answer.batchContext ?? undefined,
    studentTypeContext: answer.studentTypeContext,
    contextBadge: answer.contextBadge ?? undefined,
    communityContext: answer.communityContext ?? undefined,
    authorLabel: answer.speakerContext ?? answer.studentTypeContext,
    postedAt: answer.createdAt.toISOString().slice(0, 10),
    createdAt: answer.createdAt.toISOString().slice(0, 10),
    freshnessLabel: answer.trustLabel === 'Current student' ? 'Fresh student context' : 'Recent student context',
    speakerContext: answer.speakerContext ?? undefined,
    trustLabel: answer.trustLabel ?? undefined,
  };
}
