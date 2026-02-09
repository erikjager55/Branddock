-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LOGO', 'COLOR', 'TYPOGRAPHY', 'MESSAGING', 'GUIDELINE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('USES', 'SIMILAR', 'ALTERNATIVE');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('BRAND_ALIGNMENT', 'ACCESSIBILITY', 'USAGE_RECOMMENDATION', 'TREND_ANALYSIS');

-- CreateTable
CREATE TABLE "brand_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_relations" (
    "id" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromAssetId" TEXT NOT NULL,
    "toAssetId" TEXT NOT NULL,

    CONSTRAINT "asset_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "analysisType" "AnalysisType" NOT NULL,
    "content" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_relations_fromAssetId_toAssetId_relationType_key" ON "asset_relations"("fromAssetId", "toAssetId", "relationType");

-- AddForeignKey
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_relations" ADD CONSTRAINT "asset_relations_fromAssetId_fkey" FOREIGN KEY ("fromAssetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_relations" ADD CONSTRAINT "asset_relations_toAssetId_fkey" FOREIGN KEY ("toAssetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
