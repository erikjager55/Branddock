-- CreateEnum
CREATE TYPE "ResearchMethodType" AS ENUM ('AI_EXPLORATION', 'WORKSHOP', 'INTERVIEWS', 'QUESTIONNAIRE');

-- CreateEnum
CREATE TYPE "ResearchMethodStatus" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED');

-- AlterTable
ALTER TABLE "BrandAsset" ADD COLUMN     "frameworkData" JSONB,
ADD COLUMN     "frameworkType" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT;

-- CreateTable
CREATE TABLE "BrandAssetVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT,
    "frameworkData" JSONB,
    "changeNote" TEXT,
    "changedById" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAssetResearchMethod" (
    "id" TEXT NOT NULL,
    "method" "ResearchMethodType" NOT NULL,
    "status" "ResearchMethodStatus" NOT NULL DEFAULT 'AVAILABLE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "artifactsCount" INTEGER NOT NULL DEFAULT 0,
    "brandAssetId" TEXT NOT NULL,

    CONSTRAINT "BrandAssetResearchMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandAssetVersion_brandAssetId_idx" ON "BrandAssetVersion"("brandAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAssetVersion_brandAssetId_version_key" ON "BrandAssetVersion"("brandAssetId", "version");

-- CreateIndex
CREATE INDEX "BrandAssetResearchMethod_brandAssetId_idx" ON "BrandAssetResearchMethod"("brandAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAssetResearchMethod_brandAssetId_method_key" ON "BrandAssetResearchMethod"("brandAssetId", "method");

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetVersion" ADD CONSTRAINT "BrandAssetVersion_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetVersion" ADD CONSTRAINT "BrandAssetVersion_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetResearchMethod" ADD CONSTRAINT "BrandAssetResearchMethod_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
