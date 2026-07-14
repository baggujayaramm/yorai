CREATE TYPE "ContentRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ContentVisibility" AS ENUM ('VISIBLE', 'UNDER_REVIEW', 'HIDDEN', 'REMOVED');
CREATE TYPE "WarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "RestrictionType" AS ENUM ('POSTING', 'REPLYING', 'REPORTING');
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

ALTER TABLE "Answer" ADD COLUMN "riskLevel" "ContentRiskLevel" NOT NULL DEFAULT 'LOW', ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "ExperiencePost" ADD COLUMN "riskLevel" "ContentRiskLevel" NOT NULL DEFAULT 'LOW', ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "Question" ADD COLUMN "riskLevel" "ContentRiskLevel" NOT NULL DEFAULT 'LOW', ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "Report" ADD COLUMN "assignedAt" TIMESTAMP(3), ADD COLUMN "assignedModeratorId" TEXT, ADD COLUMN "resolvedAt" TIMESTAMP(3), ADD COLUMN "riskLevel" "ContentRiskLevel" NOT NULL DEFAULT 'LOW';
ALTER TABLE "WhatWorksPost" ADD COLUMN "riskLevel" "ContentRiskLevel" NOT NULL DEFAULT 'LOW', ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'VISIBLE';

CREATE TABLE "UserWarning" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "issuedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "severity" "WarningSeverity" NOT NULL DEFAULT 'LOW',
  "targetType" TEXT,
  "targetId" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemporaryRestriction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "RestrictionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "issuedByUserId" TEXT NOT NULL,
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TemporaryRestriction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAppeal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moderationActionId" TEXT NOT NULL,
  "clarification" TEXT NOT NULL,
  "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationAppeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserWarning_recipientUserId_acknowledgedAt_createdAt_idx" ON "UserWarning"("recipientUserId", "acknowledgedAt", "createdAt");
CREATE INDEX "TemporaryRestriction_userId_type_startsAt_expiresAt_idx" ON "TemporaryRestriction"("userId", "type", "startsAt", "expiresAt");
CREATE INDEX "ModerationAppeal_status_createdAt_idx" ON "ModerationAppeal"("status", "createdAt");
CREATE UNIQUE INDEX "ModerationAppeal_userId_moderationActionId_key" ON "ModerationAppeal"("userId", "moderationActionId");
CREATE INDEX "Report_status_riskLevel_createdAt_idx" ON "Report"("status", "riskLevel", "createdAt");
CREATE INDEX "Report_assignedModeratorId_status_idx" ON "Report"("assignedModeratorId", "status");

ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedModeratorId_fkey" FOREIGN KEY ("assignedModeratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemporaryRestriction" ADD CONSTRAINT "TemporaryRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemporaryRestriction" ADD CONSTRAINT "TemporaryRestriction_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationAppeal" ADD CONSTRAINT "ModerationAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAppeal" ADD CONSTRAINT "ModerationAppeal_moderationActionId_fkey" FOREIGN KEY ("moderationActionId") REFERENCES "ModerationAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
