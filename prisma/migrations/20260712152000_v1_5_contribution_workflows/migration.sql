-- AlterEnum
ALTER TYPE "QuestionStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "QuestionStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ExperiencePost" ADD COLUMN     "trustLabel" TEXT;

-- AlterTable
ALTER TABLE "WhatWorksPost" ADD COLUMN     "limitations" TEXT,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "trustLabel" TEXT;
