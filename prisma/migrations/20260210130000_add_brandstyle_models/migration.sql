
-- CreateEnum
CREATE TYPE "StyleguideSourceType" AS ENUM ('WEBSITE', 'PDF', 'MANUAL');

-- CreateEnum
CREATE TYPE "StyleguideStatus" AS ENUM ('DRAFT', 'ANALYZING', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "LogoVariant" AS ENUM ('PRIMARY', 'ICON_MARK', 'SCALE_ONLY', 'MONOCHROME', 'REVERSED');

-- CreateEnum
CREATE TYPE "ColorCategory" AS ENUM ('PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC');

-- AlterTable
ALTER TABLE "brand_styleguides" DROP COLUMN "colors",
DROP COLUMN "imagery",
DROP COLUMN "logo",
DROP COLUMN "toneOfVoice",
DROP COLUMN "typography",
ADD COLUMN     "colorDonts" JSONB,
ADD COLUMN     "contentGuidelines" JSONB,
ADD COLUMN     "examplePhrases" JSONB,
ADD COLUMN     "illustrationGuidelines" JSONB,
ADD COLUMN     "imageryDonts" JSONB,
ADD COLUMN     "logoDonts" JSONB,
ADD COLUMN     "logoUsageGuidelines" JSONB,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Brand Styleguide',
ADD COLUMN     "photographyExamples" JSONB,
ADD COLUMN     "photographyGuidelines" JSONB,
ADD COLUMN     "primaryFont" TEXT,
ADD COLUMN     "secondaryFont" TEXT,
ADD COLUMN     "sourceFileName" TEXT,
ADD COLUMN     "status" "StyleguideStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "typeScale" JSONB,
ADD COLUMN     "writingGuidelines" JSONB,
DROP COLUMN "sourceType",
ADD COLUMN     "sourceType" "StyleguideSourceType" NOT NULL DEFAULT 'WEBSITE',
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "styleguide_logos" (
    "id" TEXT NOT NULL,
    "variant" "LogoVariant" NOT NULL DEFAULT 'PRIMARY',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "backgroundColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "styleguideId" TEXT NOT NULL,

    CONSTRAINT "styleguide_logos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "styleguide_colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "rgb" TEXT,
    "hsl" TEXT,
    "cmyk" TEXT,
    "tags" JSONB,
    "category" "ColorCategory" NOT NULL DEFAULT 'PRIMARY',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "styleguideId" TEXT NOT NULL,

    CONSTRAINT "styleguide_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_styleguides_workspaceId_key" ON "brand_styleguides"("workspaceId");

-- AddForeignKey
ALTER TABLE "styleguide_logos" ADD CONSTRAINT "styleguide_logos_styleguideId_fkey" FOREIGN KEY ("styleguideId") REFERENCES "brand_styleguides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "styleguide_colors" ADD CONSTRAINT "styleguide_colors_styleguideId_fkey" FOREIGN KEY ("styleguideId") REFERENCES "brand_styleguides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

