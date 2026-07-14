import { Prisma, PrismaClient } from '@prisma/client';

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

  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid seed DateTime for ${fieldName}: ${value}`);
  }

  return date;
}

function toUserCreateInput(
  user: (typeof users)[number],
): Prisma.UserUncheckedCreateInput {
  const { collegeId, ...userData } = user;

  return {
    ...userData,
    ...(collegeId !== undefined ? { collegeId } : {}),
  };
}

async function clearSeedData(): Promise<void> {
  await prisma.savedInsight.deleteMany();
  await prisma.savedExperience.deleteMany();
  await prisma.watchedThread.deleteMany();
  await prisma.followedCollege.deleteMany();

  await prisma.contextAttachment.deleteMany();
  await prisma.proofAttachment.deleteMany();
  await prisma.contextAction.deleteMany();

  await prisma.report.deleteMany();
  await prisma.validation.deleteMany();

  await prisma.whatWorksPost.deleteMany();
  await prisma.claimReality.deleteMany();
  await prisma.experiencePost.deleteMany();

  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();

  await prisma.user.deleteMany();
  await prisma.college.deleteMany();
}

async function seedColleges(): Promise<void> {
  for (const college of colleges) {
    await prisma.college.create({
      data: college,
    });
  }
}

async function seedUsers(): Promise<void> {
  for (const user of users) {
    const userData = toUserCreateInput(user);

    await prisma.user.create({
      data: userData,
    });
  }
}

async function seedQuestions(): Promise<void> {
  for (const question of questions) {
    const questionData: Prisma.QuestionUncheckedCreateInput = {
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
      status: question.status,
    };

    await prisma.question.create({
      data: questionData,
    });
  }
}

async function seedAnswers(): Promise<void> {
  for (const answer of answers) {
    const answerData: Prisma.AnswerUncheckedCreateInput = {
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
        answer.communityCounts as Prisma.InputJsonValue | undefined,
      createdAt: toDateTime(
        answer.createdAt,
        `answer.${answer.id}.createdAt`,
      ),
    };

    await prisma.answer.create({
      data: answerData,
    });
  }
}

async function seedExperiences(): Promise<void> {
  for (const experience of experiences) {
    const experienceData: Prisma.ExperiencePostUncheckedCreateInput = {
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
      proofStatus: experience.proofStatus,
    };

    await prisma.experiencePost.create({
      data: experienceData,
    });
  }
}

async function seedClaimRealities(): Promise<void> {
  for (const claim of claimRealities) {
    const claimData: Prisma.ClaimRealityUncheckedCreateInput = {
      id: claim.id,
      collegeId: claim.collegeId,
      claim: claim.claim,
      studentReality: claim.studentReality,
      category: claim.category,
      status: claim.status,
    };

    await prisma.claimReality.create({
      data: claimData,
    });
  }
}

async function seedWhatWorksPosts(): Promise<void> {
  for (const post of whatWorksPosts) {
    const postData: Prisma.WhatWorksPostUncheckedCreateInput = {
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
    };

    await prisma.whatWorksPost.create({
      data: postData,
    });
  }
}

async function seedValidations(): Promise<void> {
  for (const validation of validations) {
    const validationData: Prisma.ValidationUncheckedCreateInput = {
      id: validation.id,
      targetType: validation.targetType,
      targetId: validation.targetId,
      userId: validation.userId,
      validationType: validation.validationType,
    };

    await prisma.validation.create({
      data: validationData,
    });
  }
}

async function main(): Promise<void> {
  console.log('Clearing existing fictional seed data...');
  await clearSeedData();

  console.log('Seeding colleges...');
  await seedColleges();

  console.log('Seeding users...');
  await seedUsers();

  console.log('Seeding questions...');
  await seedQuestions();

  console.log('Seeding answers...');
  await seedAnswers();

  console.log('Seeding student experiences...');
  await seedExperiences();

  console.log('Seeding claim realities...');
  await seedClaimRealities();

  console.log('Seeding what-works posts...');
  await seedWhatWorksPosts();

  console.log('Seeding validations...');
  await seedValidations();

  console.log('Yorai fictional seed data completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Yorai seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });