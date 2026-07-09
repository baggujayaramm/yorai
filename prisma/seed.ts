import { Prisma, PrismaClient } from '@prisma/client';
import { answers, claimRealities, colleges, experiences, questions, users, validations, whatWorksPosts } from '../src/lib/seed-data';

const prisma = new PrismaClient();

function toDateTime(value: Date | string | undefined, fieldName: string) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid seed DateTime for ${fieldName}: ${value}`);
  }

  return date;
}

async function main() {
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

  for (const college of colleges) {
    await prisma.college.create({ data: college });
  }

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

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
      lastActiveAt: toDateTime(question.lastActiveDate, `question.${question.id}.lastActiveDate`),
      createdAt: toDateTime(question.lastActiveDate, `question.${question.id}.createdAt`),
      status: question.status,
    };

    await prisma.question.create({
      data: questionData,
    });
  }

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
      communityCounts: answer.communityCounts as Prisma.InputJsonValue | undefined,
      createdAt: toDateTime(answer.createdAt, `answer.${answer.id}.createdAt`),
    };

    await prisma.answer.create({ data: answerData });
  }

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

    await prisma.experiencePost.create({ data: experienceData });
  }

  for (const claim of claimRealities) {
    const claimData: Prisma.ClaimRealityUncheckedCreateInput = {
      id: claim.id,
      collegeId: claim.collegeId,
      claim: claim.claim,
      studentReality: claim.studentReality,
      category: claim.category,
      status: claim.status,
    };

    await prisma.claimReality.create({ data: claimData });
  }

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

    await prisma.whatWorksPost.create({ data: postData });
  }

  for (const validation of validations) {
    const validationData: Prisma.ValidationUncheckedCreateInput = {
      id: validation.id,
      targetType: validation.targetType,
      targetId: validation.targetId,
      userId: validation.userId,
      validationType: validation.validationType,
    };

    await prisma.validation.create({ data: validationData });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
