export type UserRole = 'ASPIRANT' | 'CURRENT_STUDENT' | 'ALUMNI' | 'MODERATOR';

export type User = {
  id: string;
  name: string;
  email: string;
  anonymousDisplayName: string;
  role: UserRole;
  verificationLevel: number;
  collegeId?: string;
  branch?: string;
  batch?: string;
  year?: string;
  hostelStatus?: string;
  interestedBranch?: string;
};

export type College = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  officialWebsite: string;
  affiliation: string;
  courses: string[];
  feeRange: string;
  admissionModes: string[];
};

export type Question = {
  id: string;
  collegeId: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  branch?: string;
  status: 'OPEN' | 'ANSWERED';
  lastActivity: string;
  lastActiveDate: string;
  freshnessLabel: string;
  participantContext: string;
  topicTags: string[];
  latestReplies: string[];
  contextBadge?: string;
  speakerContext?: string;
  trustLabel?: string;
  attachment?: {
    label: string;
    status: string;
    description: string;
  };
  summary?: string;
  freshnessSummary?: string;
  currentStudentSignal: string;
  reconfirmationSignal: string;
  reportTone: string;
};

export type Answer = {
  id: string;
  questionId: string;
  collegeId: string;
  userId: string;
  body: string;
  branchContext?: string;
  batchContext?: string;
  studentTypeContext: string;
  createdAt?: string;
  contextBadge?: string;
  communityContext?: string;
  speakerContext?: string;
  trustLabel?: string;
  communityCounts?: Array<{
    label: string;
    count: number;
  }>;
};

export type ThreadReply = Answer & {
  authorLabel: string;
  postedAt: string;
  freshnessLabel: string;
};

export type ExperiencePost = {
  id: string;
  collegeId: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  branch?: string;
  batch?: string;
  yearOrBatch?: string;
  hostelStatus?: string;
  tags?: string[];
  whatWorked: string;
  whatDidNotWork: string;
  advice: string;
  wishIKnewEarlier: string;
  actuallyWorksHere: string;
  whoThisMayHelp: string;
  communityContext: string;
  studentContext: string;
  trustLabel?: string;
  freshnessLabel: string;
  contextBadge?: string;
  recentChanges?: string;
  proofStatus: string;
};

export type ClaimReality = {
  id: string;
  collegeId: string;
  claim: string;
  studentReality: string;
  category: string;
  status: 'CONFIRMED' | 'MIXED' | 'BRANCH_SPECIFIC' | 'RECENTLY_CHANGED' | 'NEEDS_MORE_RESPONSES' | 'DISPUTED' | 'OUTDATED';
};

export type WhatWorksPost = {
  id: string;
  collegeId: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  branch?: string;
  practicalAdvice?: string;
  whyItHelps?: string;
  whoShouldKnow?: string;
  studentContext?: string;
  trustLabel?: string;
  tags?: string[];
  freshnessLabel?: string;
  contextBadge?: string;
};

export type Validation = {
  id: string;
  targetType: 'ANSWER' | 'EXPERIENCE_POST' | 'CLAIM_REALITY' | 'WHAT_WORKS_POST';
  targetId: string;
  userId: string;
  validationType:
    | 'MATCHES_MY_EXPERIENCE'
    | 'PARTIALLY_TRUE'
    | 'NOT_TRUE_FOR_MY_BRANCH'
    | 'CHANGED_RECENTLY'
    | 'NEEDS_CONTEXT'
    | 'DISAGREE'
    | 'CAN_ADD_PROOF';
};
