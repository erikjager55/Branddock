Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('DIRECT', 'AGENCY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DATA_RELATIONSHIP_CREATED', 'RESEARCH_COMPLETED', 'FILE_UPLOADED', 'MILESTONE_REACHED', 'COMMENT_ADDED', 'RESEARCH_PLAN_CREATED', 'ASSET_STATUS_UPDATED', 'RESEARCH_INSIGHT_ADDED', 'NEW_PERSONA_CREATED', 'NEW_RESEARCH_STARTED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('BRAND_ASSETS', 'RESEARCH', 'PERSONAS', 'STRATEGY', 'COLLABORATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('PURPOSE', 'COMMUNICATION', 'STRATEGY', 'NARRATIVE', 'CORE', 'PERSONALITY', 'FOUNDATION', 'CULTURE', 'ESG');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'NEEDS_ATTENTION', 'READY');

-- CreateEnum
CREATE TYPE "AIMessageType" AS ENUM ('SYSTEM_INTRO', 'AI_QUESTION', 'USER_ANSWER', 'AI_FEEDBACK', 'USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ResearchMethodType" AS ENUM ('AI_EXPLORATION', 'WORKSHOP', 'INTERVIEWS', 'QUESTIONNAIRE');

-- CreateEnum
CREATE TYPE "ResearchMethodStatus" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('TO_BUY', 'PURCHASED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('TO_SCHEDULE', 'DRAFT', 'SCHEDULED', 'INTERVIEW_HELD', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterviewQuestionType" AS ENUM ('OPEN', 'MULTIPLE_CHOICE', 'MULTI_SELECT', 'RATING_SCALE', 'RANKING');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('STRATEGIC', 'QUICK');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ComponentStatus" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'NEEDS_REVISION', 'APPROVED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('LEGACY', 'BRIEF_REVIEW', 'INITIALIZED', 'IN_PROGRESS', 'REVIEW', 'COMPLETE');

-- CreateEnum
CREATE TYPE "InsertFormat" AS ENUM ('INLINE', 'QUOTE', 'DATA_VIZ', 'AI_ADAPTED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED', 'PREVIEWING');

-- CreateEnum
CREATE TYPE "StrategyType" AS ENUM ('GROWTH', 'MARKET_ENTRY', 'PRODUCT_LAUNCH', 'BRAND_BUILDING', 'OPERATIONAL_EXCELLENCE', 'CUSTOM', 'BRAND_AWARENESS', 'MARKET_PENETRATION', 'CUSTOMER_RETENTION', 'DIGITAL_TRANSFORMATION');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'NOT_STARTED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "KeyResultStatus" AS ENUM ('ON_TRACK', 'COMPLETE', 'BEHIND', 'NOT_STARTED', 'AT_RISK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('DONE', 'UPCOMING', 'FUTURE', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'CRITICAL');

-- CreateEnum
CREATE TYPE "StyleguideStatus" AS ENUM ('DRAFT', 'ANALYZING', 'COMPLETE', 'ERROR', 'NOT_STARTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "StyleguideSource" AS ENUM ('URL', 'PDF');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'SCANNING_STRUCTURE', 'EXTRACTING_COLORS', 'ANALYZING_TYPOGRAPHY', 'DETECTING_COMPONENTS', 'GENERATING_STYLEGUIDE', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "ColorCategory" AS ENUM ('PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC', 'BACKGROUND', 'TEXT', 'SUCCESS', 'WARNING', 'ERROR_COLOR');

-- CreateEnum
CREATE TYPE "PersonaAvatarSource" AS ENUM ('NONE', 'AI_GENERATED', 'MANUAL_URL', 'PLACEHOLDER', 'UPLOADED');

-- CreateEnum
CREATE TYPE "PersonaResearchMethodType" AS ENUM ('AI_EXPLORATION', 'INTERVIEWS', 'QUESTIONNAIRE', 'USER_TESTING');

-- CreateEnum
CREATE TYPE "AIPersonaAnalysisStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'IDLE', 'ANALYZING', 'FAILED');

-- CreateEnum
CREATE TYPE "ExplorationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "PersonaChatMode" AS ENUM ('FREE_CHAT', 'GUIDED', 'EXPLORE', 'VALIDATE', 'IDEATE', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ProductImageCategory" AS ENUM ('HERO', 'LIFESTYLE', 'DETAIL', 'SCREENSHOT', 'FEATURE', 'MOCKUP', 'PACKAGING', 'VARIANT', 'GROUP', 'DIAGRAM', 'PROCESS', 'TEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "BrandstyleAnalysisStatus" AS ENUM ('NOT_STARTED', 'FETCHING_URL', 'EXTRACTING_LOGO', 'ANALYZING_COLORS', 'DETECTING_TYPOGRAPHY', 'ANALYZING_TONE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('MANUAL', 'WEBSITE_URL', 'PDF_UPLOAD');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ANALYZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrendDetectionSource" AS ENUM ('MANUAL', 'AI_RESEARCH');

-- CreateEnum
CREATE TYPE "TrendScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('CONSUMER_BEHAVIOR', 'TECHNOLOGY', 'MARKET_DYNAMICS', 'COMPETITIVE', 'REGULATORY');

-- CreateEnum
CREATE TYPE "InsightScope" AS ENUM ('MICRO', 'MESO', 'MACRO');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "InsightTimeframe" AS ENUM ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "InsightSource" AS ENUM ('MANUAL', 'AI_RESEARCH', 'IMPORTED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('BOOK', 'ARTICLE', 'RESEARCH', 'GUIDE', 'TEMPLATE', 'CASE_STUDY', 'WORKSHOP_RESOURCE', 'MASTERCLASS', 'PODCAST', 'WEBSITE', 'DESIGN', 'VIDEO');

-- CreateEnum
CREATE TYPE "ResourceSource" AS ENUM ('MANUAL', 'URL_IMPORT', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlignmentModule" AS ENUM ('BRAND_FOUNDATION', 'BUSINESS_STRATEGY', 'BRANDSTYLE', 'PERSONAS', 'PRODUCTS_SERVICES', 'MARKET_INSIGHTS');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'WARNING', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'DISMISSED', 'FIXED');

-- CreateEnum
CREATE TYPE "BundleCategory" AS ENUM ('FOUNDATION', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "ValidationPlanStatus" AS ENUM ('DRAFT', 'PURCHASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PENDING_REVIEW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE_REQUEST', 'BUG_REPORT');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeatureRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'SLACK', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AccentColor" AS ENUM ('BLUE', 'PURPLE', 'GREEN', 'ORANGE', 'PINK', 'TEAL');

-- CreateEnum
CREATE TYPE "FontSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "SidebarPosition" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'AGENCY', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "VersionedResourceType" AS ENUM ('PERSONA', 'BRAND_ASSET', 'PRODUCT', 'STRATEGY', 'STYLEGUIDE');

-- CreateEnum
CREATE TYPE "VersionChangeType" AS ENUM ('MANUAL_SAVE', 'AUTO_SAVE', 'LOCK_BASELINE', 'AI_GENERATED', 'RESTORE', 'IMPORT');

-- CreateEnum
CREATE TYPE "CompetitorTier" AS ENUM ('DIRECT', 'INDIRECT', 'ASPIRATIONAL');

-- CreateEnum
CREATE TYPE "CompetitorStatus" AS ENUM ('DRAFT', 'ANALYZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebsiteScanStatus" AS ENUM ('PENDING', 'CRAWLING', 'EXTRACTING', 'ANALYZING', 'MAPPING', 'STYLING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'DIRECT',
    "logoUrl" TEXT,
    "metadata" TEXT,
    "domain" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "maxSeats" INTEGER NOT NULL DEFAULT 3,
    "maxWorkspaces" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMemberAccess" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "WorkspaceMemberAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "websiteUrl" TEXT,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "dontShowOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "quickStartDismissed" BOOLEAN NOT NULL DEFAULT false,
    "quickStartItems" JSONB,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "NotificationCategory" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

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
    "frameworkType" TEXT,
    "frameworkData" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

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
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "resultData" JSONB,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAssetResearchMethod_pkey" PRIMARY KEY ("id")
);

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
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "email" TEXT,

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

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'TO_SCHEDULE',
    "title" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "intervieweeName" TEXT,
    "intervieweePosition" TEXT,
    "intervieweeEmail" TEXT,
    "intervieweePhone" TEXT,
    "intervieweeCompany" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "conductedAt" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "generalNotes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssetLink" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "brandAssetId" TEXT NOT NULL,

    CONSTRAINT "InterviewAssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "linkedAssetId" TEXT,
    "questionType" "InterviewQuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "orderIndex" INTEGER NOT NULL,
    "isFromTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "answerText" TEXT,
    "answerOptions" TEXT[],
    "answerRating" INTEGER,
    "answerRanking" TEXT[],
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionTemplate" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "InterviewQuestionType" NOT NULL,
    "options" TEXT[],
    "category" TEXT NOT NULL,
    "assetSlug" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "confidence" DOUBLE PRECISION,
    "strategy" JSONB,
    "campaignGoalType" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "strategyConfidence" DOUBLE PRECISION,
    "strategicApproach" TEXT,
    "keyMessages" TEXT[],
    "targetAudienceInsights" TEXT,
    "recommendedChannels" TEXT[],
    "strategyGeneratedAt" TIMESTAMP(3),
    "contentType" TEXT,
    "contentCategory" TEXT,
    "prompt" TEXT,
    "outputFormat" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "masterMessage" JSONB,
    "isSavedAsTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateName" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignKnowledgeAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brandAssetId" TEXT,
    "personaId" TEXT,
    "productId" TEXT,
    "insightId" TEXT,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "validationStatus" TEXT,
    "isAutoSelected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CampaignKnowledgeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "contentTab" TEXT,
    "prompt" TEXT,
    "aiModel" TEXT,
    "settings" JSONB,
    "generatedContent" JSONB,
    "generatedText" TEXT,
    "generatedImageUrls" TEXT[],
    "generatedVideoUrl" TEXT,
    "generatedSlides" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "qualityMetrics" JSONB,
    "checklistItems" JSONB,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "lastAutoSavedAt" TIMESTAMP(3),
    "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'LEGACY',
    "enrichedBrief" TEXT,
    "additionalInstructions" TEXT,
    "journeyPhase" TEXT,
    "weekInCampaign" INTEGER,
    "suggestedPublishDate" TIMESTAMP(3),
    "scheduledPublishDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "canvasState" JSONB,
    "derivedFromId" TEXT,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTeamMember" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "CampaignTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "deliverableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableComponent" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "groupType" TEXT NOT NULL,
    "groupIndex" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "status" "ComponentStatus" NOT NULL DEFAULT 'PENDING',
    "generatedContent" TEXT,
    "imageUrl" TEXT,
    "imageSource" TEXT,
    "videoUrl" TEXT,
    "visualBrief" TEXT,
    "aiModel" TEXT,
    "promptUsed" TEXT,
    "cascadingContext" TEXT,
    "rating" INTEGER,
    "feedbackText" TEXT,
    "personaReactions" TEXT,
    "generatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "variantGroup" TEXT,
    "variantIndex" INTEGER NOT NULL DEFAULT 0,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "aiProvider" TEXT,
    "generationDuration" INTEGER,
    "imagePromptUsed" TEXT,
    "userFeedback" TEXT,
    "iterationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediumEnrichment" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "componentTemplate" JSONB NOT NULL,
    "bestPractices" JSONB NOT NULL,
    "phaseGuidance" JSONB NOT NULL,
    "optimalPublishTimes" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediumEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsertedInsight" (
    "id" TEXT NOT NULL,
    "insightTitle" TEXT NOT NULL,
    "insightSource" TEXT,
    "insertFormat" "InsertFormat" NOT NULL,
    "insertLocation" TEXT,
    "deliverableId" TEXT NOT NULL,
    "insertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsertedInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImproveSuggestion" (
    "id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "impactPoints" DOUBLE PRECISION NOT NULL,
    "currentText" TEXT,
    "suggestedText" TEXT,
    "reason" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "deliverableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImproveSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaignGoalType" TEXT,
    "knowledgePattern" JSONB,
    "deliverableMix" JSONB,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessStrategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "StrategyType" NOT NULL DEFAULT 'CUSTOM',
    "status" "StrategyStatus" NOT NULL DEFAULT 'DRAFT',
    "vision" TEXT,
    "rationale" TEXT,
    "keyAssumptions" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "opportunities" TEXT[],
    "threats" TEXT[],
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressSnapshot" (
    "id" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strategyId" TEXT NOT NULL,

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ON_TRACK',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metricType" "MetricType" NOT NULL DEFAULT 'NUMBER',
    "startValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusAreaId" TEXT,
    "strategyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "KeyResultStatus" NOT NULL DEFAULT 'ON_TRACK',
    "progressValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "objectiveId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "strategyId" TEXT NOT NULL,

    CONSTRAINT "FocusArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "quarter" TEXT NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "strategyId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStrategy" (
    "strategyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "CampaignStrategy_pkey" PRIMARY KEY ("strategyId","campaignId")
);

-- CreateTable
CREATE TABLE "CampaignObjective" (
    "objectiveId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "CampaignObjective_pkey" PRIMARY KEY ("objectiveId","campaignId")
);

-- CreateTable
CREATE TABLE "BrandStyleguide" (
    "id" TEXT NOT NULL,
    "status" "StyleguideStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "StyleguideSource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceFileName" TEXT,
    "analysisJobId" TEXT,
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
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
    "brandImages" JSONB,
    "graphicElements" JSONB,
    "graphicElementsDonts" TEXT[],
    "patternsTextures" JSONB,
    "iconographyStyle" JSONB,
    "iconographyDonts" TEXT[],
    "gradientsEffects" JSONB,
    "layoutPrinciples" JSONB,
    "designLanguageSavedForAi" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
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

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "avatarUrl" TEXT,
    "avatarSource" "PersonaAvatarSource" NOT NULL DEFAULT 'NONE',
    "age" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "income" TEXT,
    "familyStatus" TEXT,
    "personalityType" TEXT,
    "coreValues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motivations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frustrations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "behaviors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strategicImplications" TEXT,
    "preferredChannels" JSONB,
    "techStack" JSONB,
    "quote" TEXT,
    "bio" TEXT,
    "buyingTriggers" JSONB,
    "decisionCriteria" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaResearchMethod" (
    "id" TEXT NOT NULL,
    "method" "PersonaResearchMethodType" NOT NULL,
    "status" "ResearchMethodStatus" NOT NULL DEFAULT 'AVAILABLE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "artifactsCount" INTEGER NOT NULL DEFAULT 0,
    "personaId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "resultData" JSONB,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaResearchMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPersonaAnalysisSession" (
    "id" TEXT NOT NULL,
    "status" "AIPersonaAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDimensions" INTEGER NOT NULL DEFAULT 4,
    "answeredDimensions" INTEGER NOT NULL DEFAULT 0,
    "insightsData" JSONB,
    "completedAt" TIMESTAMP(3),
    "personaId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPersonaAnalysisSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPersonaAnalysisMessage" (
    "id" TEXT NOT NULL,
    "type" "AIMessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIPersonaAnalysisMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationSession" (
    "id" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "ExplorationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDimensions" INTEGER NOT NULL DEFAULT 4,
    "answeredDimensions" INTEGER NOT NULL DEFAULT 0,
    "modelId" TEXT,
    "metadata" JSONB,
    "insightsData" JSONB,
    "completedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplorationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationMessage" (
    "id" TEXT NOT NULL,
    "type" "AIMessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplorationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemSubType" TEXT,
    "label" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "systemPrompt" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL,
    "feedbackPrompt" TEXT NOT NULL,
    "reportPrompt" TEXT NOT NULL,
    "fieldSuggestionsConfig" JSONB,
    "contextSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplorationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationKnowledgeItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplorationKnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemKnowledgeSource" (
    "id" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "url" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "filePath" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatSession" (
    "id" TEXT NOT NULL,
    "mode" "PersonaChatMode" NOT NULL DEFAULT 'FREE_CHAT',
    "title" TEXT,
    "personaId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatMessage" (
    "id" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatInsight" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'behavior',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "severity" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaChatInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatContext" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "contextData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaChatContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "systemPromptTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaChatConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "pricingModel" TEXT,
    "pricingDetails" TEXT,
    "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIcon" TEXT,
    "analysisData" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" "ProductImageCategory" NOT NULL DEFAULT 'OTHER',
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'SCRAPED',
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPlan" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "entryMode" TEXT NOT NULL DEFAULT 'bundle',
    "status" TEXT NOT NULL DEFAULT 'active',
    "unlockedMethods" JSONB NOT NULL DEFAULT '[]',
    "unlockedAssets" JSONB NOT NULL DEFAULT '[]',
    "rationale" JSONB,
    "configuration" JSONB,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasedBundle" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "unlockedTools" JSONB NOT NULL DEFAULT '[]',
    "workspaceId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasedBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'article',
    "category" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "source" "ResourceSource" NOT NULL DEFAULT 'MANUAL',
    "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "estimatedDuration" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "publicationDate" TIMESTAMP(3),
    "isbn" TEXT,
    "pageCount" INTEGER,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "fileUrl" TEXT,
    "importedMetadata" JSONB,
    "createdBy" TEXT,
    "difficulty" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "addedBy" TEXT,
    "aiSummary" TEXT,
    "aiKeyTakeaways" JSONB,
    "relatedTrends" JSONB,
    "relatedPersonas" JSONB,
    "relatedAssets" JSONB,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'technology',
    "impact" TEXT NOT NULL DEFAULT 'medium',
    "timeframe" TEXT NOT NULL DEFAULT 'medium-term',
    "direction" TEXT,
    "level" TEXT,
    "relevance" INTEGER,
    "relevantIndustries" JSONB NOT NULL DEFAULT '[]',
    "keyInsights" TEXT,
    "sources" JSONB,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPersona" (
    "productId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,

    CONSTRAINT "ProductPersona_pkey" PRIMARY KEY ("productId","personaId")
);

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "InsightCategory" NOT NULL,
    "scope" "InsightScope" NOT NULL DEFAULT 'MICRO',
    "impactLevel" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "timeframe" "InsightTimeframe" NOT NULL DEFAULT 'SHORT_TERM',
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "source" "InsightSource" NOT NULL DEFAULT 'MANUAL',
    "industries" TEXT[],
    "tags" TEXT[],
    "howToUse" TEXT[],
    "aiResearchPrompt" TEXT,
    "aiResearchConfig" JSONB,
    "useBrandContext" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightSourceUrl" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,

    CONSTRAINT "InsightSourceUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentScan" (
    "id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "alignedCount" INTEGER NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "misalignedCount" INTEGER NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "AlignmentScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleScore" (
    "id" TEXT NOT NULL,
    "moduleName" "AlignmentModule" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "alignedCount" INTEGER NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "misalignedCount" INTEGER NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT NOT NULL,

    CONSTRAINT "ModuleScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentIssue" (
    "id" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "modulePath" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "conflictsWith" TEXT[],
    "recommendation" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "dismissedAt" TIMESTAMP(3),
    "dismissReason" TEXT,
    "fixAppliedAt" TIMESTAMP(3),
    "fixOption" TEXT,
    "sourceItemId" TEXT,
    "sourceItemType" TEXT,
    "targetItemId" TEXT,
    "targetItemType" TEXT,
    "scanId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "AlignmentIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "BundleCategory" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "timeline" TEXT,
    "methodCount" INTEGER NOT NULL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "includedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trustSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleAsset" (
    "id" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetDescription" TEXT,
    "assetIcon" TEXT,
    "bundleId" TEXT NOT NULL,

    CONSTRAINT "BundleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleMethod" (
    "id" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "description" TEXT,
    "bundleId" TEXT NOT NULL,

    CONSTRAINT "BundleMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationPlan" (
    "id" TEXT NOT NULL,
    "status" "ValidationPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationPlanAsset" (
    "id" TEXT NOT NULL,
    "brandAssetId" TEXT,
    "assetName" TEXT NOT NULL,
    "assetCategory" TEXT,
    "estimatedDuration" TEXT,
    "planId" TEXT NOT NULL,

    CONSTRAINT "ValidationPlanAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationPlanMethod" (
    "id" TEXT NOT NULL,
    "methodType" "ResearchMethodType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "planId" TEXT NOT NULL,

    CONSTRAINT "ValidationPlanMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStudy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "method" "ResearchMethodType" NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StudyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "personaId" TEXT,
    "brandAssetId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "planId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundlePurchase" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "workspaceId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundlePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "activeOrganizationId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconBg" TEXT NOT NULL,
    "iconColor" TEXT NOT NULL,
    "articleCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "relatedArticleIds" TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_tutorial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "categoryBadge" TEXT,
    "categoryColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_tutorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_item" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "attachmentUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_request" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FeatureRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_vote" (
    "id" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_rating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_stripe_event" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_record" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "jobTitle" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_password" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "researchNotifications" BOOLEAN NOT NULL DEFAULT true,
    "teamActivity" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerUserId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION,
    "yearlyPrice" DOUBLE PRECISION,
    "maxSeats" INTEGER NOT NULL DEFAULT 1,
    "maxAiGenerations" INTEGER NOT NULL DEFAULT 100,
    "maxResearchStudies" INTEGER NOT NULL DEFAULT 5,
    "maxStorageGb" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "features" JSONB NOT NULL DEFAULT '[]',
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodUsage" INTEGER,
    "usageReportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "browserEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "matrix" JSONB NOT NULL DEFAULT '{}',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appearance_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "accentColor" "AccentColor" NOT NULL DEFAULT 'TEAL',
    "language" TEXT NOT NULL DEFAULT 'en',
    "fontSize" "FontSize" NOT NULL DEFAULT 'MEDIUM',
    "sidebarPosition" "SidebarPosition" NOT NULL DEFAULT 'LEFT',
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "animations" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appearance_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceVersion" (
    "id" TEXT NOT NULL,
    "resourceType" "VersionedResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT,
    "changeNote" TEXT,
    "changeType" "VersionChangeType" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "diff" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "ResourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectedTrend" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "InsightCategory" NOT NULL,
    "scope" "InsightScope" NOT NULL DEFAULT 'MICRO',
    "impactLevel" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "timeframe" "InsightTimeframe" NOT NULL DEFAULT 'SHORT_TERM',
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "direction" TEXT,
    "confidence" DOUBLE PRECISION,
    "rawExcerpt" TEXT,
    "aiAnalysis" TEXT,
    "industries" TEXT[],
    "tags" TEXT[],
    "howToUse" TEXT[],
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "sourceUrls" TEXT[],
    "dataPoints" TEXT[],
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "whyNow" TEXT,
    "scores" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "detectionSource" "TrendDetectionSource" NOT NULL DEFAULT 'AI_RESEARCH',
    "researchJobId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectedTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendResearchJob" (
    "id" TEXT NOT NULL,
    "status" "TrendScanStatus" NOT NULL DEFAULT 'PENDING',
    "query" TEXT NOT NULL,
    "useBrandContext" BOOLEAN NOT NULL DEFAULT false,
    "urlsGenerated" TEXT[],
    "urlsTotal" INTEGER NOT NULL DEFAULT 0,
    "urlsCompleted" INTEGER NOT NULL DEFAULT 0,
    "trendsDetected" INTEGER NOT NULL DEFAULT 0,
    "pendingTrends" JSONB,
    "errors" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "TrendResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "description" TEXT,
    "tagline" TEXT,
    "foundingYear" INTEGER,
    "headquarters" TEXT,
    "employeeRange" TEXT,
    "logoUrl" TEXT,
    "valueProposition" TEXT,
    "targetAudience" TEXT,
    "differentiators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mainOfferings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricingModel" TEXT,
    "pricingDetails" TEXT,
    "toneOfVoice" TEXT,
    "messagingThemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visualStyleNotes" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialLinks" JSONB,
    "hasBlog" BOOLEAN,
    "hasCareersPage" BOOLEAN,
    "competitiveScore" INTEGER,
    "tier" "CompetitorTier" NOT NULL DEFAULT 'DIRECT',
    "status" "CompetitorStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "lastScrapedAt" TIMESTAMP(3),
    "analysisData" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProduct" (
    "competitorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "CompetitorProduct_pkey" PRIMARY KEY ("competitorId","productId")
);

-- CreateTable
CREATE TABLE "workspace_ai_config" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteScan" (
    "id" TEXT NOT NULL,
    "status" "WebsiteScanStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT NOT NULL,
    "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
    "categoriesTotal" INTEGER NOT NULL DEFAULT 6,
    "categoriesDone" INTEGER NOT NULL DEFAULT 0,
    "assetsPopulated" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "crawledPages" JSONB,
    "extractedData" JSONB,
    "aiResults" JSONB,
    "confidenceMap" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WebsiteScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "scopes" TEXT,
    "accountEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceMemberAccess_workspaceId_idx" ON "WorkspaceMemberAccess"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMemberAccess_memberId_workspaceId_key" ON "WorkspaceMemberAccess"("memberId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_idx" ON "Workspace"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardPreference_userId_key" ON "DashboardPreference"("userId");

-- CreateIndex
CREATE INDEX "DashboardPreference_workspaceId_idx" ON "DashboardPreference"("workspaceId");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_userId_idx" ON "Notification"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "BrandAsset_workspaceId_idx" ON "BrandAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandAsset_category_idx" ON "BrandAsset"("category");

-- CreateIndex
CREATE INDEX "BrandAsset_status_idx" ON "BrandAsset"("status");

-- CreateIndex
CREATE INDEX "BrandAsset_workspaceId_category_idx" ON "BrandAsset"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "BrandAsset_workspaceId_status_idx" ON "BrandAsset"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAsset_workspaceId_slug_key" ON "BrandAsset"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "BrandAssetVersion_brandAssetId_idx" ON "BrandAssetVersion"("brandAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAssetVersion_brandAssetId_version_key" ON "BrandAssetVersion"("brandAssetId", "version");

-- CreateIndex
CREATE INDEX "BrandAssetResearchMethod_brandAssetId_idx" ON "BrandAssetResearchMethod"("brandAssetId");

-- CreateIndex
CREATE INDEX "BrandAssetResearchMethod_workspaceId_idx" ON "BrandAssetResearchMethod"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAssetResearchMethod_brandAssetId_method_key" ON "BrandAssetResearchMethod"("brandAssetId", "method");

-- CreateIndex
CREATE INDEX "Workshop_brandAssetId_idx" ON "Workshop"("brandAssetId");

-- CreateIndex
CREATE INDEX "Workshop_workspaceId_idx" ON "Workshop"("workspaceId");

-- CreateIndex
CREATE INDEX "Workshop_status_idx" ON "Workshop"("status");

-- CreateIndex
CREATE INDEX "Workshop_workspaceId_status_idx" ON "Workshop"("workspaceId", "status");

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

-- CreateIndex
CREATE INDEX "Interview_brandAssetId_idx" ON "Interview"("brandAssetId");

-- CreateIndex
CREATE INDEX "Interview_workspaceId_idx" ON "Interview"("workspaceId");

-- CreateIndex
CREATE INDEX "Interview_workspaceId_status_idx" ON "Interview"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "InterviewAssetLink_interviewId_idx" ON "InterviewAssetLink"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAssetLink_interviewId_brandAssetId_key" ON "InterviewAssetLink"("interviewId", "brandAssetId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_interviewId_idx" ON "InterviewQuestion"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_linkedAssetId_idx" ON "InterviewQuestion"("linkedAssetId");

-- CreateIndex
CREATE INDEX "InterviewQuestionTemplate_category_idx" ON "InterviewQuestionTemplate"("category");

-- CreateIndex
CREATE INDEX "InterviewQuestionTemplate_workspaceId_idx" ON "InterviewQuestionTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");

-- CreateIndex
CREATE INDEX "Campaign_type_idx" ON "Campaign"("type");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_type_idx" ON "Campaign"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_isArchived_idx" ON "Campaign"("workspaceId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_workspaceId_slug_key" ON "Campaign"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "CampaignKnowledgeAsset_campaignId_idx" ON "CampaignKnowledgeAsset"("campaignId");

-- CreateIndex
CREATE INDEX "Deliverable_campaignId_idx" ON "Deliverable"("campaignId");

-- CreateIndex
CREATE INDEX "Deliverable_status_idx" ON "Deliverable"("status");

-- CreateIndex
CREATE INDEX "Deliverable_approvalStatus_idx" ON "Deliverable"("approvalStatus");

-- CreateIndex
CREATE INDEX "CampaignTeamMember_campaignId_idx" ON "CampaignTeamMember"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTeamMember_campaignId_userId_key" ON "CampaignTeamMember"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "ContentVersion_deliverableId_idx" ON "ContentVersion"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_deliverableId_versionNumber_key" ON "ContentVersion"("deliverableId", "versionNumber");

-- CreateIndex
CREATE INDEX "DeliverableComponent_deliverableId_order_idx" ON "DeliverableComponent"("deliverableId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableComponent_deliverableId_variantGroup_variantInde_key" ON "DeliverableComponent"("deliverableId", "variantGroup", "variantIndex");

-- CreateIndex
CREATE INDEX "MediumEnrichment_platform_format_idx" ON "MediumEnrichment"("platform", "format");

-- CreateIndex
CREATE UNIQUE INDEX "MediumEnrichment_platform_format_workspaceId_key" ON "MediumEnrichment"("platform", "format", "workspaceId");

-- CreateIndex
CREATE INDEX "InsertedInsight_deliverableId_idx" ON "InsertedInsight"("deliverableId");

-- CreateIndex
CREATE INDEX "ImproveSuggestion_deliverableId_idx" ON "ImproveSuggestion"("deliverableId");

-- CreateIndex
CREATE INDEX "CampaignTemplate_workspaceId_idx" ON "CampaignTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "BusinessStrategy_workspaceId_idx" ON "BusinessStrategy"("workspaceId");

-- CreateIndex
CREATE INDEX "BusinessStrategy_status_idx" ON "BusinessStrategy"("status");

-- CreateIndex
CREATE INDEX "BusinessStrategy_workspaceId_status_idx" ON "BusinessStrategy"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessStrategy_slug_workspaceId_key" ON "BusinessStrategy"("slug", "workspaceId");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_strategyId_date_idx" ON "ProgressSnapshot"("strategyId", "date");

-- CreateIndex
CREATE INDEX "Objective_strategyId_idx" ON "Objective"("strategyId");

-- CreateIndex
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");

-- CreateIndex
CREATE INDEX "FocusArea_strategyId_idx" ON "FocusArea"("strategyId");

-- CreateIndex
CREATE INDEX "Milestone_strategyId_idx" ON "Milestone"("strategyId");

-- CreateIndex
CREATE INDEX "BrandStyleguide_workspaceId_idx" ON "BrandStyleguide"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandStyleguide_workspaceId_key" ON "BrandStyleguide"("workspaceId");

-- CreateIndex
CREATE INDEX "StyleguideColor_styleguideId_idx" ON "StyleguideColor"("styleguideId");

-- CreateIndex
CREATE INDEX "Persona_workspaceId_idx" ON "Persona"("workspaceId");

-- CreateIndex
CREATE INDEX "Persona_workspaceId_createdAt_idx" ON "Persona"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PersonaResearchMethod_personaId_idx" ON "PersonaResearchMethod"("personaId");

-- CreateIndex
CREATE INDEX "PersonaResearchMethod_workspaceId_idx" ON "PersonaResearchMethod"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaResearchMethod_personaId_method_key" ON "PersonaResearchMethod"("personaId", "method");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisSession_personaId_idx" ON "AIPersonaAnalysisSession"("personaId");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisSession_workspaceId_idx" ON "AIPersonaAnalysisSession"("workspaceId");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisMessage_sessionId_orderIndex_idx" ON "AIPersonaAnalysisMessage"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExplorationSession_itemType_itemId_idx" ON "ExplorationSession"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "ExplorationSession_workspaceId_idx" ON "ExplorationSession"("workspaceId");

-- CreateIndex
CREATE INDEX "ExplorationSession_workspaceId_itemType_idx" ON "ExplorationSession"("workspaceId", "itemType");

-- CreateIndex
CREATE INDEX "ExplorationMessage_sessionId_orderIndex_idx" ON "ExplorationMessage"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExplorationConfig_workspaceId_idx" ON "ExplorationConfig"("workspaceId");

-- CreateIndex
CREATE INDEX "ExplorationConfig_itemType_itemSubType_idx" ON "ExplorationConfig"("itemType", "itemSubType");

-- CreateIndex
CREATE UNIQUE INDEX "ExplorationConfig_workspaceId_itemType_itemSubType_key" ON "ExplorationConfig"("workspaceId", "itemType", "itemSubType");

-- CreateIndex
CREATE INDEX "ExplorationKnowledgeItem_configId_idx" ON "ExplorationKnowledgeItem"("configId");

-- CreateIndex
CREATE INDEX "ItemKnowledgeSource_itemType_itemId_idx" ON "ItemKnowledgeSource"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "ItemKnowledgeSource_workspaceId_idx" ON "ItemKnowledgeSource"("workspaceId");

-- CreateIndex
CREATE INDEX "ItemKnowledgeSource_workspaceId_itemType_itemId_idx" ON "ItemKnowledgeSource"("workspaceId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "PersonaChatSession_personaId_idx" ON "PersonaChatSession"("personaId");

-- CreateIndex
CREATE INDEX "PersonaChatSession_workspaceId_idx" ON "PersonaChatSession"("workspaceId");

-- CreateIndex
CREATE INDEX "PersonaChatSession_workspaceId_personaId_idx" ON "PersonaChatSession"("workspaceId", "personaId");

-- CreateIndex
CREATE INDEX "PersonaChatMessage_sessionId_idx" ON "PersonaChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PersonaChatInsight_sessionId_idx" ON "PersonaChatInsight"("sessionId");

-- CreateIndex
CREATE INDEX "PersonaChatInsight_messageId_idx" ON "PersonaChatInsight"("messageId");

-- CreateIndex
CREATE INDEX "PersonaChatContext_sessionId_idx" ON "PersonaChatContext"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaChatContext_sessionId_sourceType_sourceId_key" ON "PersonaChatContext"("sessionId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaChatConfig_workspaceId_key" ON "PersonaChatConfig"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_workspaceId_idx" ON "Product"("workspaceId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_workspaceId_status_idx" ON "Product"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Product_workspaceId_category_idx" ON "Product"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ResearchPlan_workspaceId_idx" ON "ResearchPlan"("workspaceId");

-- CreateIndex
CREATE INDEX "PurchasedBundle_workspaceId_idx" ON "PurchasedBundle"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasedBundle_workspaceId_bundleId_key" ON "PurchasedBundle"("workspaceId", "bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeResource_slug_key" ON "KnowledgeResource"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeResource_workspaceId_idx" ON "KnowledgeResource"("workspaceId");

-- CreateIndex
CREATE INDEX "KnowledgeResource_type_idx" ON "KnowledgeResource"("type");

-- CreateIndex
CREATE INDEX "KnowledgeResource_category_idx" ON "KnowledgeResource"("category");

-- CreateIndex
CREATE INDEX "KnowledgeResource_isFeatured_idx" ON "KnowledgeResource"("isFeatured");

-- CreateIndex
CREATE INDEX "KnowledgeResource_isArchived_idx" ON "KnowledgeResource"("isArchived");

-- CreateIndex
CREATE INDEX "KnowledgeResource_workspaceId_type_idx" ON "KnowledgeResource"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "KnowledgeResource_workspaceId_isArchived_idx" ON "KnowledgeResource"("workspaceId", "isArchived");

-- CreateIndex
CREATE INDEX "Trend_workspaceId_idx" ON "Trend"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketInsight_slug_key" ON "MarketInsight"("slug");

-- CreateIndex
CREATE INDEX "MarketInsight_workspaceId_idx" ON "MarketInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "MarketInsight_category_idx" ON "MarketInsight"("category");

-- CreateIndex
CREATE INDEX "MarketInsight_impactLevel_idx" ON "MarketInsight"("impactLevel");

-- CreateIndex
CREATE INDEX "MarketInsight_timeframe_idx" ON "MarketInsight"("timeframe");

-- CreateIndex
CREATE INDEX "MarketInsight_workspaceId_category_idx" ON "MarketInsight"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "MarketInsight_workspaceId_impactLevel_idx" ON "MarketInsight"("workspaceId", "impactLevel");

-- CreateIndex
CREATE INDEX "InsightSourceUrl_insightId_idx" ON "InsightSourceUrl"("insightId");

-- CreateIndex
CREATE INDEX "AlignmentScan_workspaceId_idx" ON "AlignmentScan"("workspaceId");

-- CreateIndex
CREATE INDEX "AlignmentScan_status_idx" ON "AlignmentScan"("status");

-- CreateIndex
CREATE INDEX "AlignmentScan_workspaceId_status_idx" ON "AlignmentScan"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ModuleScore_scanId_idx" ON "ModuleScore"("scanId");

-- CreateIndex
CREATE INDEX "AlignmentIssue_scanId_idx" ON "AlignmentIssue"("scanId");

-- CreateIndex
CREATE INDEX "AlignmentIssue_workspaceId_idx" ON "AlignmentIssue"("workspaceId");

-- CreateIndex
CREATE INDEX "AlignmentIssue_severity_idx" ON "AlignmentIssue"("severity");

-- CreateIndex
CREATE INDEX "AlignmentIssue_status_idx" ON "AlignmentIssue"("status");

-- CreateIndex
CREATE INDEX "AlignmentIssue_workspaceId_status_idx" ON "AlignmentIssue"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AlignmentIssue_workspaceId_severity_idx" ON "AlignmentIssue"("workspaceId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchBundle_slug_key" ON "ResearchBundle"("slug");

-- CreateIndex
CREATE INDEX "BundleAsset_bundleId_idx" ON "BundleAsset"("bundleId");

-- CreateIndex
CREATE INDEX "BundleMethod_bundleId_idx" ON "BundleMethod"("bundleId");

-- CreateIndex
CREATE INDEX "ValidationPlan_workspaceId_idx" ON "ValidationPlan"("workspaceId");

-- CreateIndex
CREATE INDEX "ValidationPlan_status_idx" ON "ValidationPlan"("status");

-- CreateIndex
CREATE INDEX "ValidationPlan_workspaceId_status_idx" ON "ValidationPlan"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ValidationPlanAsset_planId_idx" ON "ValidationPlanAsset"("planId");

-- CreateIndex
CREATE INDEX "ValidationPlanMethod_planId_idx" ON "ValidationPlanMethod"("planId");

-- CreateIndex
CREATE INDEX "ResearchStudy_workspaceId_idx" ON "ResearchStudy"("workspaceId");

-- CreateIndex
CREATE INDEX "ResearchStudy_status_idx" ON "ResearchStudy"("status");

-- CreateIndex
CREATE INDEX "ResearchStudy_personaId_idx" ON "ResearchStudy"("personaId");

-- CreateIndex
CREATE INDEX "ResearchStudy_workspaceId_status_idx" ON "ResearchStudy"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "BundlePurchase_workspaceId_idx" ON "BundlePurchase"("workspaceId");

-- CreateIndex
CREATE INDEX "BundlePurchase_bundleId_idx" ON "BundlePurchase"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "help_category_slug_key" ON "help_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "help_article_slug_key" ON "help_article"("slug");

-- CreateIndex
CREATE INDEX "help_article_categoryId_idx" ON "help_article"("categoryId");

-- CreateIndex
CREATE INDEX "support_ticket_userId_idx" ON "support_ticket"("userId");

-- CreateIndex
CREATE INDEX "support_ticket_workspaceId_idx" ON "support_ticket"("workspaceId");

-- CreateIndex
CREATE INDEX "support_ticket_status_idx" ON "support_ticket"("status");

-- CreateIndex
CREATE INDEX "support_ticket_workspaceId_status_idx" ON "support_ticket"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "feature_request_submittedById_idx" ON "feature_request"("submittedById");

-- CreateIndex
CREATE INDEX "feature_request_status_idx" ON "feature_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "feature_vote_featureRequestId_userId_key" ON "feature_vote"("featureRequestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_rating_userId_key" ON "platform_rating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_stripe_event_eventId_key" ON "processed_stripe_event"("eventId");

-- CreateIndex
CREATE INDEX "processed_stripe_event_eventType_idx" ON "processed_stripe_event"("eventType");

-- CreateIndex
CREATE INDEX "ai_usage_record_workspaceId_createdAt_idx" ON "ai_usage_record"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_record_userId_createdAt_idx" ON "ai_usage_record"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_password_userId_key" ON "user_password"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_preference_userId_key" ON "email_preference"("userId");

-- CreateIndex
CREATE INDEX "connected_account_userId_idx" ON "connected_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "connected_account_userId_provider_key" ON "connected_account"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "plan_slug_key" ON "plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_workspaceId_key" ON "subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_planId_idx" ON "subscription"("planId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "payment_method_workspaceId_idx" ON "payment_method"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_stripeInvoiceId_key" ON "invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_workspaceId_idx" ON "invoice"("workspaceId");

-- CreateIndex
CREATE INDEX "invoice_workspaceId_status_idx" ON "invoice"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_userId_key" ON "notification_preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "appearance_preference_userId_key" ON "appearance_preference"("userId");

-- CreateIndex
CREATE INDEX "ResourceVersion_resourceType_resourceId_idx" ON "ResourceVersion"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceVersion_workspaceId_idx" ON "ResourceVersion"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceVersion_resourceType_resourceId_version_key" ON "ResourceVersion"("resourceType", "resourceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DetectedTrend_slug_key" ON "DetectedTrend"("slug");

-- CreateIndex
CREATE INDEX "DetectedTrend_workspaceId_idx" ON "DetectedTrend"("workspaceId");

-- CreateIndex
CREATE INDEX "DetectedTrend_workspaceId_category_idx" ON "DetectedTrend"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "DetectedTrend_workspaceId_impactLevel_idx" ON "DetectedTrend"("workspaceId", "impactLevel");

-- CreateIndex
CREATE INDEX "DetectedTrend_workspaceId_isActivated_idx" ON "DetectedTrend"("workspaceId", "isActivated");

-- CreateIndex
CREATE INDEX "DetectedTrend_workspaceId_isDismissed_idx" ON "DetectedTrend"("workspaceId", "isDismissed");

-- CreateIndex
CREATE INDEX "TrendResearchJob_workspaceId_idx" ON "TrendResearchJob"("workspaceId");

-- CreateIndex
CREATE INDEX "TrendResearchJob_status_idx" ON "TrendResearchJob"("status");

-- CreateIndex
CREATE INDEX "Competitor_workspaceId_idx" ON "Competitor"("workspaceId");

-- CreateIndex
CREATE INDEX "Competitor_workspaceId_tier_idx" ON "Competitor"("workspaceId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_workspaceId_slug_key" ON "Competitor"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_ai_config_workspaceId_featureKey_key" ON "workspace_ai_config"("workspaceId", "featureKey");

-- CreateIndex
CREATE INDEX "WebsiteScan_workspaceId_idx" ON "WebsiteScan"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceIntegration_workspaceId_idx" ON "WorkspaceIntegration"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceIntegration_workspaceId_provider_key" ON "WorkspaceIntegration"("workspaceId", "provider");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMemberAccess" ADD CONSTRAINT "WorkspaceMemberAccess_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMemberAccess" ADD CONSTRAINT "WorkspaceMemberAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetVersion" ADD CONSTRAINT "BrandAssetVersion_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetVersion" ADD CONSTRAINT "BrandAssetVersion_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetResearchMethod" ADD CONSTRAINT "BrandAssetResearchMethod_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAssetResearchMethod" ADD CONSTRAINT "BrandAssetResearchMethod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssetLink" ADD CONSTRAINT "InterviewAssetLink_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssetLink" ADD CONSTRAINT "InterviewAssetLink_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_linkedAssetId_fkey" FOREIGN KEY ("linkedAssetId") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionTemplate" ADD CONSTRAINT "InterviewQuestionTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignKnowledgeAsset" ADD CONSTRAINT "CampaignKnowledgeAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_derivedFromId_fkey" FOREIGN KEY ("derivedFromId") REFERENCES "Deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTeamMember" ADD CONSTRAINT "CampaignTeamMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableComponent" ADD CONSTRAINT "DeliverableComponent_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsertedInsight" ADD CONSTRAINT "InsertedInsight_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImproveSuggestion" ADD CONSTRAINT "ImproveSuggestion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTemplate" ADD CONSTRAINT "CampaignTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStrategy" ADD CONSTRAINT "BusinessStrategy_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStrategy" ADD CONSTRAINT "BusinessStrategy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStrategy" ADD CONSTRAINT "BusinessStrategy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BusinessStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BusinessStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusArea" ADD CONSTRAINT "FocusArea_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BusinessStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BusinessStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignStrategy" ADD CONSTRAINT "CampaignStrategy_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "BusinessStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignStrategy" ADD CONSTRAINT "CampaignStrategy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignObjective" ADD CONSTRAINT "CampaignObjective_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignObjective" ADD CONSTRAINT "CampaignObjective_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandStyleguide" ADD CONSTRAINT "BrandStyleguide_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandStyleguide" ADD CONSTRAINT "BrandStyleguide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandStyleguide" ADD CONSTRAINT "BrandStyleguide_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleguideColor" ADD CONSTRAINT "StyleguideColor_styleguideId_fkey" FOREIGN KEY ("styleguideId") REFERENCES "BrandStyleguide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaResearchMethod" ADD CONSTRAINT "PersonaResearchMethod_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaResearchMethod" ADD CONSTRAINT "PersonaResearchMethod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisMessage" ADD CONSTRAINT "AIPersonaAnalysisMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIPersonaAnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationSession" ADD CONSTRAINT "ExplorationSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationSession" ADD CONSTRAINT "ExplorationSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationMessage" ADD CONSTRAINT "ExplorationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExplorationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationConfig" ADD CONSTRAINT "ExplorationConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationKnowledgeItem" ADD CONSTRAINT "ExplorationKnowledgeItem_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ExplorationConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKnowledgeSource" ADD CONSTRAINT "ItemKnowledgeSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatMessage" ADD CONSTRAINT "PersonaChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PersonaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatInsight" ADD CONSTRAINT "PersonaChatInsight_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PersonaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatInsight" ADD CONSTRAINT "PersonaChatInsight_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "PersonaChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatContext" ADD CONSTRAINT "PersonaChatContext_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PersonaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatConfig" ADD CONSTRAINT "PersonaChatConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPlan" ADD CONSTRAINT "ResearchPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedBundle" ADD CONSTRAINT "PurchasedBundle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeResource" ADD CONSTRAINT "KnowledgeResource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trend" ADD CONSTRAINT "Trend_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPersona" ADD CONSTRAINT "ProductPersona_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPersona" ADD CONSTRAINT "ProductPersona_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketInsight" ADD CONSTRAINT "MarketInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightSourceUrl" ADD CONSTRAINT "InsightSourceUrl_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "MarketInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentScan" ADD CONSTRAINT "AlignmentScan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleScore" ADD CONSTRAINT "ModuleScore_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "AlignmentScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentIssue" ADD CONSTRAINT "AlignmentIssue_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "AlignmentScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleAsset" ADD CONSTRAINT "BundleAsset_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ResearchBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleMethod" ADD CONSTRAINT "BundleMethod_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ResearchBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationPlan" ADD CONSTRAINT "ValidationPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationPlanAsset" ADD CONSTRAINT "ValidationPlanAsset_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ValidationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationPlanMethod" ADD CONSTRAINT "ValidationPlanMethod_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ValidationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStudy" ADD CONSTRAINT "ResearchStudy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePurchase" ADD CONSTRAINT "BundlePurchase_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ResearchBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_article" ADD CONSTRAINT "help_article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "help_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_vote" ADD CONSTRAINT "feature_vote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "feature_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_vote" ADD CONSTRAINT "feature_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_rating" ADD CONSTRAINT "platform_rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_password" ADD CONSTRAINT "user_password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_preference" ADD CONSTRAINT "email_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_account" ADD CONSTRAINT "connected_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appearance_preference" ADD CONSTRAINT "appearance_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceVersion" ADD CONSTRAINT "ResourceVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceVersion" ADD CONSTRAINT "ResourceVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedTrend" ADD CONSTRAINT "DetectedTrend_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedTrend" ADD CONSTRAINT "DetectedTrend_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedTrend" ADD CONSTRAINT "DetectedTrend_researchJobId_fkey" FOREIGN KEY ("researchJobId") REFERENCES "TrendResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedTrend" ADD CONSTRAINT "DetectedTrend_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendResearchJob" ADD CONSTRAINT "TrendResearchJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProduct" ADD CONSTRAINT "CompetitorProduct_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProduct" ADD CONSTRAINT "CompetitorProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_ai_config" ADD CONSTRAINT "workspace_ai_config_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteScan" ADD CONSTRAINT "WebsiteScan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteScan" ADD CONSTRAINT "WebsiteScan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceIntegration" ADD CONSTRAINT "WorkspaceIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

