-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('TO_BUY', 'PURCHASED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,
    "status" "WorkshopStatus" NOT NULL DEFAULT 'TO_BUY',
    "bundleId" TEXT,
    "selectedAssetIds" TEXT[],
    "workshopCount" INTEGER NOT NULL DEFAULT 1,
    "hasFacilitator" BOOLEAN NOT NULL DEFAULT false,
    "totalPrice" DOUBLE PRECISION,
    "purchasedAt" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "title" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "timerSeconds" INTEGER NOT NULL DEFAULT 0,
    "bookmarkStep" INTEGER,
    "facilitatorName" TEXT,
    "presentationUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "participantCount" INTEGER,
    "durationMinutes" DOUBLE PRECISION,
    "canvasData" JSONB,
    "canvasLocked" BOOLEAN NOT NULL DEFAULT false,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "executiveSummary" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT,
    "description" TEXT,
    "assetNames" TEXT[],
    "basePrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopStep" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "prompt" TEXT,
    "response" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkshopStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopFinding" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "WorkshopFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRecommendation" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkshopRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopParticipant" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatarUrl" TEXT,

    CONSTRAINT "WorkshopParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopNote" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopPhoto" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WorkshopPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopObjective" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WorkshopObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopAgendaItem" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "details" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WorkshopAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workshop_brandAssetId_idx" ON "Workshop"("brandAssetId");

-- CreateIndex
CREATE INDEX "Workshop_workspaceId_idx" ON "Workshop"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkshopBundle_workspaceId_idx" ON "WorkshopBundle"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkshopStep_workshopId_idx" ON "WorkshopStep"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopStep_workshopId_stepNumber_key" ON "WorkshopStep"("workshopId", "stepNumber");

-- CreateIndex
CREATE INDEX "WorkshopFinding_workshopId_idx" ON "WorkshopFinding"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopRecommendation_workshopId_idx" ON "WorkshopRecommendation"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopParticipant_workshopId_idx" ON "WorkshopParticipant"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopNote_workshopId_idx" ON "WorkshopNote"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopPhoto_workshopId_idx" ON "WorkshopPhoto"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopObjective_workshopId_idx" ON "WorkshopObjective"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopAgendaItem_workshopId_idx" ON "WorkshopAgendaItem"("workshopId");

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "WorkshopBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBundle" ADD CONSTRAINT "WorkshopBundle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopStep" ADD CONSTRAINT "WorkshopStep_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopFinding" ADD CONSTRAINT "WorkshopFinding_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecommendation" ADD CONSTRAINT "WorkshopRecommendation_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopParticipant" ADD CONSTRAINT "WorkshopParticipant_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopNote" ADD CONSTRAINT "WorkshopNote_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopPhoto" ADD CONSTRAINT "WorkshopPhoto_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopObjective" ADD CONSTRAINT "WorkshopObjective_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopAgendaItem" ADD CONSTRAINT "WorkshopAgendaItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
