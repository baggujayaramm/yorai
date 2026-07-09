-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ASPIRANT', 'CURRENT_STUDENT', 'ALUMNI', 'MODERATOR', 'COLLEGE_REP');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED', 'DISPUTED', 'OUTDATED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('CONFIRMED', 'MIXED', 'BRANCH_SPECIFIC', 'RECENTLY_CHANGED', 'NEEDS_MORE_RESPONSES', 'DISPUTED', 'OUTDATED');

-- CreateEnum
CREATE TYPE "ValidationTargetType" AS ENUM ('QUESTION', 'ANSWER', 'EXPERIENCE_POST', 'CLAIM_REALITY', 'WHAT_WORKS_POST');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('MATCHES_MY_EXPERIENCE', 'PARTIALLY_TRUE', 'NOT_TRUE_FOR_MY_BRANCH', 'CHANGED_RECENTLY', 'NEEDS_CONTEXT', 'DISAGREE', 'CAN_ADD_PROOF');

-- CreateEnum
CREATE TYPE "ProofVisibility" AS ENUM ('PUBLIC', 'MODERATOR_ONLY', 'SUMMARY_ONLY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContextAttachmentTargetType" AS ENUM ('THREAD', 'REPLY', 'EXPERIENCE', 'INSIGHT');

-- CreateEnum
CREATE TYPE "ContextAttachmentVisibility" AS ENUM ('MODERATOR_ONLY', 'SUMMARY_ONLY', 'PUBLIC_AFTER_REVIEW');

-- CreateEnum
CREATE TYPE "ContextAttachmentModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REDACTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "anonymousDisplayName" TEXT,
    "role" "UserRole" NOT NULL,
    "verificationLevel" INTEGER NOT NULL DEFAULT 1,
    "collegeId" TEXT,
    "branch" TEXT,
    "batch" TEXT,
    "year" TEXT,
    "hostelStatus" TEXT,
    "interestedBranch" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "College" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "officialWebsite" TEXT NOT NULL,
    "affiliation" TEXT NOT NULL,
    "courses" TEXT[],
    "feeRange" TEXT,
    "admissionModes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branch" TEXT,
    "branchYearContext" TEXT,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "freshnessLabel" TEXT,
    "participantContext" TEXT,
    "contextBadge" TEXT,
    "currentStudentSignal" TEXT,
    "reconfirmationSignal" TEXT,
    "speakerContext" TEXT,
    "trustLabel" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "branchContext" TEXT,
    "batchContext" TEXT,
    "studentTypeContext" TEXT NOT NULL,
    "speakerContext" TEXT,
    "trustLabel" TEXT,
    "contextBadge" TEXT,
    "communityContext" TEXT,
    "communityCounts" JSONB,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperiencePost" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branch" TEXT,
    "batch" TEXT,
    "yearOrBatch" TEXT,
    "hostelStatus" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatWorked" TEXT NOT NULL,
    "whatDidNotWork" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "wishIKnewEarlier" TEXT NOT NULL,
    "actuallyWorksHere" TEXT NOT NULL,
    "whoThisMayHelp" TEXT NOT NULL,
    "communityContext" TEXT NOT NULL,
    "studentContext" TEXT NOT NULL,
    "freshnessLabel" TEXT,
    "contextBadge" TEXT,
    "recentChanges" TEXT,
    "proofStatus" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperiencePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimReality" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "studentReality" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimReality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatWorksPost" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branch" TEXT,
    "practicalAdvice" TEXT,
    "whyItHelps" TEXT,
    "whoShouldKnow" TEXT,
    "studentContext" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "freshnessLabel" TEXT,
    "contextBadge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatWorksPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "targetType" "ValidationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "validationType" "ValidationType" NOT NULL,
    "optionalComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextAction" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userContext" TEXT,
    "userRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContextAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofAttachment" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "visibility" "ProofVisibility" NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "privacyChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextAttachment" (
    "id" TEXT NOT NULL,
    "targetType" "ContextAttachmentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "visibility" "ContextAttachmentVisibility" NOT NULL DEFAULT 'MODERATOR_ONLY',
    "moderationStatus" "ContextAttachmentModerationStatus" NOT NULL DEFAULT 'PENDING',
    "privacyChecked" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "moderatorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "moderatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowedCollege" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedCollege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "College_slug_key" ON "College"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContextAction_targetType_targetId_actionType_userId_key" ON "ContextAction"("targetType", "targetId", "actionType", "userId");

-- CreateIndex
CREATE INDEX "ContextAttachment_targetType_targetId_idx" ON "ContextAttachment"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowedCollege_userId_collegeId_key" ON "FollowedCollege"("userId", "collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedThread_userId_threadId_key" ON "WatchedThread"("userId", "threadId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedExperience_userId_experienceId_key" ON "SavedExperience"("userId", "experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedInsight_userId_insightId_key" ON "SavedInsight"("userId", "insightId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePost" ADD CONSTRAINT "ExperiencePost_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePost" ADD CONSTRAINT "ExperiencePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimReality" ADD CONSTRAINT "ClaimReality_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatWorksPost" ADD CONSTRAINT "WhatWorksPost_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatWorksPost" ADD CONSTRAINT "WhatWorksPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextAction" ADD CONSTRAINT "ContextAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofAttachment" ADD CONSTRAINT "ProofAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextAttachment" ADD CONSTRAINT "ContextAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedCollege" ADD CONSTRAINT "FollowedCollege_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedCollege" ADD CONSTRAINT "FollowedCollege_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedThread" ADD CONSTRAINT "WatchedThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedThread" ADD CONSTRAINT "WatchedThread_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "ExperiencePost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedInsight" ADD CONSTRAINT "SavedInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedInsight" ADD CONSTRAINT "SavedInsight_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "WhatWorksPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

