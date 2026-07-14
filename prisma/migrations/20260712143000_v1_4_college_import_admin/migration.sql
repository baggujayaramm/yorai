-- CreateEnum
CREATE TYPE "CollegeRecordStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollegeDataOrigin" AS ENUM ('FICTIONAL_DEMO', 'IMPORTED', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('DRY_RUN', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- AlterTable
ALTER TABLE "College" ADD COLUMN     "accreditation" TEXT,
ADD COLUMN     "dataOrigin" "CollegeDataOrigin" NOT NULL DEFAULT 'FICTIONAL_DEMO',
ADD COLUMN     "establishedYear" INTEGER,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "institutionType" TEXT,
ADD COLUMN     "internalReviewNote" TEXT,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "normalizedName" TEXT,
ADD COLUMN     "officialLogoUrl" TEXT,
ADD COLUMN     "ownershipType" TEXT,
ADD COLUMN     "publicImageUrl" TEXT,
ADD COLUMN     "recordStatus" "CollegeRecordStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "sourceRecordId" TEXT,
ADD COLUMN     "sourceUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CollegeImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sourceName" TEXT,
    "status" "ImportBatchStatus" NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "importActorId" TEXT,
    "importerVersion" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegeChangeRecord" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "changedById" TEXT,
    "changedFields" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeChangeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeImportBatch_status_idx" ON "CollegeImportBatch"("status");

-- CreateIndex
CREATE INDEX "CollegeImportBatch_startedAt_idx" ON "CollegeImportBatch"("startedAt");

-- CreateIndex
CREATE INDEX "CollegeChangeRecord_collegeId_idx" ON "CollegeChangeRecord"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeChangeRecord_actionType_idx" ON "CollegeChangeRecord"("actionType");

-- CreateIndex
CREATE INDEX "College_recordStatus_idx" ON "College"("recordStatus");

-- CreateIndex
CREATE INDEX "College_normalizedName_city_state_idx" ON "College"("normalizedName", "city", "state");

-- CreateIndex
CREATE INDEX "College_sourceName_sourceRecordId_idx" ON "College"("sourceName", "sourceRecordId");

-- CreateIndex
CREATE INDEX "College_officialWebsite_idx" ON "College"("officialWebsite");

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "CollegeImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeImportBatch" ADD CONSTRAINT "CollegeImportBatch_importActorId_fkey" FOREIGN KEY ("importActorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeChangeRecord" ADD CONSTRAINT "CollegeChangeRecord_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeChangeRecord" ADD CONSTRAINT "CollegeChangeRecord_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
