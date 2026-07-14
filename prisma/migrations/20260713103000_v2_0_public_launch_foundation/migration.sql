ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COLLEGE_REPRESENTATIVE';

CREATE TYPE "LaunchMode" AS ENUM ('CLOSED_BETA', 'INVITE_ONLY', 'LIMITED_PUBLIC', 'PUBLIC');
CREATE TYPE "CollegeClaimRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED');
CREATE TYPE "OfficialCorrectionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_SOURCE');
CREATE TYPE "PolicyType" AS ENUM ('TERMS', 'PRIVACY', 'COMMUNITY_GUIDELINES', 'CONTENT_POLICY', 'DATA_CORRECTION', 'COLLEGE_REPRESENTATIVE', 'ACCOUNT_SUSPENSION');
CREATE TYPE "DataExportStatus" AS ENUM ('REQUESTED', 'READY', 'FAILED');
CREATE TYPE "AccountDeletionStatus" AS ENUM ('REQUESTED', 'COOLING_OFF', 'CANCELLED', 'COMPLETED');

CREATE TABLE "PlatformSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollegeClaimRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "collegeId" TEXT,
  "collegeName" TEXT NOT NULL,
  "institutionalEmail" TEXT NOT NULL,
  "roleOrDepartment" TEXT NOT NULL,
  "officialWebsite" TEXT,
  "reason" TEXT NOT NULL,
  "sourceInfo" TEXT,
  "status" "CollegeClaimRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollegeClaimRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfficialCorrectionRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "claimRequestId" TEXT,
  "fieldName" TEXT NOT NULL,
  "proposedValue" TEXT NOT NULL,
  "currentValue" TEXT,
  "sourceUrl" TEXT,
  "sourceInfo" TEXT,
  "status" "OfficialCorrectionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficialCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PolicyAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "policyType" "PolicyType" NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataExportRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "DataExportStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AccountDeletionStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "coolingOffEndsAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "userNote" TEXT,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");
CREATE INDEX "CollegeClaimRequest_requesterId_status_createdAt_idx" ON "CollegeClaimRequest"("requesterId", "status", "createdAt");
CREATE INDEX "CollegeClaimRequest_collegeId_status_idx" ON "CollegeClaimRequest"("collegeId", "status");
CREATE INDEX "CollegeClaimRequest_status_createdAt_idx" ON "CollegeClaimRequest"("status", "createdAt");
CREATE INDEX "OfficialCorrectionRequest_requesterId_status_createdAt_idx" ON "OfficialCorrectionRequest"("requesterId", "status", "createdAt");
CREATE INDEX "OfficialCorrectionRequest_collegeId_status_idx" ON "OfficialCorrectionRequest"("collegeId", "status");
CREATE INDEX "OfficialCorrectionRequest_status_createdAt_idx" ON "OfficialCorrectionRequest"("status", "createdAt");
CREATE UNIQUE INDEX "PolicyAcceptance_userId_policyType_version_key" ON "PolicyAcceptance"("userId", "policyType", "version");
CREATE INDEX "PolicyAcceptance_userId_acceptedAt_idx" ON "PolicyAcceptance"("userId", "acceptedAt");
CREATE INDEX "DataExportRequest_userId_requestedAt_idx" ON "DataExportRequest"("userId", "requestedAt");
CREATE INDEX "AccountDeletionRequest_userId_status_requestedAt_idx" ON "AccountDeletionRequest"("userId", "status", "requestedAt");

ALTER TABLE "PlatformSetting" ADD CONSTRAINT "PlatformSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollegeClaimRequest" ADD CONSTRAINT "CollegeClaimRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollegeClaimRequest" ADD CONSTRAINT "CollegeClaimRequest_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollegeClaimRequest" ADD CONSTRAINT "CollegeClaimRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfficialCorrectionRequest" ADD CONSTRAINT "OfficialCorrectionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficialCorrectionRequest" ADD CONSTRAINT "OfficialCorrectionRequest_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficialCorrectionRequest" ADD CONSTRAINT "OfficialCorrectionRequest_claimRequestId_fkey" FOREIGN KEY ("claimRequestId") REFERENCES "CollegeClaimRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfficialCorrectionRequest" ADD CONSTRAINT "OfficialCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
