-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('PURPOSE', 'COMMUNICATION', 'STRATEGY', 'NARRATIVE', 'CORE', 'PERSONALITY', 'FOUNDATION', 'CULTURE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'NEEDS_ATTENTION', 'READY');

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "coveragePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validatedCount" INTEGER NOT NULL DEFAULT 0,
    "artifactCount" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB,
    "aiValidated" BOOLEAN NOT NULL DEFAULT false,
    "workshopValidated" BOOLEAN NOT NULL DEFAULT false,
    "interviewValidated" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireValidated" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandAsset_slug_key" ON "BrandAsset"("slug");

-- CreateIndex
CREATE INDEX "BrandAsset_workspaceId_idx" ON "BrandAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandAsset_category_idx" ON "BrandAsset"("category");

-- CreateIndex
CREATE INDEX "BrandAsset_status_idx" ON "BrandAsset"("status");

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
