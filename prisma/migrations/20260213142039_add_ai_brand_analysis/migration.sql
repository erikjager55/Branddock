-- CreateEnum
CREATE TYPE "AIAnalysisStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REPORT_GENERATING', 'REPORT_READY', 'ERROR');

-- CreateEnum
CREATE TYPE "AIMessageType" AS ENUM ('SYSTEM_INTRO', 'AI_QUESTION', 'USER_ANSWER', 'AI_FEEDBACK');

-- CreateTable
CREATE TABLE "AIBrandAnalysisSession" (
    "id" TEXT NOT NULL,
    "status" "AIAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
    "reportData" JSONB,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "brandAssetId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIBrandAnalysisSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysisMessage" (
    "id" TEXT NOT NULL,
    "type" "AIMessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysisMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIBrandAnalysisSession_brandAssetId_idx" ON "AIBrandAnalysisSession"("brandAssetId");

-- CreateIndex
CREATE INDEX "AIBrandAnalysisSession_workspaceId_idx" ON "AIBrandAnalysisSession"("workspaceId");

-- CreateIndex
CREATE INDEX "AIAnalysisMessage_sessionId_orderIndex_idx" ON "AIAnalysisMessage"("sessionId", "orderIndex");

-- AddForeignKey
ALTER TABLE "AIBrandAnalysisSession" ADD CONSTRAINT "AIBrandAnalysisSession_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIBrandAnalysisSession" ADD CONSTRAINT "AIBrandAnalysisSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIBrandAnalysisSession" ADD CONSTRAINT "AIBrandAnalysisSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisMessage" ADD CONSTRAINT "AIAnalysisMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIBrandAnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
