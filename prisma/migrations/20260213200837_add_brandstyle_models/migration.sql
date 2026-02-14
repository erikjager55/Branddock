-- CreateEnum
CREATE TYPE "StyleguideStatus" AS ENUM ('DRAFT', 'ANALYZING', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "StyleguideSource" AS ENUM ('URL', 'PDF');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'SCANNING_STRUCTURE', 'EXTRACTING_COLORS', 'ANALYZING_TYPOGRAPHY', 'DETECTING_COMPONENTS', 'GENERATING_STYLEGUIDE', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "ColorCategory" AS ENUM ('PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC');

-- CreateTable
CREATE TABLE "BrandStyleguide" (
    "id" TEXT NOT NULL,
    "status" "StyleguideStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "StyleguideSource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceFileName" TEXT,
    "analysisJobId" TEXT,
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "logoVariations" JSONB,
    "logoGuidelines" TEXT[],
    "logoDonts" TEXT[],
    "logoSavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "colorDonts" TEXT[],
    "colorsSavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "primaryFontName" TEXT,
    "primaryFontUrl" TEXT,
    "typeScale" JSONB,
    "typographySavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "contentGuidelines" TEXT[],
    "writingGuidelines" TEXT[],
    "examplePhrases" JSONB,
    "toneSavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "photographyStyle" JSONB,
    "photographyGuidelines" TEXT[],
    "illustrationGuidelines" TEXT[],
    "imageryDonts" TEXT[],
    "imagerySavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandStyleguide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleguideColor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "rgb" TEXT,
    "hsl" TEXT,
    "cmyk" TEXT,
    "category" "ColorCategory" NOT NULL DEFAULT 'PRIMARY',
    "tags" TEXT[],
    "notes" TEXT,
    "contrastWhite" TEXT,
    "contrastBlack" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "styleguideId" TEXT NOT NULL,

    CONSTRAINT "StyleguideColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandStyleguide_workspaceId_idx" ON "BrandStyleguide"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandStyleguide_workspaceId_key" ON "BrandStyleguide"("workspaceId");

-- CreateIndex
CREATE INDEX "StyleguideColor_styleguideId_idx" ON "StyleguideColor"("styleguideId");

-- AddForeignKey
ALTER TABLE "BrandStyleguide" ADD CONSTRAINT "BrandStyleguide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandStyleguide" ADD CONSTRAINT "BrandStyleguide_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleguideColor" ADD CONSTRAINT "StyleguideColor_styleguideId_fkey" FOREIGN KEY ("styleguideId") REFERENCES "BrandStyleguide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
