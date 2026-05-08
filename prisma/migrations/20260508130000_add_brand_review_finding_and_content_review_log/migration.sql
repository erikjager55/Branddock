-- ADR-1 (BrandReviewFinding) + Δ-1 ContentReviewLog (idea-doc beslispunt 4)
-- Additive migration. Geen wijzigingen aan bestaande modellen behalve één
-- nullable veld op ContentFidelityScore (findingsCount) voor snelle UI-counts.

-- CreateEnum
CREATE TYPE "BrandReviewSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('VOICE', 'TERMINOLOGY', 'CLAIMS', 'STYLE', 'BUSINESS', 'AI_TELL');

-- AlterTable
ALTER TABLE "ContentFidelityScore" ADD COLUMN "findingsCount" INTEGER;

-- CreateTable
CREATE TABLE "BrandReviewFinding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fidelityScoreId" TEXT,
    "contentReviewLogId" TEXT,
    "location" TEXT NOT NULL,
    "severity" "BrandReviewSeverity" NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "beforeText" TEXT,
    "afterText" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandReviewFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReviewLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceContent" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "language" TEXT,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "pillarScoresJson" JSONB NOT NULL,
    "scorerVersion" TEXT,
    "durationMs" INTEGER NOT NULL,
    "retainUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandReviewFinding_fidelityScoreId_severity_idx" ON "BrandReviewFinding"("fidelityScoreId", "severity");

-- CreateIndex
CREATE INDEX "BrandReviewFinding_contentReviewLogId_severity_idx" ON "BrandReviewFinding"("contentReviewLogId", "severity");

-- CreateIndex
CREATE INDEX "BrandReviewFinding_workspaceId_createdAt_idx" ON "BrandReviewFinding"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReviewLog_workspaceId_createdAt_idx" ON "ContentReviewLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReviewLog_retainUntil_idx" ON "ContentReviewLog"("retainUntil");

-- AddForeignKey
ALTER TABLE "BrandReviewFinding" ADD CONSTRAINT "BrandReviewFinding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandReviewFinding" ADD CONSTRAINT "BrandReviewFinding_fidelityScoreId_fkey" FOREIGN KEY ("fidelityScoreId") REFERENCES "ContentFidelityScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandReviewFinding" ADD CONSTRAINT "BrandReviewFinding_contentReviewLogId_fkey" FOREIGN KEY ("contentReviewLogId") REFERENCES "ContentReviewLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReviewLog" ADD CONSTRAINT "ContentReviewLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReviewLog" ADD CONSTRAINT "ContentReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- App-level XOR check op BrandReviewFinding: exactly one of fidelityScoreId or
-- contentReviewLogId must be non-null. Postgres CHECK constraint:
ALTER TABLE "BrandReviewFinding" ADD CONSTRAINT "BrandReviewFinding_xor_parent_check"
  CHECK (
    (("fidelityScoreId" IS NOT NULL)::int + ("contentReviewLogId" IS NOT NULL)::int) = 1
  );
