-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('FOUNDATION', 'STRATEGY', 'EXPRESSION', 'IDENTITY');

-- CreateEnum
CREATE TYPE "AIAnalysisType" AS ENUM ('BRAND_ANALYSIS', 'PERSONA_ANALYSIS');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNING', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG_POST', 'SOCIAL_MEDIA', 'EMAIL', 'AD_COPY', 'LANDING_PAGE', 'VIDEO', 'CASE_STUDY', 'REPORT', 'WEBINAR', 'TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'PLANNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('MANUAL', 'WEBSITE_URL', 'PDF_UPLOAD');

-- CreateEnum
CREATE TYPE "ProductAnalysisStatus" AS ENUM ('DRAFT', 'ANALYZING', 'ANALYZED');

-- CreateEnum
CREATE TYPE "ResearchType" AS ENUM ('SURVEY', 'INTERVIEW', 'ANALYSIS', 'AI_EXPLORATION');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('TREND', 'COMPETITOR', 'INDUSTRY');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ON_TRACK', 'BEHIND', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('DRAFT', 'PURCHASED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('TO_SCHEDULE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'COLLECTING', 'ANALYZED', 'VALIDATED');

-- AlterEnum
BEGIN;
CREATE TYPE "AssetStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'AI_ANALYSIS_COMPLETE', 'VALIDATED', 'LOCKED');
ALTER TABLE "public"."brand_assets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "brand_assets" ALTER COLUMN "status" TYPE "AssetStatus_new" USING ("status"::text::"AssetStatus_new");
ALTER TYPE "AssetStatus" RENAME TO "AssetStatus_old";
ALTER TYPE "AssetStatus_new" RENAME TO "AssetStatus";
DROP TYPE "public"."AssetStatus_old";
ALTER TABLE "brand_assets" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AssetType_new" AS ENUM ('MISSION', 'VISION', 'VALUES', 'POSITIONING', 'PROMISE', 'STORY', 'OTHER');
ALTER TABLE "brand_assets" ALTER COLUMN "type" TYPE "AssetType_new" USING ("type"::text::"AssetType_new");
ALTER TYPE "AssetType" RENAME TO "AssetType_old";
ALTER TYPE "AssetType_new" RENAME TO "AssetType";
DROP TYPE "public"."AssetType_old";
COMMIT;

-- AlterTable
ALTER TABLE "brand_assets" ADD COLUMN     "category" "AssetCategory" NOT NULL DEFAULT 'FOUNDATION',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "validationScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "logo" TEXT;

-- CreateTable
CREATE TABLE "new_ai_analyses" (
    "id" TEXT NOT NULL,
    "type" "AIAnalysisType" NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "messages" JSONB,
    "executiveSummary" TEXT,
    "keyFindings" JSONB,
    "recommendations" JSONB,
    "dimensions" JSONB,
    "confidenceBoost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assetId" TEXT,
    "personaId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "new_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkshopStatus" NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL DEFAULT 'golden-circle',
    "bundle" TEXT,
    "hasFacilitator" BOOLEAN NOT NULL DEFAULT false,
    "purchaseAmount" DOUBLE PRECISION,
    "purchasedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 6,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "facilitator" TEXT,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "participants" JSONB,
    "stepResponses" JSONB,
    "canvas" JSONB,
    "objectives" JSONB,
    "agenda" JSONB,
    "aiReport" JSONB,
    "notes" JSONB,
    "gallery" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'TO_SCHEDULE',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "contactName" TEXT,
    "contactPosition" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactCompany" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "questions" JSONB,
    "selectedAssets" JSONB,
    "answers" JSONB,
    "generalNotes" TEXT,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "assetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "questions" JSONB,
    "distributionMethod" TEXT NOT NULL DEFAULT 'email',
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "reminderDays" INTEGER,
    "shareableLink" TEXT,
    "recipients" JSONB,
    "totalResponses" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTime" INTEGER,
    "responses" JSONB,
    "aiInsights" JSONB,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "assetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "format" TEXT,
    "channel" TEXT,
    "metadata" JSONB,
    "onBrand" BOOLEAN NOT NULL DEFAULT true,
    "brandScore" INTEGER,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "role" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "imageUrl" TEXT,
    "researchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "methodsCompleted" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "age" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "income" TEXT,
    "familyStatus" TEXT,
    "personalityType" TEXT,
    "coreValues" JSONB,
    "interests" JSONB,
    "goals" JSONB,
    "motivations" JSONB,
    "frustrations" JSONB,
    "painPoints" JSONB,
    "behaviors" JSONB,
    "strategicImplications" JSONB,
    "demographics" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "analysisStatus" "ProductAnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "pricing" TEXT,
    "pricingModel" TEXT,
    "pricingDetails" TEXT,
    "features" JSONB,
    "benefits" JSONB,
    "useCases" JSONB,
    "targetAudience" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "analysisSteps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_personas" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,

    CONSTRAINT "product_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_styleguides" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "logo" JSONB,
    "colors" JSONB,
    "typography" JSONB,
    "toneOfVoice" JSONB,
    "imagery" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "brand_styleguides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_strategies" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT DEFAULT '🎯',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "vision" TEXT,
    "rationale" TEXT,
    "assumptions" JSONB,
    "focusAreas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "business_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_objectives" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "focusArea" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "metricType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "startValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkedCampaigns" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "strategyId" TEXT NOT NULL,

    CONSTRAINT "strategic_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_results" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" TEXT,
    "currentValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objectiveId" TEXT NOT NULL,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_milestones" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "quarter" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strategyId" TEXT NOT NULL,

    CONSTRAINT "strategy_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_insights" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "type" "InsightType" NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "market_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResearchType" NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "findings" JSONB,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_personas_productId_personaId_key" ON "product_personas"("productId", "personaId");

-- AddForeignKey
ALTER TABLE "new_ai_analyses" ADD CONSTRAINT "new_ai_analyses_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_ai_analyses" ADD CONSTRAINT "new_ai_analyses_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_personas" ADD CONSTRAINT "product_personas_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_personas" ADD CONSTRAINT "product_personas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_styleguides" ADD CONSTRAINT "brand_styleguides_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_strategies" ADD CONSTRAINT "business_strategies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "business_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_milestones" ADD CONSTRAINT "strategy_milestones_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "business_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_insights" ADD CONSTRAINT "market_insights_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_insights" ADD CONSTRAINT "market_insights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

