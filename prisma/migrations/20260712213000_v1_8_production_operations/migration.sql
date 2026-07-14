CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "routeCategory" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalEvent" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "requestId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AnalyticsEvent_routeCategory_createdAt_idx" ON "AnalyticsEvent"("routeCategory", "createdAt");
CREATE INDEX "OperationalEvent_level_createdAt_idx" ON "OperationalEvent"("level", "createdAt");
CREATE INDEX "OperationalEvent_category_createdAt_idx" ON "OperationalEvent"("category", "createdAt");
CREATE INDEX "Answer_questionId_visibility_createdAt_idx" ON "Answer"("questionId", "visibility", "createdAt");
CREATE INDEX "Answer_userId_createdAt_idx" ON "Answer"("userId", "createdAt");
CREATE INDEX "Answer_visibility_riskLevel_updatedAt_idx" ON "Answer"("visibility", "riskLevel", "updatedAt");
CREATE INDEX "College_recordStatus_name_idx" ON "College"("recordStatus", "name");
CREATE INDEX "College_recordStatus_state_city_idx" ON "College"("recordStatus", "state", "city");
CREATE INDEX "ExperiencePost_collegeId_visibility_updatedAt_idx" ON "ExperiencePost"("collegeId", "visibility", "updatedAt");
CREATE INDEX "ExperiencePost_userId_createdAt_idx" ON "ExperiencePost"("userId", "createdAt");
CREATE INDEX "ExperiencePost_visibility_riskLevel_updatedAt_idx" ON "ExperiencePost"("visibility", "riskLevel", "updatedAt");
CREATE INDEX "FollowedCollege_collegeId_createdAt_idx" ON "FollowedCollege"("collegeId", "createdAt");
CREATE INDEX "Question_collegeId_visibility_lastActiveAt_idx" ON "Question"("collegeId", "visibility", "lastActiveAt");
CREATE INDEX "Question_userId_createdAt_idx" ON "Question"("userId", "createdAt");
CREATE INDEX "Question_visibility_riskLevel_updatedAt_idx" ON "Question"("visibility", "riskLevel", "updatedAt");
CREATE INDEX "SavedExperience_experienceId_createdAt_idx" ON "SavedExperience"("experienceId", "createdAt");
CREATE INDEX "SavedInsight_insightId_createdAt_idx" ON "SavedInsight"("insightId", "createdAt");
CREATE INDEX "WatchedThread_threadId_createdAt_idx" ON "WatchedThread"("threadId", "createdAt");
CREATE INDEX "WhatWorksPost_collegeId_visibility_updatedAt_idx" ON "WhatWorksPost"("collegeId", "visibility", "updatedAt");
CREATE INDEX "WhatWorksPost_userId_createdAt_idx" ON "WhatWorksPost"("userId", "createdAt");
CREATE INDEX "WhatWorksPost_visibility_riskLevel_updatedAt_idx" ON "WhatWorksPost"("visibility", "riskLevel", "updatedAt");
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
