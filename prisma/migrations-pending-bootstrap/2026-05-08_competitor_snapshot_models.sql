-- CreateEnum
CREATE TYPE "SnapshotTriggerSource" AS ENUM ('MANUAL', 'CRON_LIGHT', 'CRON_DEEP', 'API');

-- CreateEnum
CREATE TYPE "CompetitorSignalSource" AS ENUM ('MANUAL', 'WEBSCRAPE', 'EXA', 'RSS', 'WAYBACK', 'REVIEWS', 'GOOGLE_ALERT');

-- CreateEnum
CREATE TYPE "CompetitorActivityType" AS ENUM ('TAGLINE_CHANGED', 'VALUE_PROP_CHANGED', 'TARGET_AUDIENCE_CHANGED', 'CATEGORY_REPOSITIONING', 'NEW_PRODUCT', 'PRODUCT_REMOVED', 'PRICING_CHANGED', 'NEW_OFFERING', 'NEW_BLOG_POST', 'NEW_PRESS_RELEASE', 'NEW_CASE_STUDY', 'NEW_FORMAT_EMERGING', 'HIRING_SIGNAL', 'HEADCOUNT_RANGE_CHANGED', 'FUNDING_EVENT', 'LEADERSHIP_CHANGE', 'VISUAL_REBRAND', 'SOCIAL_PRESENCE_CHANGE', 'STATUS_CHANGED', 'TIER_CHANGED', 'USER_ANNOTATED');

-- CreateEnum
CREATE TYPE "ActivitySeverity" AS ENUM ('INFO', 'NOTABLE', 'MAJOR');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('BLOG_POST', 'PRESS_RELEASE', 'CASE_STUDY', 'EBOOK', 'WEBINAR', 'PODCAST', 'VIDEO', 'SOCIAL_POST', 'DOC', 'TOOL', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MonitoringFrequency" AS ENUM ('OFF', 'WEEKLY_LIGHT', 'BIWEEKLY_LIGHT', 'MONTHLY_DEEP', 'QUARTERLY_DEEP');

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monitoringFrequency" "MonitoringFrequency" NOT NULL DEFAULT 'WEEKLY_LIGHT',
ADD COLUMN     "nextScheduledScanAt" TIMESTAMP(3),
ADD COLUMN     "snapshotCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unacknowledgedActivityCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "scrapeHash" TEXT,
    "extractedJson" JSONB NOT NULL,
    "scrapedJson" JSONB,
    "embeddings" JSONB,
    "triggerSource" "SnapshotTriggerSource" NOT NULL,
    "signalSource" "CompetitorSignalSource" NOT NULL,
    "triggeredById" TEXT,
    "notes" TEXT,
    "errors" JSONB,
    "competitorId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorActivity" (
    "id" TEXT NOT NULL,
    "type" "CompetitorActivityType" NOT NULL,
    "severity" "ActivitySeverity" NOT NULL DEFAULT 'INFO',
    "diffPayload" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectionMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "snapshotId" TEXT,
    "competitorId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,

    CONSTRAINT "CompetitorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorContentItem" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "format" "ContentFormat" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "embedding" vector(1536),
    "firstSeenSnapshotId" TEXT,
    "signalSource" "CompetitorSignalSource" NOT NULL,
    "competitorId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "CompetitorContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_competitorId_capturedAt_idx" ON "CompetitorSnapshot"("competitorId", "capturedAt");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_workspaceId_capturedAt_idx" ON "CompetitorSnapshot"("workspaceId", "capturedAt");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_contentHash_idx" ON "CompetitorSnapshot"("contentHash");

-- CreateIndex
CREATE INDEX "CompetitorActivity_competitorId_detectedAt_idx" ON "CompetitorActivity"("competitorId", "detectedAt");

-- CreateIndex
CREATE INDEX "CompetitorActivity_workspaceId_detectedAt_idx" ON "CompetitorActivity"("workspaceId", "detectedAt");

-- CreateIndex
CREATE INDEX "CompetitorActivity_workspaceId_type_detectedAt_idx" ON "CompetitorActivity"("workspaceId", "type", "detectedAt");

-- CreateIndex
CREATE INDEX "CompetitorActivity_competitorId_severity_acknowledgedAt_idx" ON "CompetitorActivity"("competitorId", "severity", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "CompetitorContentItem_competitorId_publishedAt_idx" ON "CompetitorContentItem"("competitorId", "publishedAt");

-- CreateIndex
CREATE INDEX "CompetitorContentItem_workspaceId_format_publishedAt_idx" ON "CompetitorContentItem"("workspaceId", "format", "publishedAt");

-- CreateIndex
CREATE INDEX "CompetitorContentItem_workspaceId_discoveredAt_idx" ON "CompetitorContentItem"("workspaceId", "discoveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorContentItem_competitorId_urlHash_key" ON "CompetitorContentItem"("competitorId", "urlHash");

-- CreateIndex
CREATE INDEX "Competitor_monitoringEnabled_nextScheduledScanAt_idx" ON "Competitor"("monitoringEnabled", "nextScheduledScanAt");

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorContentItem" ADD CONSTRAINT "CompetitorContentItem_firstSeenSnapshotId_fkey" FOREIGN KEY ("firstSeenSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorContentItem" ADD CONSTRAINT "CompetitorContentItem_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorContentItem" ADD CONSTRAINT "CompetitorContentItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
