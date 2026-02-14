-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('TO_SCHEDULE', 'SCHEDULED', 'INTERVIEW_HELD', 'IN_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewQuestionType" AS ENUM ('OPEN', 'MULTIPLE_CHOICE', 'MULTI_SELECT', 'RATING_SCALE', 'RANKING');

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'TO_SCHEDULE',
    "title" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "intervieweeName" TEXT,
    "intervieweePosition" TEXT,
    "intervieweeEmail" TEXT,
    "intervieweePhone" TEXT,
    "intervieweeCompany" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "conductedAt" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "generalNotes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssetLink" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,

    CONSTRAINT "InterviewAssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "linkedAssetId" TEXT,
    "questionType" "InterviewQuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "orderIndex" INTEGER NOT NULL,
    "isFromTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "answerText" TEXT,
    "answerOptions" TEXT[],
    "answerRating" INTEGER,
    "answerRanking" TEXT[],
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionTemplate" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "InterviewQuestionType" NOT NULL,
    "options" TEXT[],
    "category" TEXT NOT NULL,
    "assetSlug" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_brandAssetId_idx" ON "Interview"("brandAssetId");

-- CreateIndex
CREATE INDEX "Interview_workspaceId_idx" ON "Interview"("workspaceId");

-- CreateIndex
CREATE INDEX "InterviewAssetLink_interviewId_idx" ON "InterviewAssetLink"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAssetLink_interviewId_brandAssetId_key" ON "InterviewAssetLink"("interviewId", "brandAssetId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_interviewId_idx" ON "InterviewQuestion"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_linkedAssetId_idx" ON "InterviewQuestion"("linkedAssetId");

-- CreateIndex
CREATE INDEX "InterviewQuestionTemplate_category_idx" ON "InterviewQuestionTemplate"("category");

-- CreateIndex
CREATE INDEX "InterviewQuestionTemplate_workspaceId_idx" ON "InterviewQuestionTemplate"("workspaceId");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssetLink" ADD CONSTRAINT "InterviewAssetLink_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssetLink" ADD CONSTRAINT "InterviewAssetLink_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_linkedAssetId_fkey" FOREIGN KEY ("linkedAssetId") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionTemplate" ADD CONSTRAINT "InterviewQuestionTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
