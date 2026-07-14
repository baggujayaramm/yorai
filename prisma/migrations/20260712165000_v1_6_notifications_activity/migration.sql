-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('THREAD_REPLY', 'THREAD_STATUS_CHANGED', 'THREAD_RECONFIRMED', 'THREAD_NEEDS_CURRENT_CONTEXT', 'EXPERIENCE_COMMENT', 'COMMUNITY_CONTEXT_ADDED', 'FOLLOWED_COLLEGE_NEW_THREAD', 'FOLLOWED_COLLEGE_NEW_EXPERIENCE', 'SAVED_CONTENT_UPDATED', 'REPORT_STATUS_UPDATED', 'MODERATION_NOTICE', 'PROFILE_CONTEXT_UPDATE');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('THREAD', 'REPLY', 'EXPERIENCE', 'INSIGHT', 'COLLEGE', 'REPORT', 'PROFILE', 'MODERATION');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetType" "NotificationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "destinationUrl" TEXT,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repliesToMyContent" BOOLEAN NOT NULL DEFAULT true,
    "watchedThreadUpdates" BOOLEAN NOT NULL DEFAULT true,
    "followedCollegeUpdates" BOOLEAN NOT NULL DEFAULT true,
    "savedContentUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reportModerationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_readAt_createdAt_idx" ON "Notification"("recipientUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_targetType_targetId_idx" ON "Notification"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
