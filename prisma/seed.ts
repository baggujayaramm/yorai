import {
  Prisma,
  PrismaClient,
  UserRole as PrismaUserRole,
} from '@prisma/client';

import {
  answers,
  claimRealities,
  colleges,
  experiences,
  questions,
  users,
  validations,
  whatWorksPosts,
} from '../src/lib/seed-data';

const prisma = new PrismaClient();

function toDateTime(
  value: Date | string | undefined,
  fieldName: string,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid seed DateTime for ${fieldName}: ${value}`,
    );
  }

  return date;
}

function createCollegeSeedData(): Prisma.CollegeCreateManyInput[] {
  return colleges.map(
    (college) =>
      ({
        ...college,
      }) as Prisma.CollegeCreateManyInput,
  );
}

function createUserSeedData(): Prisma.UserCreateManyInput[] {
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    anonymousDisplayName: user.anonymousDisplayName,

    /*
     * The role in src/lib/seed-data represents student context:
     * ASPIRANT | CURRENT_STUDENT | ALUMNI.
     *
     * Prisma UserRole represents account permissions:
     * USER | MODERATOR | ADMIN.
     *
     * They must not be mapped to each other.
     */
    role: PrismaUserRole.USER,

    verificationLevel: user.verificationLevel,

    collegeId: user.collegeId ?? null,
    branch: user.branch ?? null,
    batch: user.batch ?? null,
    year: user.year ?? null,
    hostelStatus: user.hostelStatus ?? null,
    interestedBranch: user.interestedBranch ?? null,
  }));
}

function createQuestionSeedData(): Prisma.QuestionCreateManyInput[] {
  return questions.map((question) => ({
    id: question.id,
    collegeId: question.collegeId,
    userId: question.userId,

    title: question.title,
    body: question.body,

    category: question.category,
    branch: question.branch,
    branchYearContext: question.branch,

    topicTags: question.topicTags,

    freshnessLabel: question.freshnessLabel,
    participantContext: question.participantContext,
    contextBadge: question.contextBadge,

    currentStudentSignal: question.currentStudentSignal,
    reconfirmationSignal: question.reconfirmationSignal,

    speakerContext: question.speakerContext,
    trustLabel: question.trustLabel,

    lastActiveAt: toDateTime(
      question.lastActiveDate,
      `question.${question.id}.lastActiveDate`,
    ),

    createdAt: toDateTime(
      question.lastActiveDate,
      `question.${question.id}.createdAt`,
    ),

    status:
      question.status as Prisma.QuestionCreateManyInput['status'],
  }));
}

function createAnswerSeedData(): Prisma.AnswerCreateManyInput[] {
  return answers.map((answer) => ({
    id: answer.id,

    questionId: answer.questionId,
    collegeId: answer.collegeId,
    userId: answer.userId,

    body: answer.body,

    branchContext: answer.branchContext,
    batchContext: answer.batchContext,
    studentTypeContext: answer.studentTypeContext,

    speakerContext: answer.speakerContext,
    trustLabel: answer.trustLabel,
    contextBadge: answer.contextBadge,

    communityContext: answer.communityContext,

    communityCounts:
      answer.communityCounts as
        | Prisma.InputJsonValue
        | undefined,

    createdAt: toDateTime(
      answer.createdAt,
      `answer.${answer.id}.createdAt`,
    ),
  }));
}

function createExperienceSeedData(): Prisma.ExperiencePostCreateManyInput[] {
  return experiences.map((experience) => ({
    id: experience.id,

    collegeId: experience.collegeId,
    userId: experience.userId,

    title: experience.title,
    body: experience.body,

    category: experience.category,

    branch: experience.branch,
    batch: experience.batch,
    yearOrBatch: experience.yearOrBatch,
    hostelStatus: experience.hostelStatus,

    tags: experience.tags ?? [],

    whatWorked: experience.whatWorked,
    whatDidNotWork: experience.whatDidNotWork,

    advice: experience.advice,
    wishIKnewEarlier: experience.wishIKnewEarlier,

    actuallyWorksHere: experience.actuallyWorksHere,
    whoThisMayHelp: experience.whoThisMayHelp,

    communityContext: experience.communityContext,
    studentContext: experience.studentContext,

    freshnessLabel: experience.freshnessLabel,
    contextBadge: experience.contextBadge,

    recentChanges: experience.recentChanges,

    proofStatus:
      experience.proofStatus as
        Prisma.ExperiencePostCreateManyInput['proofStatus'],
  }));
}

function createClaimRealitySeedData(): Prisma.ClaimRealityCreateManyInput[] {
  return claimRealities.map((claim) => ({
    id: claim.id,

    collegeId: claim.collegeId,

    claim: claim.claim,
    studentReality: claim.studentReality,

    category: claim.category,

    status:
      claim.status as
        Prisma.ClaimRealityCreateManyInput['status'],
  }));
}

function createWhatWorksSeedData(): Prisma.WhatWorksPostCreateManyInput[] {
  return whatWorksPosts.map((post) => ({
    id: post.id,

    collegeId: post.collegeId,
    userId: post.userId,

    title: post.title,
    body: post.body,

    category: post.category,

    branch: post.branch,

    practicalAdvice: post.practicalAdvice,
    whyItHelps: post.whyItHelps,
    whoShouldKnow: post.whoShouldKnow,

    studentContext: post.studentContext,

    tags: post.tags ?? [],

    freshnessLabel: post.freshnessLabel,
    contextBadge: post.contextBadge,
  }));
}

function createValidationSeedData(): Prisma.ValidationCreateManyInput[] {
  return validations.map((validation) => ({
    id: validation.id,

    targetType:
      validation.targetType as
        Prisma.ValidationCreateManyInput['targetType'],

    targetId: validation.targetId,
    userId: validation.userId,

    validationType:
      validation.validationType as
        Prisma.ValidationCreateManyInput['validationType'],
  }));
}

async function seedColleges(): Promise<number> {
  const result = await prisma.college.createMany({
    data: createCollegeSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedUsers(): Promise<number> {
  const result = await prisma.user.createMany({
    data: createUserSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedQuestions(): Promise<number> {
  const result = await prisma.question.createMany({
    data: createQuestionSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedAnswers(): Promise<number> {
  const result = await prisma.answer.createMany({
    data: createAnswerSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedExperiences(): Promise<number> {
  const result = await prisma.experiencePost.createMany({
    data: createExperienceSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedClaimRealities(): Promise<number> {
  const result = await prisma.claimReality.createMany({
    data: createClaimRealitySeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedWhatWorksPosts(): Promise<number> {
  const result = await prisma.whatWorksPost.createMany({
    data: createWhatWorksSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function seedValidations(): Promise<number> {
  const result = await prisma.validation.createMany({
    data: createValidationSeedData(),
    skipDuplicates: true,
  });

  return result.count;
}

async function main(): Promise<void> {
  console.log('Starting Yorai fictional seed...');

  const collegesCreated = await seedColleges();
  console.log(`Colleges created: ${collegesCreated}`);

  const usersCreated = await seedUsers();
  console.log(`Users created: ${usersCreated}`);

  const questionsCreated = await seedQuestions();
  console.log(`Questions created: ${questionsCreated}`);

  const answersCreated = await seedAnswers();
  console.log(`Answers created: ${answersCreated}`);

  const experiencesCreated = await seedExperiences();
  console.log(`Experiences created: ${experiencesCreated}`);

  const claimsCreated = await seedClaimRealities();
  console.log(`Claim realities created: ${claimsCreated}`);

  const whatWorksCreated = await seedWhatWorksPosts();
  console.log(`What-works posts created: ${whatWorksCreated}`);

  const validationsCreated = await seedValidations();
  console.log(`Validations created: ${validationsCreated}`);

  console.log('Yorai fictional seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Yorai seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });