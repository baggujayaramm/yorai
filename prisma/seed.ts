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

/**
 * Converts seed date strings into valid JavaScript Date objects.
 */
function toDateTime(
  value: Date | string | undefined,
  fieldName: string,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(
      `Invalid seed DateTime for ${fieldName}: ${value}`,
    );
  }

  return parsedDate;
}

/**
 * Converts Yorai seed roles into Prisma-generated UserRole values.
 *
 * The seed users currently contain:
 * ASPIRANT | CURRENT_STUDENT | ALUMNI
 */
function toPrismaUserRole(
  role: (typeof users)[number]['role'],
): PrismaUserRole {
  switch (role) {
    case 'ASPIRANT':
      return PrismaUserRole.ASPIRANT;

    case 'CURRENT_STUDENT':
      return PrismaUserRole.CURRENT_STUDENT;

    case 'ALUMNI':
      return PrismaUserRole.ALUMNI;
  }

  throw new Error(
    `Unsupported Yorai seed user role: ${String(role)}`,
  );
}

async function seedColleges(): Promise<void> {
  for (const college of colleges) {
    await prisma.college.upsert({
      where: {
        id: college.id,
      },

      update: {},

      create: college,
    });
  }
}

async function seedUsers(): Promise<void> {
  for (const user of users) {
    const userData: Prisma.UserUncheckedCreateInput = {
      id: user.id,

      name: user.name,
      email: user.email,

      anonymousDisplayName: user.anonymousDisplayName,

      role: toPrismaUserRole(user.role),

      verificationLevel: user.verificationLevel,

      collegeId: user.collegeId ?? null,

      branch: user.branch ?? null,
      batch: user.batch ?? null,
      year: user.year ?? null,

      hostelStatus: user.hostelStatus ?? null,

      interestedBranch: user.interestedBranch ?? null,
    };

    await prisma.user.upsert({
      where: {
        id: user.id,
      },

      update: {},

      create: userData,
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

      currentStudentSignal:
        question.currentStudentSignal,

      reconfirmationSignal:
        question.reconfirmationSignal,

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
        question.status as
          Prisma.QuestionUncheckedCreateInput['status'],
    };

    await prisma.question.upsert({
      where: {
        id: question.id,
      },

      update: {},

      create: questionData,
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

      studentTypeContext:
        answer.studentTypeContext,

      speakerContext: answer.speakerContext,

      trustLabel: answer.trustLabel,

      contextBadge: answer.contextBadge,

      communityContext:
        answer.communityContext,

      communityCounts:
        answer.communityCounts as
          | Prisma.InputJsonValue
          | undefined,

      createdAt: toDateTime(
        answer.createdAt,
        `answer.${answer.id}.createdAt`,
      ),
    };

    await prisma.answer.upsert({
      where: {
        id: answer.id,
      },

      update: {},

      create: answerData,
    });
  }
}

async function seedExperiences(): Promise<void> {
  for (const experience of experiences) {
    const experienceData: Prisma.ExperiencePostUncheckedCreateInput =
      {
        id: experience.id,

        collegeId: experience.collegeId,
        userId: experience.userId,

        title: experience.title,
        body: experience.body,

        category: experience.category,

        branch: experience.branch,

        batch: experience.batch,

        yearOrBatch:
          experience.yearOrBatch,

        hostelStatus:
          experience.hostelStatus,

        tags: experience.tags ?? [],

        whatWorked:
          experience.whatWorked,

        whatDidNotWork:
          experience.whatDidNotWork,

        advice: experience.advice,

        wishIKnewEarlier:
          experience.wishIKnewEarlier,

        actuallyWorksHere:
          experience.actuallyWorksHere,

        whoThisMayHelp:
          experience.whoThisMayHelp,

        communityContext:
          experience.communityContext,

        studentContext:
          experience.studentContext,

        freshnessLabel:
          experience.freshnessLabel,

        contextBadge:
          experience.contextBadge,

        recentChanges:
          experience.recentChanges,

        proofStatus:
          experience.proofStatus as
            Prisma.ExperiencePostUncheckedCreateInput['proofStatus'],
      };

    await prisma.experiencePost.upsert({
      where: {
        id: experience.id,
      },

      update: {},

      create: experienceData,
    });
  }
}

async function seedClaimRealities(): Promise<void> {
  for (const claim of claimRealities) {
    const claimData: Prisma.ClaimRealityUncheckedCreateInput =
      {
        id: claim.id,

        collegeId: claim.collegeId,

        claim: claim.claim,

        studentReality:
          claim.studentReality,

        category: claim.category,

        status:
          claim.status as
            Prisma.ClaimRealityUncheckedCreateInput['status'],
      };

    await prisma.claimReality.upsert({
      where: {
        id: claim.id,
      },

      update: {},

      create: claimData,
    });
  }
}

async function seedWhatWorksPosts(): Promise<void> {
  for (const post of whatWorksPosts) {
    const postData: Prisma.WhatWorksPostUncheckedCreateInput =
      {
        id: post.id,

        collegeId: post.collegeId,
        userId: post.userId,

        title: post.title,
        body: post.body,

        category: post.category,

        branch: post.branch,

        practicalAdvice:
          post.practicalAdvice,

        whyItHelps:
          post.whyItHelps,

        whoShouldKnow:
          post.whoShouldKnow,

        studentContext:
          post.studentContext,

        tags: post.tags ?? [],

        freshnessLabel:
          post.freshnessLabel,

        contextBadge:
          post.contextBadge,
      };

    await prisma.whatWorksPost.upsert({
      where: {
        id: post.id,
      },

      update: {},

      create: postData,
    });
  }
}

async function seedValidations(): Promise<void> {
  for (const validation of validations) {
    const validationData: Prisma.ValidationUncheckedCreateInput =
      {
        id: validation.id,

        targetType:
          validation.targetType as
            Prisma.ValidationUncheckedCreateInput['targetType'],

        targetId: validation.targetId,

        userId: validation.userId,

        validationType:
          validation.validationType as
            Prisma.ValidationUncheckedCreateInput['validationType'],
      };

    await prisma.validation.upsert({
      where: {
        id: validation.id,
      },

      update: {},

      create: validationData,
    });
  }
}

async function main(): Promise<void> {
  console.log(
    'Starting Yorai fictional seed...',
  );

  console.log('Seeding colleges...');
  await seedColleges();

  console.log('Seeding users...');
  await seedUsers();

  console.log('Seeding questions...');
  await seedQuestions();

  console.log('Seeding answers...');
  await seedAnswers();

  console.log(
    'Seeding student experiences...',
  );
  await seedExperiences();

  console.log(
    'Seeding claim realities...',
  );
  await seedClaimRealities();

  console.log(
    'Seeding what-works posts...',
  );
  await seedWhatWorksPosts();

  console.log('Seeding validations...');
  await seedValidations();

  console.log(
    'Yorai fictional seed completed successfully.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      'Yorai seed failed:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });