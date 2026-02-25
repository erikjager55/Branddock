import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { DEFAULT_PERSONA_CHAT_PROMPT } from "./seed/persona-chat-config";
import type { NotificationType, NotificationCategory, AssetCategory, AssetStatus, AIMessageType, ResearchMethodType, ResearchMethodStatus, WorkshopStatus, InterviewStatus, InterviewQuestionType, StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority, StyleguideStatus, StyleguideSource, AnalysisStatus, ColorCategory, PersonaAvatarSource, PersonaResearchMethodType, InsightCategory, InsightScope, ImpactLevel, InsightTimeframe, InsightSource, ScanStatus, AlignmentModule, IssueSeverity, IssueStatus, ResourceSource, ProductSource, ProductStatus, DifficultyLevel, BundleCategory, ValidationPlanStatus, StudyStatus, PurchaseStatus, CampaignType, CampaignStatus, DeliverableStatus, InsertFormat, SuggestionStatus, TicketCategory, TicketPriority, TicketStatus, FeatureRequestStatus, OAuthProvider, ConnectionStatus, BillingCycle, InvoiceStatus, Theme, AccentColor, FontSize, SidebarPosition, SubscriptionStatus } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Cleanup existing data (in reverse dependency order)
  // S9: Settings
  await prisma.appearancePreference.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.connectedAccount.deleteMany();
  await prisma.emailPreference.deleteMany();
  await prisma.userPassword.deleteMany();
  await prisma.userProfile.deleteMany();

  // S9: Help & Support
  await prisma.platformRating.deleteMany();
  await prisma.featureVote.deleteMany();
  await prisma.featureRequest.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.videoTutorial.deleteMany();
  await prisma.helpArticle.deleteMany();
  await prisma.helpCategory.deleteMany();

  // Better Auth
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();

  // Organization / Multi-tenant
  await prisma.invitation.deleteMany();
  await prisma.workspaceMemberAccess.deleteMany();
  await prisma.organizationMember.deleteMany();

  // Personas — chat AI
  await prisma.personaChatContext.deleteMany();
  await prisma.personaChatInsight.deleteMany();
  await prisma.personaChatMessage.deleteMany();
  await prisma.personaChatSession.deleteMany();
  await prisma.personaChatConfig.deleteMany();
  await prisma.aIPersonaAnalysisMessage.deleteMany();
  await prisma.aIPersonaAnalysisSession.deleteMany();
  await prisma.personaResearchMethod.deleteMany();
  await prisma.productPersona.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.styleguideColor.deleteMany();
  await prisma.brandStyleguide.deleteMany();
  // S6: Campaigns + Content Studio
  await prisma.improveSuggestion.deleteMany();
  await prisma.insertedInsight.deleteMany();
  await prisma.contentVersion.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.campaignKnowledgeAsset.deleteMany();
  await prisma.campaignTeamMember.deleteMany();
  await prisma.campaignTemplate.deleteMany();
  await prisma.campaignObjective.deleteMany();
  await prisma.campaignStrategy.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.focusArea.deleteMany();
  await prisma.businessStrategy.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.interviewQuestion.deleteMany();
  await prisma.interviewAssetLink.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.interviewQuestionTemplate.deleteMany();
  await prisma.workshopAgendaItem.deleteMany();
  await prisma.workshopObjective.deleteMany();
  await prisma.workshopPhoto.deleteMany();
  await prisma.workshopNote.deleteMany();
  await prisma.workshopParticipant.deleteMany();
  await prisma.workshopRecommendation.deleteMany();
  await prisma.workshopFinding.deleteMany();
  await prisma.workshopStep.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.workshopBundle.deleteMany();
  await prisma.brandAssetVersion.deleteMany();
  await prisma.brandAssetResearchMethod.deleteMany();
  await prisma.aIAnalysisMessage.deleteMany();
  await prisma.aIBrandAnalysisSession.deleteMany();
  await prisma.brandAsset.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.dashboardPreference.deleteMany();
  // S5: Research & Validation
  await prisma.bundlePurchase.deleteMany();
  await prisma.researchStudy.deleteMany();
  await prisma.validationPlanMethod.deleteMany();
  await prisma.validationPlanAsset.deleteMany();
  await prisma.validationPlan.deleteMany();
  await prisma.bundleMethod.deleteMany();
  await prisma.bundleAsset.deleteMany();
  await prisma.researchBundle.deleteMany();

  // R0.1: Tables without cascade to workspace
  await prisma.insightSourceUrl.deleteMany();
  await prisma.marketInsight.deleteMany();
  await prisma.alignmentIssue.deleteMany();
  await prisma.moduleScore.deleteMany();
  await prisma.alignmentScan.deleteMany();
  await prisma.product.deleteMany();
  await prisma.knowledgeResource.deleteMany();
  await prisma.trend.deleteMany();
  await prisma.researchPlan.deleteMany();
  await prisma.purchasedBundle.deleteMany();
  // Versioning (generic table, references User)
  await prisma.resourceVersion.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();

  // ============================================
  // FIXED IDs — voorkomt .env.local wijziging bij reseed
  // ============================================
  const DEMO_ORG_ID = "demo-org-branddock-001";
  const DEMO_WORKSPACE_ID = "demo-workspace-branddock-001";
  const DEMO_USER_ID = "demo-user-erik-001";

  // ============================================
  // ORGANIZATION (Agency demo)
  // ============================================
  const organization = await prisma.organization.create({
    data: {
      id: DEMO_ORG_ID,
      name: "Branddock Agency",
      slug: "branddock-agency",
      type: "AGENCY",
      subscriptionStatus: "ACTIVE",
      maxSeats: 10,
      maxWorkspaces: 5,
    },
  });

  // Workspace (nu gekoppeld aan Organization)
  const workspace = await prisma.workspace.create({
    data: {
      id: DEMO_WORKSPACE_ID,
      name: "Branddock Demo",
      slug: "branddock-demo",
      organizationId: organization.id,
    },
  });

  // User
  const user = await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      email: "erik@branddock.com",
      name: "Erik Jager",
      workspaceId: workspace.id,
    },
  });

  // OrganizationMember — Erik als owner
  await prisma.organizationMember.create({
    data: {
      role: "owner",
      userId: user.id,
      organizationId: organization.id,
    },
  });

  // Tweede user + member (demo teamlid)
  const teamMember = await prisma.user.create({
    data: {
      email: "sarah@branddock.com",
      name: "Sarah Chen",
      workspaceId: workspace.id,
    },
  });

  await prisma.organizationMember.create({
    data: {
      role: "member",
      userId: teamMember.id,
      organizationId: organization.id,
    },
  });

  // WorkspaceMemberAccess voor teamlid
  const teamMembership = await prisma.organizationMember.findFirst({
    where: { userId: teamMember.id, organizationId: organization.id },
  });
  if (teamMembership) {
    await prisma.workspaceMemberAccess.create({
      data: {
        memberId: teamMembership.id,
        workspaceId: workspace.id,
      },
    });
  }

  // Demo invitation (pending)
  await prisma.invitation.create({
    data: {
      email: "tom.wilson@agency.com",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dagen
      organizationId: organization.id,
      invitedById: user.id,
    },
  });

  // === Tweede Organization (DIRECT klant) voor multi-tenant demo ===
  const directOrg = await prisma.organization.create({
    data: {
      name: "TechCorp Inc.",
      slug: "techcorp",
      type: "DIRECT",
      subscriptionStatus: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dagen trial
      maxSeats: 3,
      maxWorkspaces: 1,
    },
  });

  const directWorkspace = await prisma.workspace.create({
    data: {
      name: "TechCorp Brand",
      slug: "techcorp-brand",
      organizationId: directOrg.id,
    },
  });

  const directUser = await prisma.user.create({
    data: {
      email: "john@techcorp.com",
      name: "John Smith",
      workspaceId: directWorkspace.id,
    },
  });

  await prisma.organizationMember.create({
    data: {
      role: "owner",
      userId: directUser.id,
      organizationId: directOrg.id,
    },
  });

  // Better Auth Account records (credential provider voor emailAndPassword login)
  const seedPassword = await hashPassword("Password123!");

  for (const seedUser of [user, teamMember, directUser]) {
    await prisma.account.create({
      data: {
        accountId: seedUser.id,
        providerId: "credential",
        userId: seedUser.id,
        password: seedPassword,
      },
    });
  }

  // Dashboard Preferences
  await prisma.dashboardPreference.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      onboardingComplete: true,
      quickStartItems: [
        { key: "brand_asset", label: "Create your first brand asset", completed: false, href: "/knowledge/brand-foundation" },
        { key: "persona", label: "Define your target persona", completed: false, href: "/knowledge/personas" },
        { key: "research", label: "Plan your first research session", completed: false, href: "/validation/research-hub" },
        { key: "campaign", label: "Generate your first campaign strategy", completed: false, href: "/campaigns/new" },
      ],
    },
  });

  // 15 Notifications (mix van types, 5 unread)
  const notificationData: Array<{
    type: NotificationType;
    title: string;
    description: string;
    category: NotificationCategory;
    isRead: boolean;
    actorName: string;
  }> = [
    { type: "DATA_RELATIONSHIP_CREATED", title: "New relationship discovered", description: "Brand Foundation linked to 3 personas", category: "BRAND_ASSETS", isRead: false, actorName: "System" },
    { type: "RESEARCH_COMPLETED", title: "Research study completed", description: "Customer Interview Round 2 finished", category: "RESEARCH", isRead: false, actorName: "Sarah Chen" },
    { type: "FILE_UPLOADED", title: "New file uploaded", description: "Brand Guidelines v2.pdf added to library", category: "BRAND_ASSETS", isRead: false, actorName: "Erik Jager" },
    { type: "MILESTONE_REACHED", title: "Milestone reached!", description: "Brand Foundation is now 80% complete", category: "STRATEGY", isRead: false, actorName: "System" },
    { type: "COMMENT_ADDED", title: "New comment on Brand Voice", description: "Tom left feedback on tone guidelines", category: "COLLABORATION", isRead: false, actorName: "Tom Wilson" },
    { type: "RESEARCH_PLAN_CREATED", title: "Research plan created", description: "Q1 Persona Validation plan is ready", category: "RESEARCH", isRead: true, actorName: "Sarah Chen" },
    { type: "ASSET_STATUS_UPDATED", title: "Asset status changed", description: "Mission Statement moved to Review", category: "BRAND_ASSETS", isRead: true, actorName: "Erik Jager" },
    { type: "RESEARCH_INSIGHT_ADDED", title: "New insight added", description: "AI trend analysis found 3 new insights", category: "RESEARCH", isRead: true, actorName: "System" },
    { type: "NEW_PERSONA_CREATED", title: "New persona created", description: "Tech-Savvy Millennial added", category: "PERSONAS", isRead: true, actorName: "Erik Jager" },
    { type: "NEW_RESEARCH_STARTED", title: "Research started", description: "User Testing for Product Page launched", category: "RESEARCH", isRead: true, actorName: "Sarah Chen" },
    { type: "DATA_RELATIONSHIP_CREATED", title: "Cross-reference found", description: "Market insight linked to Business Strategy", category: "STRATEGY", isRead: true, actorName: "System" },
    { type: "FILE_UPLOADED", title: "Design asset added", description: "Logo variations uploaded to Brand Assets", category: "BRAND_ASSETS", isRead: true, actorName: "Tom Wilson" },
    { type: "COMMENT_ADDED", title: "Feedback received", description: "Sarah commented on persona research", category: "COLLABORATION", isRead: true, actorName: "Sarah Chen" },
    { type: "MILESTONE_REACHED", title: "Strategy milestone", description: "All OKRs for Q1 defined", category: "STRATEGY", isRead: true, actorName: "System" },
    { type: "ASSET_STATUS_UPDATED", title: "Asset validated", description: "Brand Promise passed research validation", category: "BRAND_ASSETS", isRead: true, actorName: "System" },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({
      data: {
        ...n,
        workspaceId: workspace.id,
        userId: user.id,
      },
    });
  }

  // 13 Brand Assets (Fase 1A)
  const brandAssets: Array<{
    name: string;
    slug: string;
    category: AssetCategory;
    description: string;
    status: AssetStatus;
    coverage: number;
    ai: boolean;
    workshop: boolean;
    interview: boolean;
    questionnaire: boolean;
  }> = [
    { name: "Social Relevancy",     slug: "social-relevancy",     category: "PURPOSE",       description: "How your brand contributes to society",     status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },
    { name: "Brand Tone & Voice",   slug: "brand-tone-voice",     category: "COMMUNICATION", description: "Consistent voice and tone guidelines",      status: "IN_PROGRESS",     coverage: 35,  ai: true,  workshop: false, interview: false, questionnaire: false },
    { name: "Brand Promise",        slug: "brand-promise",        category: "STRATEGY",      description: "Core commitment to your customers",         status: "NEEDS_ATTENTION", coverage: 45,  ai: true,  workshop: false, interview: false, questionnaire: false },
    { name: "Vision Statement",     slug: "vision-statement",     category: "STRATEGY",      description: "Forward-looking declaration of intent",      status: "READY",           coverage: 92,  ai: true,  workshop: true,  interview: true,  questionnaire: false },
    { name: "Mission Statement",    slug: "mission-statement",    category: "STRATEGY",      description: "What you do, how, and for whom",             status: "NEEDS_ATTENTION", coverage: 60,  ai: true,  workshop: true,  interview: false, questionnaire: false },
    { name: "Transformative Goals", slug: "transformative-goals", category: "STRATEGY",      description: "Ambitious goals for lasting impact",         status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },
    { name: "Brand Positioning",    slug: "brand-positioning",    category: "STRATEGY",      description: "Market position vs competitors",              status: "IN_PROGRESS",     coverage: 25,  ai: true,  workshop: false, interview: false, questionnaire: false },
    { name: "Brand Story",          slug: "brand-story",          category: "NARRATIVE",     description: "Your brand's past, present and future",      status: "IN_PROGRESS",     coverage: 50,  ai: true,  workshop: true,  interview: false, questionnaire: false },
    { name: "Brand Essence",        slug: "brand-essence",        category: "CORE",          description: "The heart and soul of your brand",           status: "DRAFT",           coverage: 0,   ai: false, workshop: false, interview: false, questionnaire: false },
    { name: "Brand Personality",    slug: "brand-personality",    category: "PERSONALITY",   description: "Human characteristics of your brand",        status: "IN_PROGRESS",     coverage: 40,  ai: true,  workshop: false, interview: false, questionnaire: false },
    { name: "Brand Archetype",      slug: "brand-archetype",      category: "PERSONALITY",   description: "Universal behavior patterns",                 status: "READY",           coverage: 85,  ai: true,  workshop: true,  interview: true,  questionnaire: true },
    { name: "Golden Circle",        slug: "golden-circle",        category: "FOUNDATION",    description: "Simon Sinek's WHY → HOW → WHAT framework",  status: "IN_PROGRESS",     coverage: 55,  ai: true,  workshop: true,  interview: false, questionnaire: false },
    { name: "Core Values",          slug: "core-values",          category: "CULTURE",       description: "Fundamental beliefs that guide your brand",   status: "NEEDS_ATTENTION", coverage: 70,  ai: true,  workshop: true,  interview: true,  questionnaire: false },
  ];

  for (const asset of brandAssets) {
    const validatedCount = [asset.ai, asset.workshop, asset.interview, asset.questionnaire].filter(Boolean).length;
    await prisma.brandAsset.create({
      data: {
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        description: asset.description,
        status: asset.status,
        coveragePercentage: asset.coverage,
        validatedCount,
        aiValidated: asset.ai,
        workshopValidated: asset.workshop,
        interviewValidated: asset.interview,
        questionnaireValidated: asset.questionnaire,
        workspaceId: workspace.id,
      },
    });
  }

  // AI Brand Analysis Session (Fase 1B) — for Vision Statement
  const visionAsset = await prisma.brandAsset.findFirst({
    where: { slug: "vision-statement", workspaceId: workspace.id },
  });

  if (visionAsset) {
    const session = await prisma.aIBrandAnalysisSession.create({
      data: {
        status: "REPORT_READY",
        progress: 125,
        totalQuestions: 8,
        answeredQuestions: 10,
        brandAssetId: visionAsset.id,
        workspaceId: workspace.id,
        createdById: user.id,
        completedAt: new Date(),
        lastUpdatedAt: new Date(),
        reportData: JSON.stringify({
          executiveSummary: "Based on comprehensive analysis of your vision statement, we identified strong alignment between stated values and market positioning. Key areas for improvement include audience specificity and competitive differentiation. The vision directly connects to societal impact through brand-led innovation.",
          findings: [
            { key: "brand_purpose", title: "Strong Purpose Foundation", description: "Your brand purpose clearly articulates the value you provide to organizations seeking authentic brand strategies.", icon: "Target" },
            { key: "target_audience", title: "Audience Needs Refinement", description: "While the mid-market focus is clear, specific pain points and decision-making patterns need deeper exploration.", icon: "Users" },
            { key: "unique_value", title: "Compelling Value Proposition", description: "The combination of AI-powered analysis with human research methods creates a unique market position.", icon: "Sparkles" },
            { key: "customer_challenge", title: "Budget Sensitivity Identified", description: "Target customers are price-sensitive and need clear ROI justification for brand strategy investments.", icon: "Lightbulb" },
            { key: "market_position", title: "Emerging Market Opportunity", description: "Growing demand for accessible brand strategy tools positions you well in an underserved segment.", icon: "TrendingUp" },
          ],
          recommendations: [
            { number: 1, title: "Develop Customer Personas", description: "Create 3-5 detailed personas for different segments within the 50-500 employee range.", priority: "high" },
            { number: 2, title: "Quantify ROI Metrics", description: "Build case studies showing measurable brand impact to address budget sensitivity.", priority: "high" },
            { number: 3, title: "Competitive Positioning Map", description: "Create a visual positioning map highlighting your unique AI+research combination.", priority: "medium" },
            { number: 4, title: "Content Strategy Alignment", description: "Ensure all content channels reflect the research-validated methodology differentiator.", priority: "medium" },
            { number: 5, title: "Community Building", description: "Launch a community for brand strategists to share insights and best practices.", priority: "low" },
          ],
          dataPointsCount: 47,
          sourcesCount: 12,
          confidenceScore: 87,
          completedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        }),
      },
    });

    const messages: Array<{ type: AIMessageType; content: string; orderIndex: number }> = [
      { type: "SYSTEM_INTRO", content: "Welcome to AI Brand Analysis! I'll help you explore and validate your brand framework through a series of questions. Let's start by understanding your brand purpose.", orderIndex: 0 },
      { type: "AI_QUESTION", content: "What is the core purpose of your brand? In other words, why does your organization exist beyond making a profit?", orderIndex: 1 },
      { type: "USER_ANSWER", content: "We exist to empower organizations to build authentic, research-validated brand strategies. Too many companies rely on gut feeling instead of real data.", orderIndex: 2 },
      { type: "AI_FEEDBACK", content: "Great foundation! Your purpose focuses on authenticity and validation, which differentiates you from traditional branding agencies. Let me dig deeper into your target audience.", orderIndex: 3 },
      { type: "AI_QUESTION", content: "Who is your primary target audience? Describe the ideal customer in terms of company size, industry, and current brand maturity.", orderIndex: 4 },
      { type: "USER_ANSWER", content: "Mid-market companies, 50-500 employees. They know they need better branding but can't afford enterprise agencies. Often marketing teams of 2-5 people.", orderIndex: 5 },
      { type: "AI_FEEDBACK", content: "Excellent specificity. The 50-500 employee range with small marketing teams is an underserved segment. This creates a strong positioning opportunity.", orderIndex: 6 },
      { type: "AI_QUESTION", content: "What makes your approach unique compared to other brand strategy tools or agencies?", orderIndex: 7 },
      { type: "USER_ANSWER", content: "We combine AI analysis with real research methods - interviews, workshops, questionnaires. It's not just AI-generated, it's AI-assisted with human validation.", orderIndex: 8 },
      { type: "AI_FEEDBACK", content: "The AI + human research hybrid is a powerful differentiator. Most tools are either fully automated or fully manual. Your combination addresses both efficiency and credibility concerns.", orderIndex: 9 },
    ];

    for (const msg of messages) {
      await prisma.aIAnalysisMessage.create({
        data: { ...msg, sessionId: session.id },
      });
    }
  }

  // === FASE 1C: Research Methods, Frameworks, Version History ===

  // Research methods for all 13 assets
  const allAssets = await prisma.brandAsset.findMany({
    where: { workspaceId: workspace.id },
  });

  const methodTypes: ResearchMethodType[] = ["AI_EXPLORATION", "WORKSHOP", "INTERVIEWS", "QUESTIONNAIRE"];

  for (const asset of allAssets) {
    for (const method of methodTypes) {
      let status: ResearchMethodStatus = "AVAILABLE";
      let progress = 0;

      // Assets with high coverage have validated methods
      if (asset.status === "READY") {
        if (method === "AI_EXPLORATION") { status = "VALIDATED"; progress = 100; }
        else if (method === "WORKSHOP") { status = "COMPLETED"; progress = 100; }
        else { status = "AVAILABLE"; progress = 0; }
      } else if (asset.status === "IN_PROGRESS") {
        if (method === "AI_EXPLORATION") { status = "IN_PROGRESS"; progress = 60; }
        else { status = "AVAILABLE"; progress = 0; }
      }

      await prisma.brandAssetResearchMethod.create({
        data: {
          method,
          status,
          progress,
          completedAt: status === "VALIDATED" || status === "COMPLETED" ? new Date() : null,
          brandAssetId: asset.id,
        },
      });
    }
  }

  // Framework data for specific assets
  const frameworkAssignments = [
    { slug: "social-relevancy", frameworkType: "ESG", frameworkData: {
      pillars: {
        environmental: { impact: "medium", description: "Sustainable packaging initiatives and carbon-neutral operations.", projectCount: 3 },
        social: { impact: "high", description: "Community engagement programs and diversity initiatives.", programCount: 7 },
        governance: { impact: "medium", description: "Transparent reporting and ethical supply chain.", policyCount: 5 },
      },
    }},
    { slug: "golden-circle", frameworkType: "GOLDEN_CIRCLE", frameworkData: {
      why: { statement: "To empower brands to communicate authentically", details: "We believe every brand has a unique story that deserves to be told consistently and compellingly." },
      how: { statement: "Through AI-powered brand strategy tools", details: "By combining human creativity with AI analysis to bridge the gap between strategy and execution." },
      what: { statement: "A platform for brand strategy and content generation", details: "Branddock helps teams define, validate, and activate their brand across all channels." },
    }},
    { slug: "brand-promise", frameworkType: "SWOT", frameworkData: {
      strengths: ["AI-powered insights", "Affordable pricing", "Easy onboarding", "Research-validated methodology"],
      weaknesses: ["Limited enterprise features", "New market entrant", "Small team"],
      opportunities: ["Growing demand for brand tools", "AI adoption trend", "Underserved mid-market segment"],
      threats: ["Established competitors", "Economic uncertainty", "AI commoditization"],
    }},
  ];

  for (const fa of frameworkAssignments) {
    await prisma.brandAsset.updateMany({
      where: { slug: fa.slug, workspaceId: workspace.id },
      data: { frameworkType: fa.frameworkType, frameworkData: JSON.stringify(fa.frameworkData) },
    });
  }

  // S1: Content for first 3 assets
  const assetContentUpdates = [
    { slug: "social-relevancy", content: "Our brand purpose is to empower organizations to build authentic, research-validated brand strategies that drive meaningful connections with their audiences." },
    { slug: "brand-tone-voice", content: "We stand for transparency, innovation, and human-centered design in everything we create. Our brand values guide every decision from product development to customer support." },
    { slug: "brand-promise", content: "Our target audience consists of mid-market companies (50-500 employees) seeking to professionalize their brand strategy without enterprise-level budgets." },
  ];

  for (const update of assetContentUpdates) {
    await prisma.brandAsset.updateMany({
      where: { slug: update.slug, workspaceId: workspace.id },
      data: { content: update.content },
    });
  }

  // S1: Version history for first 3 assets
  const assetsForVersions = await prisma.brandAsset.findMany({
    where: { slug: { in: ["social-relevancy", "brand-tone-voice", "brand-promise"] }, workspaceId: workspace.id },
  });

  for (const asset of assetsForVersions) {
    await prisma.brandAssetVersion.upsert({
      where: { brandAssetId_version: { brandAssetId: asset.id, version: 1 } },
      update: {},
      create: {
        brandAssetId: asset.id,
        version: 1,
        content: `Initial content for ${asset.name}`,
        changeNote: "Initial version",
        changedById: user.id,
      },
    });
  }

  // Version history for Vision Statement (READY asset)
  const visionForVersions = await prisma.brandAsset.findFirst({
    where: { slug: "vision-statement", workspaceId: workspace.id },
  });

  if (visionForVersions) {
    const versions = [
      { version: 1, content: "Initial draft of our vision statement focusing on brand innovation.", changeNote: "Initial creation" },
      { version: 2, content: "Refined vision with emphasis on AI-driven brand strategy and human creativity.", changeNote: "Added AI focus" },
      { version: 3, content: "To be the leading platform where brand strategy meets AI-powered execution, enabling every team to build authentic, consistent brands.", changeNote: "Final approved version" },
    ];

    for (const v of versions) {
      await prisma.brandAssetVersion.create({
        data: { ...v, changedById: user.id, brandAssetId: visionForVersions.id },
      });
    }
  }

  // === FASE 1D: WORKSHOP DATA ===

  // 3 Bundles
  const bundleData = [
    {
      name: "Starter Bundle",
      badge: "Most Popular",
      description: "Essential brand foundation workshop covering your core identity.",
      assetNames: ["Vision Statement", "Mission Statement", "Core Values"],
      basePrice: 1350,
      discount: 100,
      finalPrice: 1250,
    },
    {
      name: "Professional Bundle",
      badge: "Best Value",
      description: "Extended workshop including positioning and archetype discovery.",
      assetNames: ["Vision Statement", "Mission Statement", "Core Values", "Brand Positioning", "Brand Archetype"],
      basePrice: 1450,
      discount: 100,
      finalPrice: 1350,
    },
    {
      name: "Complete Bundle",
      badge: "Comprehensive",
      description: "Full-spectrum brand strategy workshop covering all dimensions.",
      assetNames: ["Vision Statement", "Mission Statement", "Core Values", "Brand Positioning", "Brand Archetype", "Social Relevancy"],
      basePrice: 1550,
      discount: 150,
      finalPrice: 1400,
    },
  ];

  const createdBundles = [];
  for (const b of bundleData) {
    const bundle = await prisma.workshopBundle.create({
      data: { ...b, workspaceId: workspace.id },
    });
    createdBundles.push(bundle);
  }

  // 1 Completed Workshop (Vision Statement)
  const visionForWorkshop = await prisma.brandAsset.findFirst({
    where: { slug: "vision-statement", workspaceId: workspace.id },
  });

  if (visionForWorkshop) {
    const completedWorkshopStatus: WorkshopStatus = "COMPLETED";
    const completedWorkshop = await prisma.workshop.create({
      data: {
        brandAssetId: visionForWorkshop.id,
        status: completedWorkshopStatus,
        bundleId: createdBundles[0].id,
        selectedAssetIds: [],
        workshopCount: 1,
        hasFacilitator: true,
        facilitatorName: "Sarah Chen",
        totalPrice: 1600,
        purchasedAt: new Date("2025-01-10"),
        scheduledDate: new Date("2025-01-15"),
        scheduledTime: "10:00",
        title: "Brand Strategy Workshop — Vision & Purpose",
        currentStep: 6,
        timerSeconds: 5400,
        completedAt: new Date("2025-01-15"),
        participantCount: 8,
        durationMinutes: 90,
        reportGenerated: true,
        canvasLocked: true,
        executiveSummary: "The workshop revealed strong alignment between the leadership team on brand purpose and vision. Key themes of innovation, authenticity, and customer empowerment emerged consistently across all exercises. The team identified a clear gap between current market positioning and aspirational brand identity, providing a roadmap for strategic refinement.",
        canvasData: {
          why: {
            statement: "To empower brands to communicate authentically and consistently",
            details: "We believe every brand has a unique story that deserves to be told with clarity and conviction across every touchpoint.",
          },
          how: {
            statement: "Through AI-powered brand strategy tools that bridge creativity and data",
            details: "By combining human creativity with artificial intelligence, we help teams make better brand decisions faster.",
          },
          what: {
            statement: "A platform for brand strategy definition, validation, and content generation",
            details: "Branddock helps marketing teams define their brand foundation, validate it through research, and generate consistent content at scale.",
          },
        },
        workspaceId: workspace.id,
      },
    });

    // 6 Steps (all completed with responses)
    const workshopSteps = [
      { stepNumber: 1, title: "Introduction & Warm-up", duration: "15 min",
        instructions: "Welcome participants and set the stage. Review objectives and establish ground rules.",
        prompt: "What does our brand mean to you personally? Share one word or phrase.",
        response: "Participants shared diverse perspectives: 'Innovation', 'Trust', 'Empowerment', 'Clarity', 'Future-forward', 'Authentic', 'Partner', 'Catalyst'. Common themes emerged around trust and innovation.",
        isCompleted: true, completedAt: new Date("2025-01-15T10:15:00") },
      { stepNumber: 2, title: "Define the Core Purpose", duration: "30 min",
        instructions: "Explore why your brand exists beyond profit. Use the Golden Circle framework.",
        prompt: "Why does our brand exist? What problem are we uniquely solving?",
        response: "The team identified that brands struggle to maintain consistency across growing channel complexity. Our core purpose is to bridge the gap between brand strategy and execution, making brand consistency achievable for teams of any size.",
        isCompleted: true, completedAt: new Date("2025-01-15T10:45:00") },
      { stepNumber: 3, title: "Identify Your Unique Approach", duration: "30 min",
        instructions: "Define HOW you deliver on your purpose differently from competitors.",
        prompt: "How do we deliver differently? What is our unique methodology?",
        response: "Our unique approach combines AI analysis with human creativity. Unlike pure-play AI tools, we keep humans in the loop for strategic decisions. Unlike traditional agencies, we offer real-time, always-on brand guidance.",
        isCompleted: true, completedAt: new Date("2025-01-15T11:15:00") },
      { stepNumber: 4, title: "Map Customer Connections", duration: "20 min",
        instructions: "Identify emotional and functional connections between brand and customers.",
        prompt: "What emotional and functional benefits does our brand deliver?",
        response: "Customers feel confident and empowered. Functional: saves time, reduces errors, improves consistency. Emotional: reduces anxiety about brand decisions, builds confidence in marketing teams, creates sense of professional growth.",
        isCompleted: true, completedAt: new Date("2025-01-15T11:35:00") },
      { stepNumber: 5, title: "Canvas Review & Refinement", duration: "20 min",
        instructions: "Review the canvas output. Refine language and ensure alignment.",
        prompt: "What needs refinement? Any contradictions or gaps?",
        response: "The team noted that 'AI-powered' could sound cold — refined to emphasize 'AI-augmented human creativity'. Also strengthened the connection between WHY (empowerment) and HOW (keeping humans in the loop).",
        isCompleted: true, completedAt: new Date("2025-01-15T11:55:00") },
      { stepNumber: 6, title: "Synthesis & Action Planning", duration: "15 min",
        instructions: "Synthesize into actionable next steps. Assign owners and timelines.",
        prompt: "What are the top 3 actions based on today's workshop?",
        response: "1. Update brand guidelines with new WHY statement (Marketing lead, 2 weeks). 2. Audit all customer touchpoints for consistency (UX team, 1 month). 3. Create internal brand training program (HR + Marketing, Q2).",
        isCompleted: true, completedAt: new Date("2025-01-15T12:10:00") },
    ];

    for (const step of workshopSteps) {
      await prisma.workshopStep.create({
        data: { ...step, workshopId: completedWorkshop.id },
      });
    }

    // 5 Findings
    const findings = [
      { order: 1, content: "Strong internal alignment exists on brand purpose — all participants independently identified 'empowerment' and 'innovation' as core brand attributes." },
      { order: 2, content: "A significant gap exists between current market positioning (tool-focused) and aspirational brand identity (strategic partner)." },
      { order: 3, content: "The team's approach to AI is a key differentiator — 'AI-augmented human creativity' resonates more strongly than 'AI-powered automation'." },
      { order: 4, content: "Customer emotional benefits (confidence, reduced anxiety) are underrepresented in current marketing materials compared to functional benefits." },
      { order: 5, content: "Cross-functional alignment is strong in leadership but may not extend to all team members — internal brand training is needed." },
    ];

    for (const f of findings) {
      await prisma.workshopFinding.create({
        data: { ...f, workshopId: completedWorkshop.id },
      });
    }

    // 4 Recommendations
    const recommendations = [
      { order: 1, content: "Reposition marketing messaging from 'AI tool' to 'AI-powered brand strategy partner' to reflect the aspirational brand identity.", isCompleted: false },
      { order: 2, content: "Develop emotional benefit messaging that highlights confidence-building and anxiety-reduction alongside functional capabilities.", isCompleted: false },
      { order: 3, content: "Launch an internal brand alignment program to ensure the vision discovered in this workshop permeates all levels of the organization.", isCompleted: false },
      { order: 4, content: "Conduct quarterly brand consistency audits across all customer touchpoints to maintain alignment with the refined brand strategy.", isCompleted: false },
    ];

    for (const r of recommendations) {
      await prisma.workshopRecommendation.create({
        data: { ...r, workshopId: completedWorkshop.id },
      });
    }

    // 8 Participants
    const participants = [
      { name: "David Chen", role: "CEO" },
      { name: "Maria Garcia", role: "CMO" },
      { name: "James Wilson", role: "Head of Product" },
      { name: "Sarah Johnson", role: "Brand Director" },
      { name: "Michael Brown", role: "UX Lead" },
      { name: "Emily Davis", role: "Content Strategist" },
      { name: "Robert Taylor", role: "Sales Director" },
      { name: "Lisa Anderson", role: "HR Manager" },
    ];

    for (const p of participants) {
      await prisma.workshopParticipant.create({
        data: { ...p, workshopId: completedWorkshop.id },
      });
    }

    // 3 Notes
    const notes = [
      { authorName: "David Chen", authorRole: "CEO", content: "Important insight about the gap between our tool positioning and partner aspiration. We need to reflect this in our next funding pitch as well." },
      { authorName: "Maria Garcia", authorRole: "CMO", content: "The 'AI-augmented human creativity' framing is powerful. I want to build our next campaign around this concept — it differentiates us from pure-play AI tools." },
      { authorName: "James Wilson", authorRole: "Head of Product", content: "Product roadmap should prioritize features that reinforce the 'strategic partner' positioning. The canvas workshop feature itself is a great example of this." },
    ];

    for (const n of notes) {
      await prisma.workshopNote.create({
        data: { ...n, workshopId: completedWorkshop.id },
      });
    }

    // 4 Photos
    const photos = [
      { url: "/images/workshop/whiteboard-session.jpg", caption: "Team brainstorming session on brand purpose", order: 1 },
      { url: "/images/workshop/golden-circle-exercise.jpg", caption: "Golden Circle framework exercise in progress", order: 2 },
      { url: "/images/workshop/team-discussion.jpg", caption: "Cross-functional discussion on customer connections", order: 3 },
      { url: "/images/workshop/action-planning.jpg", caption: "Action planning and owner assignment", order: 4 },
    ];

    for (const p of photos) {
      await prisma.workshopPhoto.create({
        data: { ...p, workshopId: completedWorkshop.id },
      });
    }

    // 4 Objectives
    const objectives = [
      { content: "Define the core brand purpose (WHY) through collaborative exploration", isCompleted: true, order: 1 },
      { content: "Identify the unique approach (HOW) that differentiates us from competitors", isCompleted: true, order: 2 },
      { content: "Map emotional and functional customer connections", isCompleted: true, order: 3 },
      { content: "Create actionable next steps with owners and timelines", isCompleted: true, order: 4 },
    ];

    for (const o of objectives) {
      await prisma.workshopObjective.create({
        data: { ...o, workshopId: completedWorkshop.id },
      });
    }

    // 10 Agenda Items
    const agendaItems = [
      { time: "10:00 AM", activity: "Welcome & Introduction", duration: "10 min", details: "Facilitator welcome, participant introductions, workshop objectives review.", order: 1 },
      { time: "10:10 AM", activity: "Ice Breaker Exercise", duration: "5 min", details: "One-word brand association exercise to warm up creative thinking.", order: 2 },
      { time: "10:15 AM", activity: "Brand Purpose Deep Dive", duration: "25 min", details: "Guided exploration of WHY using Golden Circle framework. Individual reflection followed by group discussion.", order: 3 },
      { time: "10:40 AM", activity: "Group Discussion: Core Purpose", duration: "10 min", details: "Share and debate individual findings. Identify common themes.", order: 4 },
      { time: "10:50 AM", activity: "Unique Approach Workshop", duration: "25 min", details: "Competitive landscape mapping and differentiation exercise.", order: 5 },
      { time: "11:15 AM", activity: "Break", duration: "10 min", details: null, order: 6 },
      { time: "11:25 AM", activity: "Customer Connection Mapping", duration: "15 min", details: "Emotional and functional benefit identification using empathy mapping.", order: 7 },
      { time: "11:40 AM", activity: "Canvas Review", duration: "15 min", details: "Review emerging Golden Circle canvas. Identify contradictions and gaps.", order: 8 },
      { time: "11:55 AM", activity: "Refinement & Alignment", duration: "10 min", details: "Final language refinement. Team vote on key statements.", order: 9 },
      { time: "12:05 PM", activity: "Action Planning & Wrap-up", duration: "15 min", details: "Assign action items, set timelines, closing remarks from facilitator.", order: 10 },
    ];

    for (const a of agendaItems) {
      await prisma.workshopAgendaItem.create({
        data: { ...a, workshopId: completedWorkshop.id },
      });
    }
  }

  // 1 Scheduled Workshop (Brand Positioning)
  const positioningAsset = await prisma.brandAsset.findFirst({
    where: { slug: "brand-positioning", workspaceId: workspace.id },
  });

  if (positioningAsset) {
    const scheduledStatus: WorkshopStatus = "SCHEDULED";
    await prisma.workshop.create({
      data: {
        brandAssetId: positioningAsset.id,
        status: scheduledStatus,
        bundleId: createdBundles[1].id,
        selectedAssetIds: [],
        workshopCount: 1,
        hasFacilitator: false,
        totalPrice: 1350,
        purchasedAt: new Date("2025-02-01"),
        scheduledDate: new Date("2025-02-28"),
        scheduledTime: "14:00",
        title: "Brand Positioning Deep-Dive",
        workspaceId: workspace.id,
      },
    });
  }

  // ============================================
  // FASE 1E: INTERVIEW SEED DATA
  // ============================================

  // 1. Question Templates (global — 20 templates)
  const questionTemplates: Array<{
    questionText: string;
    questionType: InterviewQuestionType;
    options: string[];
    category: string;
    assetSlug: string | null;
  }> = [
    // Golden Circle Templates
    { questionText: "What do you believe is our core purpose (WHY)?", questionType: "OPEN", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
    { questionText: "How would you explain our brand's reason for existing to a stranger?", questionType: "OPEN", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
    { questionText: "Rate how clearly our WHY is communicated internally", questionType: "RATING_SCALE", options: [], category: "golden_circle", assetSlug: "brand-purpose" },
    { questionText: "Which of these best describes our unique approach (HOW)?", questionType: "MULTIPLE_CHOICE", options: ["Technology-driven innovation", "Human-centered design", "Data-informed creativity", "Collaborative co-creation"], category: "golden_circle", assetSlug: "brand-purpose" },

    // Core Values Templates
    { questionText: "Which of our stated core values resonates most with your daily work?", questionType: "MULTIPLE_CHOICE", options: ["Innovation", "Authenticity", "Collaboration", "Excellence", "Empowerment"], category: "core_values", assetSlug: "core-values" },
    { questionText: "How well do our core values guide decision-making in your team?", questionType: "RATING_SCALE", options: [], category: "core_values", assetSlug: "core-values" },
    { questionText: "Can you share an example where our values influenced a business decision?", questionType: "OPEN", options: [], category: "core_values", assetSlug: "core-values" },
    { questionText: "Rank these values by how strongly they're lived in the organization", questionType: "RANKING", options: ["Innovation", "Authenticity", "Collaboration", "Excellence"], category: "core_values", assetSlug: "core-values" },

    // Brand Positioning Templates
    { questionText: "How would you position our brand compared to our top 3 competitors?", questionType: "OPEN", options: [], category: "brand_positioning", assetSlug: "brand-positioning" },
    { questionText: "Which attributes best differentiate us from competitors?", questionType: "MULTI_SELECT", options: ["AI-powered tools", "Ease of use", "Brand consistency", "All-in-one platform", "Customer support", "Price"], category: "brand_positioning", assetSlug: "brand-positioning" },
    { questionText: "Rate how effectively we communicate our unique value proposition", questionType: "RATING_SCALE", options: [], category: "brand_positioning", assetSlug: "brand-positioning" },

    // Brand Personality Templates
    { questionText: "If our brand were a person, how would you describe their personality?", questionType: "OPEN", options: [], category: "brand_personality", assetSlug: null },
    { questionText: "Which personality traits should our brand embody?", questionType: "MULTI_SELECT", options: ["Innovative", "Trustworthy", "Bold", "Approachable", "Expert", "Playful"], category: "brand_personality", assetSlug: null },
    { questionText: "Rate how consistently our brand personality comes through in communications", questionType: "RATING_SCALE", options: [], category: "brand_personality", assetSlug: null },

    // General Interview Templates
    { questionText: "What is the single biggest strength of our brand today?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
    { questionText: "What is the biggest risk to our brand in the next 12 months?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
    { questionText: "How aligned is the external brand perception with our internal brand identity?", questionType: "RATING_SCALE", options: [], category: "general", assetSlug: null },
    { questionText: "Which areas of the brand need the most improvement?", questionType: "MULTI_SELECT", options: ["Visual identity", "Messaging consistency", "Customer experience", "Internal culture", "Digital presence", "Market positioning"], category: "general", assetSlug: null },
    { questionText: "Rank these brand priorities for the next quarter", questionType: "RANKING", options: ["Brand awareness", "Customer retention", "Market expansion", "Brand consistency", "Innovation perception"], category: "general", assetSlug: null },
    { questionText: "What one thing would you change about how we present our brand?", questionType: "OPEN", options: [], category: "general", assetSlug: null },
  ];

  for (const qt of questionTemplates) {
    await prisma.interviewQuestionTemplate.create({
      data: { ...qt, workspaceId: null },
    });
  }

  // 2. Completed Interview (#1 — Vision Statement)
  const visionForInterview = await prisma.brandAsset.findFirst({
    where: { slug: "vision-statement", workspaceId: workspace.id },
  });

  if (visionForInterview) {
    const completedInterviewStatus: InterviewStatus = "COMPLETED";
    const interview1 = await prisma.interview.create({
      data: {
        brandAssetId: visionForInterview.id,
        status: completedInterviewStatus,
        title: "Leadership Interview #1",
        orderNumber: 1,
        intervieweeName: "John Smith",
        intervieweePosition: "CEO",
        intervieweeEmail: "john.smith@company.com",
        intervieweePhone: "+1 (555) 123-4567",
        intervieweeCompany: "TechCorp Inc.",
        scheduledDate: new Date("2025-01-19"),
        scheduledTime: "10:00",
        durationMinutes: 45,
        conductedAt: new Date("2025-01-19"),
        actualDuration: 42,
        generalNotes: "Very insightful conversation. John has a strong perspective on brand purpose and was particularly passionate about the AI + human creativity angle. Follow-up needed on competitive positioning insights.",
        isLocked: true,
        lockedAt: new Date("2025-01-20"),
        approvedAt: new Date("2025-01-20"),
        currentStep: 5,
        completedSteps: [1, 2, 3, 4, 5],
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });

    // Link assets
    const coreValuesForInterview = await prisma.brandAsset.findFirst({ where: { slug: "core-values", workspaceId: workspace.id } });
    await prisma.interviewAssetLink.create({
      data: { interviewId: interview1.id, brandAssetId: visionForInterview.id },
    });
    if (coreValuesForInterview) {
      await prisma.interviewAssetLink.create({
        data: { interviewId: interview1.id, brandAssetId: coreValuesForInterview.id },
      });
    }

    // Questions + Answers (6 vragen)
    const interviewQuestions: Array<{
      questionType: InterviewQuestionType;
      questionText: string;
      options: string[];
      linkedAssetId: string | null;
      isFromTemplate: boolean;
      answerText: string | null;
      answerOptions: string[];
      answerRating: number | null;
      answerRanking: string[];
      isAnswered: boolean;
    }> = [
      { questionType: "OPEN", questionText: "What do you believe is our core purpose?", options: [], linkedAssetId: visionForInterview.id, isFromTemplate: true, answerText: "Our core purpose is to democratize brand strategy. Too many companies struggle with translating their vision into daily execution. We exist to bridge that gap through intelligent tools that learn from each brand interaction.", answerOptions: [], answerRating: null, answerRanking: [], isAnswered: true },
      { questionType: "RATING_SCALE", questionText: "Rate how clearly our WHY is communicated internally", options: [], linkedAssetId: visionForInterview.id, isFromTemplate: true, answerText: null, answerOptions: [], answerRating: 4, answerRanking: [], isAnswered: true },
      { questionType: "MULTIPLE_CHOICE", questionText: "Which best describes our unique approach?", options: ["Technology-driven innovation", "Human-centered design", "Data-informed creativity", "Collaborative co-creation"], linkedAssetId: null, isFromTemplate: true, answerText: null, answerOptions: ["Data-informed creativity"], answerRating: null, answerRanking: [], isAnswered: true },
      { questionType: "MULTI_SELECT", questionText: "Which attributes best differentiate us?", options: ["AI-powered tools", "Ease of use", "Brand consistency", "All-in-one platform", "Customer support", "Price"], linkedAssetId: null, isFromTemplate: true, answerText: null, answerOptions: ["AI-powered tools", "Brand consistency", "All-in-one platform"], answerRating: null, answerRanking: [], isAnswered: true },
      { questionType: "RANKING", questionText: "Rank these brand priorities for next quarter", options: ["Brand awareness", "Customer retention", "Market expansion", "Brand consistency", "Innovation perception"], linkedAssetId: null, isFromTemplate: true, answerText: null, answerOptions: [], answerRating: null, answerRanking: ["Brand consistency", "Innovation perception", "Customer retention", "Brand awareness", "Market expansion"], isAnswered: true },
      { questionType: "OPEN", questionText: "What one thing would you change about our brand presentation?", options: [], linkedAssetId: null, isFromTemplate: false, answerText: "I would invest more in emotional storytelling. We're great at explaining what we do functionally, but we need to connect on a deeper level with why it matters to people's daily work lives.", answerOptions: [], answerRating: null, answerRanking: [], isAnswered: true },
    ];

    for (let i = 0; i < interviewQuestions.length; i++) {
      await prisma.interviewQuestion.create({
        data: { ...interviewQuestions[i], interviewId: interview1.id, orderIndex: i + 1 },
      });
    }

    // 3. Scheduled Interview (#2)
    const scheduledInterviewStatus: InterviewStatus = "SCHEDULED";
    const interview2 = await prisma.interview.create({
      data: {
        brandAssetId: visionForInterview.id,
        status: scheduledInterviewStatus,
        title: "Marketing Lead Interview #2",
        orderNumber: 2,
        intervieweeName: "Sarah Johnson",
        intervieweePosition: "CMO",
        intervieweeEmail: "sarah.johnson@company.com",
        intervieweeCompany: "TechCorp Inc.",
        scheduledDate: new Date("2025-02-10"),
        scheduledTime: "14:00",
        durationMinutes: 60,
        currentStep: 3,
        completedSteps: [1, 2],
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });

    await prisma.interviewAssetLink.create({
      data: { interviewId: interview2.id, brandAssetId: visionForInterview.id },
    });

    // 4. Draft Interview (#3 — minimal)
    const draftInterviewStatus: InterviewStatus = "TO_SCHEDULE";
    await prisma.interview.create({
      data: {
        brandAssetId: visionForInterview.id,
        status: draftInterviewStatus,
        title: "Interview #3",
        orderNumber: 3,
        currentStep: 1,
        completedSteps: [],
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });

    // 5. Update research method status for interviews
    await prisma.brandAssetResearchMethod.updateMany({
      where: { brandAssetId: visionForInterview.id, method: "INTERVIEWS" },
      data: { status: "IN_PROGRESS", progress: 33 },
    });
  }

  // ============================================
  // FASE 2: BUSINESS STRATEGY SEED DATA
  // ============================================

  // === Strategy 1: Growth Strategy 2026 (Active, 65%) ===
  const growthStrategyType: StrategyType = "GROWTH";
  const growthStrategyStatus: StrategyStatus = "ACTIVE";
  const growthStrategy = await prisma.businessStrategy.create({
    data: {
      name: "Growth Strategy 2026",
      slug: "growth-strategy-2026",
      description: "Comprehensive growth plan focusing on market expansion, product innovation, and customer acquisition to achieve 40% YoY revenue growth.",
      type: growthStrategyType,
      status: growthStrategyStatus,
      vision: "Become the leading AI-powered brand strategy platform in Europe by end of 2026, serving 500+ enterprise clients.",
      rationale: "The brand strategy market is rapidly evolving with AI capabilities. Early movers who combine AI with human expertise will capture disproportionate market share. Our unique position at the intersection of strategy and execution gives us a competitive advantage.",
      keyAssumptions: [
        "AI adoption in marketing will grow 60% in 2026",
        "Enterprise clients prefer integrated platforms over point solutions",
        "Brand consistency directly correlates with revenue growth",
        "European market is underserved compared to US",
      ],
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      progressPercentage: 65,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // 5 Focus Areas
  const focusAreasData = [
    { name: "Market Expansion", description: "Expand into new European markets", icon: "Globe", color: "#3B82F6" },
    { name: "Product Innovation", description: "AI-powered feature development", icon: "Lightbulb", color: "#8B5CF6" },
    { name: "Customer Acquisition", description: "Scale customer base to 500+", icon: "Users", color: "#10B981" },
    { name: "Brand Authority", description: "Establish thought leadership", icon: "Award", color: "#F59E0B" },
    { name: "Operational Scale", description: "Infrastructure for growth", icon: "Settings", color: "#6B7280" },
  ];
  const createdFocusAreas: Record<string, string> = {};
  for (const fa of focusAreasData) {
    const created = await prisma.focusArea.create({
      data: { ...fa, strategyId: growthStrategy.id },
    });
    createdFocusAreas[fa.name] = created.id;
  }

  // 5 Objectives with Key Results
  const strategyObjectives: Array<{
    title: string;
    description: string;
    status: ObjectiveStatus;
    priority: Priority;
    metricType: MetricType;
    startValue: number;
    targetValue: number;
    currentValue: number;
    focusArea: string;
    keyResults: Array<{ description: string; status: KeyResultStatus; progressValue: string }>;
  }> = [
    {
      title: "Increase Monthly Recurring Revenue by 40%",
      description: "Scale MRR from €50k to €70k through new customer acquisition and upselling existing accounts.",
      status: "ON_TRACK",
      priority: "HIGH",
      metricType: "CURRENCY",
      startValue: 50000,
      targetValue: 70000,
      currentValue: 58000,
      focusArea: "Customer Acquisition",
      keyResults: [
        { description: "Acquire 50 new enterprise customers", status: "ON_TRACK", progressValue: "32/50" },
        { description: "Achieve 95% customer retention rate", status: "COMPLETE", progressValue: "97%" },
        { description: "Increase average deal size to €2,500/mo", status: "ON_TRACK", progressValue: "€2,200/mo" },
      ],
    },
    {
      title: "Launch AI Brand Analysis v2.0",
      description: "Ship next-generation AI analysis with multi-language support and competitive benchmarking.",
      status: "ON_TRACK",
      priority: "HIGH",
      metricType: "PERCENTAGE",
      startValue: 0,
      targetValue: 100,
      currentValue: 72,
      focusArea: "Product Innovation",
      keyResults: [
        { description: "Complete multi-language NLP pipeline", status: "COMPLETE", progressValue: "Done" },
        { description: "Launch competitive benchmarking feature", status: "ON_TRACK", progressValue: "80%" },
        { description: "Achieve 90%+ accuracy on brand sentiment", status: "BEHIND", progressValue: "84%" },
      ],
    },
    {
      title: "Expand to 3 New European Markets",
      description: "Enter Germany, France, and Spain with localized marketing and sales teams.",
      status: "AT_RISK",
      priority: "HIGH",
      metricType: "NUMBER",
      startValue: 0,
      targetValue: 3,
      currentValue: 1,
      focusArea: "Market Expansion",
      keyResults: [
        { description: "Launch German market with local team", status: "COMPLETE", progressValue: "Launched" },
        { description: "Establish French market presence", status: "BEHIND", progressValue: "Delayed" },
        { description: "Begin Spain market research", status: "ON_TRACK", progressValue: "In progress" },
      ],
    },
    {
      title: "Establish Brand Authority in AI Marketing",
      description: "Position Branddock as the thought leader in AI-powered brand strategy through content and events.",
      status: "ON_TRACK",
      priority: "MEDIUM",
      metricType: "NUMBER",
      startValue: 0,
      targetValue: 12,
      currentValue: 7,
      focusArea: "Brand Authority",
      keyResults: [
        { description: "Publish 12 thought leadership articles", status: "ON_TRACK", progressValue: "7/12" },
        { description: "Speak at 4 industry conferences", status: "COMPLETE", progressValue: "4/4" },
        { description: "Achieve 10K LinkedIn followers", status: "ON_TRACK", progressValue: "7.8K" },
      ],
    },
    {
      title: "Scale Infrastructure for 10x User Growth",
      description: "Ensure platform reliability and performance at scale.",
      status: "ON_TRACK",
      priority: "MEDIUM",
      metricType: "PERCENTAGE",
      startValue: 0,
      targetValue: 100,
      currentValue: 55,
      focusArea: "Operational Scale",
      keyResults: [
        { description: "Achieve 99.9% uptime SLA", status: "COMPLETE", progressValue: "99.95%" },
        { description: "Reduce API response time to <200ms", status: "ON_TRACK", progressValue: "240ms" },
        { description: "Implement auto-scaling for 10K concurrent users", status: "ON_TRACK", progressValue: "In progress" },
      ],
    },
  ];

  for (let i = 0; i < strategyObjectives.length; i++) {
    const { keyResults: krs, focusArea, ...objData } = strategyObjectives[i];
    const obj = await prisma.objective.create({
      data: {
        ...objData,
        sortOrder: i,
        focusAreaId: createdFocusAreas[focusArea],
        strategyId: growthStrategy.id,
      },
    });
    for (let j = 0; j < krs.length; j++) {
      await prisma.keyResult.create({
        data: { ...krs[j], sortOrder: j, objectiveId: obj.id },
      });
    }
  }

  // 4 Milestones
  const milestonesData: Array<{
    title: string;
    date: Date;
    quarter: string;
    status: MilestoneStatus;
    completedAt?: Date;
  }> = [
    { title: "Q1 Revenue Target: €55K MRR", date: new Date("2026-03-31"), quarter: "Q1 2026", status: "DONE", completedAt: new Date("2026-02-10") },
    { title: "AI Analysis v2.0 Beta Launch", date: new Date("2026-04-15"), quarter: "Q2 2026", status: "UPCOMING" },
    { title: "Germany Market Launch", date: new Date("2026-02-01"), quarter: "Q1 2026", status: "DONE", completedAt: new Date("2026-01-28") },
    { title: "France Market Entry", date: new Date("2026-06-30"), quarter: "Q2 2026", status: "UPCOMING" },
  ];
  for (const ms of milestonesData) {
    await prisma.milestone.create({
      data: { ...ms, strategyId: growthStrategy.id },
    });
  }

  // === Strategy 2: Product Launch Strategy (Draft, 30%) ===
  const productLaunchType: StrategyType = "PRODUCT_LAUNCH";
  const productLaunchStatus: StrategyStatus = "DRAFT";
  const productStrategy = await prisma.businessStrategy.create({
    data: {
      name: "Product Launch Strategy",
      slug: "product-launch-strategy",
      description: "Launch plan for Branddock Enterprise tier with advanced analytics, team collaboration, and custom integrations.",
      type: productLaunchType,
      status: productLaunchStatus,
      progressPercentage: 30,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-09-30"),
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // 2 Objectives for Product Launch
  const plObjStatus1: ObjectiveStatus = "ON_TRACK";
  const plObjPriority1: Priority = "HIGH";
  const plObjMetric1: MetricType = "PERCENTAGE";
  const plObj1 = await prisma.objective.create({
    data: {
      title: "Complete Enterprise Feature Set",
      status: plObjStatus1,
      priority: plObjPriority1,
      metricType: plObjMetric1,
      startValue: 0,
      targetValue: 100,
      currentValue: 30,
      sortOrder: 0,
      strategyId: productStrategy.id,
    },
  });
  const krStatus1: KeyResultStatus = "COMPLETE";
  const krStatus2: KeyResultStatus = "ON_TRACK";
  await prisma.keyResult.create({
    data: { description: "Ship role-based access control", status: krStatus1, progressValue: "Done", sortOrder: 0, objectiveId: plObj1.id },
  });
  await prisma.keyResult.create({
    data: { description: "Build custom reporting dashboard", status: krStatus2, progressValue: "40%", sortOrder: 1, objectiveId: plObj1.id },
  });

  const plObjStatus2: ObjectiveStatus = "AT_RISK";
  const plObjPriority2: Priority = "HIGH";
  const plObjMetric2: MetricType = "NUMBER";
  const plObj2 = await prisma.objective.create({
    data: {
      title: "Secure 10 Beta Enterprise Clients",
      status: plObjStatus2,
      priority: plObjPriority2,
      metricType: plObjMetric2,
      startValue: 0,
      targetValue: 10,
      currentValue: 3,
      sortOrder: 1,
      strategyId: productStrategy.id,
    },
  });
  const krStatus3: KeyResultStatus = "BEHIND";
  await prisma.keyResult.create({
    data: { description: "Onboard 10 beta testers", status: krStatus3, progressValue: "3/10", sortOrder: 0, objectiveId: plObj2.id },
  });

  // === Strategy 3: Brand Building Initiative (Active, 42%) ===
  const brandBuildingType: StrategyType = "BRAND_BUILDING";
  const brandBuildingStatus: StrategyStatus = "ACTIVE";
  await prisma.businessStrategy.create({
    data: {
      name: "Brand Building Initiative",
      slug: "brand-building-initiative",
      description: "Strengthen brand identity and market perception through consistent messaging, visual refresh, and community building.",
      type: brandBuildingType,
      status: brandBuildingStatus,
      progressPercentage: 42,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // ============================================
  // BRANDSTYLE SEED DATA (Fase 3)
  // ============================================

  const styleguideStatusComplete: StyleguideStatus = "COMPLETE";
  const styleguideSourceUrl: StyleguideSource = "URL";
  const analysisStatusComplete: AnalysisStatus = "COMPLETE";

  const styleguide = await prisma.brandStyleguide.create({
    data: {
      status: styleguideStatusComplete,
      sourceType: styleguideSourceUrl,
      sourceUrl: "https://branddock.com",
      analysisStatus: analysisStatusComplete,

      // Logo
      logoVariations: [
        { name: "Primary Logo", url: "/assets/logo-primary.svg", type: "primary" },
        { name: "White Logo", url: "/assets/logo-white.svg", type: "white" },
        { name: "Icon Only", url: "/assets/logo-icon.svg", type: "icon" },
      ],
      logoGuidelines: [
        "Always maintain minimum clear space equal to the height of the 'B' in the logo",
        "Use the primary logo on light backgrounds and the white logo on dark backgrounds",
        "The icon-only version should be used at sizes below 32px",
      ],
      logoDonts: [
        "Don't stretch or distort the logo",
        "Don't change the logo colors",
        "Don't add effects like shadows or gradients",
        "Don't place on busy backgrounds without contrast",
        "Don't rotate or flip the logo",
      ],
      logoSavedForAi: true,

      // Color Donts
      colorDonts: [
        "Don't use primary colors for large background areas",
        "Don't combine accent colors without neutral separation",
        "Don't use low-contrast color combinations for text",
      ],
      colorsSavedForAi: true,

      // Typography
      primaryFontName: "Inter",
      primaryFontUrl: "https://fonts.google.com/specimen/Inter",
      typeScale: [
        { level: "H1", name: "Heading 1", size: "36px", lineHeight: "44px", weight: "700", letterSpacing: "-0.02em" },
        { level: "H2", name: "Heading 2", size: "30px", lineHeight: "38px", weight: "600", letterSpacing: "-0.01em" },
        { level: "H3", name: "Heading 3", size: "24px", lineHeight: "32px", weight: "600", letterSpacing: "0" },
        { level: "Body", name: "Body", size: "16px", lineHeight: "24px", weight: "400", letterSpacing: "0" },
        { level: "Body SM", name: "Body Small", size: "14px", lineHeight: "20px", weight: "400", letterSpacing: "0" },
        { level: "Caption", name: "Caption", size: "12px", lineHeight: "16px", weight: "500", letterSpacing: "0.02em" },
      ],
      typographySavedForAi: true,

      // Tone of Voice
      contentGuidelines: [
        "Write in active voice — direct and engaging",
        "Use simple, clear language — avoid jargon unless audience-specific",
        "Lead with benefits, not features",
        "Be confident but not arrogant",
        "Address the reader directly with 'you' and 'your'",
      ],
      writingGuidelines: [
        "Headlines: Max 8 words, action-oriented",
        "Body text: Short paragraphs (2-3 sentences max)",
        "CTAs: Start with a verb, create urgency",
        "Tone: Professional yet approachable",
        "Avoid: Exclamation marks, ALL CAPS, buzzwords",
      ],
      examplePhrases: [
        { text: "Build your brand strategy with AI-powered insights", type: "do" },
        { text: "Transform how your team creates on-brand content", type: "do" },
        { text: "Simple tools for complex brand challenges", type: "do" },
        { text: "THE BEST BRAND TOOL EVER!!!", type: "dont" },
        { text: "Leverage synergies to optimize brand paradigms", type: "dont" },
      ],
      toneSavedForAi: true,

      // Imagery
      photographyStyle: {
        style: "Clean, modern, minimal",
        mood: "Professional, optimistic, innovative",
        composition: "Centered subjects, generous white space, natural lighting",
      },
      photographyGuidelines: [
        "Use natural lighting wherever possible",
        "Focus on people in authentic work environments",
        "Include diversity in all people photography",
        "Maintain a clean, uncluttered composition",
      ],
      illustrationGuidelines: [
        "Use flat, geometric illustration style",
        "Stick to the brand color palette",
        "Keep illustrations simple and recognizable at small sizes",
      ],
      imageryDonts: [
        "Don't use stock photos with forced poses",
        "Don't apply heavy filters or color overlays",
        "Don't use clip art or low-resolution images",
        "Don't mix illustration styles within one project",
      ],
      imagerySavedForAi: true,

      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // 9 Colors
  const primaryCategory: ColorCategory = "PRIMARY";
  const neutralCategory: ColorCategory = "NEUTRAL";
  const semanticCategory: ColorCategory = "SEMANTIC";

  const styleguideColors = [
    { name: "Teal 500", hex: "#14B8A6", rgb: "rgb(20, 184, 166)", hsl: "hsl(173, 80%, 40%)", cmyk: "cmyk(89%, 0%, 10%, 28%)", category: primaryCategory, tags: ["brand", "primary", "CTA"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 0 },
    { name: "Teal 600", hex: "#0D9488", rgb: "rgb(13, 148, 136)", hsl: "hsl(173, 84%, 32%)", cmyk: "cmyk(91%, 0%, 8%, 42%)", category: primaryCategory, tags: ["brand", "hover"], contrastWhite: "AAA", contrastBlack: "AA", sortOrder: 1 },
    { name: "Teal 700", hex: "#0F766E", rgb: "rgb(15, 118, 110)", hsl: "hsl(174, 77%, 26%)", cmyk: "cmyk(87%, 0%, 7%, 54%)", category: primaryCategory, tags: ["brand", "dark"], contrastWhite: "AAA", contrastBlack: "AA", sortOrder: 2 },
    { name: "Gray 100", hex: "#F3F4F6", rgb: "rgb(243, 244, 246)", hsl: "hsl(220, 14%, 96%)", cmyk: null, category: neutralCategory, tags: ["background", "light"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 3 },
    { name: "Gray 500", hex: "#6B7280", rgb: "rgb(107, 114, 128)", hsl: "hsl(220, 9%, 46%)", cmyk: null, category: neutralCategory, tags: ["text", "secondary"], contrastWhite: "AA", contrastBlack: "AA", sortOrder: 4 },
    { name: "Gray 900", hex: "#111827", rgb: "rgb(17, 24, 39)", hsl: "hsl(221, 39%, 11%)", cmyk: null, category: neutralCategory, tags: ["text", "primary"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 5 },
    { name: "Red 500", hex: "#EF4444", rgb: "rgb(239, 68, 68)", hsl: "hsl(0, 84%, 60%)", cmyk: null, category: semanticCategory, tags: ["error", "danger"], contrastWhite: "AA", contrastBlack: "AA", sortOrder: 6 },
    { name: "Amber 500", hex: "#F59E0B", rgb: "rgb(245, 158, 11)", hsl: "hsl(38, 92%, 50%)", cmyk: null, category: semanticCategory, tags: ["warning"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 7 },
    { name: "Emerald 500", hex: "#10B981", rgb: "rgb(16, 185, 129)", hsl: "hsl(160, 84%, 39%)", cmyk: null, category: semanticCategory, tags: ["success"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 8 },
  ];

  for (const color of styleguideColors) {
    await prisma.styleguideColor.create({
      data: { ...color, styleguideId: styleguide.id },
    });
  }

  // ============================================
  // PERSONAS SEED DATA (Fase 4) — 3 demo personas
  // ============================================

  const avatarSourceNone: PersonaAvatarSource = "NONE";

  // Persona 1: Sarah the Startup Founder
  const sarah = await prisma.persona.create({
    data: {
      name: "Sarah Chen",
      tagline: "The Ambitious Startup Founder",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "28-35",
      gender: "Female",
      location: "Amsterdam, Netherlands",
      occupation: "CEO & Co-founder, TechVenture",
      education: "MSc Computer Science, TU Delft",
      income: "€80,000-120,000",
      familyStatus: "Single, no children",
      personalityType: "ENTJ - The Commander",
      coreValues: ["Innovation", "Independence", "Impact", "Efficiency"],
      interests: ["AI/ML technology", "Startup ecosystems", "Design thinking", "Podcasts"],
      goals: [
        "Scale company to 50 employees by 2027",
        "Secure Series A funding",
        "Build a recognizable brand in the B2B SaaS space",
      ],
      motivations: [
        "Creating something meaningful",
        "Proving innovative ideas work",
        "Financial independence",
      ],
      frustrations: [
        "Lack of affordable brand strategy tools",
        "Too many fragmented marketing platforms",
        "Difficulty maintaining brand consistency while scaling",
      ],
      behaviors: [
        "Researches tools extensively before purchasing",
        "Prefers self-service over sales calls",
        "Active on LinkedIn and Twitter",
        "Reads industry newsletters daily",
      ],
      strategicImplications: null,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Sarah's research methods
  const sarahMethods: Array<{
    method: PersonaResearchMethodType;
    status: ResearchMethodStatus;
    progress: number;
    artifactsCount?: number;
  }> = [
    { method: "AI_EXPLORATION", status: "COMPLETED", progress: 100, artifactsCount: 1 },
    { method: "INTERVIEWS", status: "AVAILABLE", progress: 0 },
    { method: "QUESTIONNAIRE", status: "AVAILABLE", progress: 0 },
    { method: "USER_TESTING", status: "AVAILABLE", progress: 0 },
  ];

  for (const m of sarahMethods) {
    await prisma.personaResearchMethod.create({
      data: {
        method: m.method,
        status: m.status,
        progress: m.progress,
        artifactsCount: m.artifactsCount ?? 0,
        personaId: sarah.id,
        completedAt: m.status === "COMPLETED" ? new Date() : null,
      },
    });
  }

  // Persona 2: Marcus the Enterprise Marketing Director
  const marcus = await prisma.persona.create({
    data: {
      name: "Marcus Thompson",
      tagline: "The Enterprise Marketing Director",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "40-50",
      gender: "Male",
      location: "London, United Kingdom",
      occupation: "Director of Marketing, GlobalCorp",
      education: "MBA, London Business School",
      income: "£100,000-150,000",
      familyStatus: "Married, 2 children",
      personalityType: "ISTJ - The Inspector",
      coreValues: ["Reliability", "Data-driven decisions", "Team leadership", "ROI focus"],
      interests: ["Marketing analytics", "Industry conferences", "Golf", "Business books"],
      goals: [
        "Increase brand awareness by 30%",
        "Implement unified brand platform across 5 regions",
        "Reduce agency dependency",
      ],
      motivations: [
        "Proving marketing ROI to C-suite",
        "Building high-performing teams",
        "Career advancement to CMO",
      ],
      frustrations: [
        "Siloed brand assets across departments",
        "Inconsistent messaging across markets",
        "Difficulty quantifying brand value",
      ],
      behaviors: [
        "Requires detailed business case before purchase",
        "Involves procurement in decisions",
        "Prefers enterprise-grade tools with SSO",
        "Attends 3-4 conferences per year",
      ],
      preferredChannels: ["LinkedIn", "Harvard Business Review", "Marketing Week", "Gartner reports", "Industry conferences"],
      techStack: ["Salesforce", "HubSpot", "Google Analytics", "Tableau", "Microsoft Teams", "PowerPoint"],
      quote: "If I can't measure it, I can't justify the budget for it — but brand is too important to ignore.",
      bio: "Marcus is a seasoned marketing director at a Fortune 500 in London, responsible for brand consistency across 5 regional markets. With 15+ years of enterprise marketing experience and an MBA, he brings a data-driven approach to brand strategy but increasingly recognizes that not everything valuable can be quantified.",
      buyingTriggers: ["Board requests unified brand metrics", "Merger or acquisition requires brand consolidation", "Competitor launches major rebrand", "Annual budget cycle with unused allocation"],
      decisionCriteria: ["Enterprise security and SSO", "ROI dashboards and reporting", "Multi-region support", "Vendor stability and references", "Integration with existing martech stack"],
      strategicImplications: null,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Marcus's research methods
  const marcusMethods: Array<{
    method: PersonaResearchMethodType;
    status: ResearchMethodStatus;
    progress: number;
    artifactsCount?: number;
  }> = [
    { method: "AI_EXPLORATION", status: "COMPLETED", progress: 100, artifactsCount: 1 },
    { method: "INTERVIEWS", status: "AVAILABLE", progress: 0 },
    { method: "QUESTIONNAIRE", status: "AVAILABLE", progress: 0 },
    { method: "USER_TESTING", status: "AVAILABLE", progress: 0 },
  ];

  for (const m of marcusMethods) {
    await prisma.personaResearchMethod.create({
      data: {
        method: m.method,
        status: m.status,
        progress: m.progress,
        artifactsCount: m.artifactsCount ?? 0,
        personaId: marcus.id,
        completedAt: m.status === "COMPLETED" ? new Date() : null,
      },
    });
  }

  // Persona 3: Lisa the Creative UX Designer
  const lisa = await prisma.persona.create({
    data: {
      name: "Lisa Müller",
      tagline: "The Creative UX Designer",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "25-32",
      gender: "Female",
      location: "Berlin, Germany",
      occupation: "Senior UX Designer, DesignStudio",
      education: "BA Interaction Design, Berlin University of the Arts",
      income: "€50,000-70,000",
      familyStatus: "In relationship",
      personalityType: "INFP - The Mediator",
      coreValues: ["Creativity", "User empathy", "Collaboration", "Aesthetics"],
      interests: ["UX research", "Illustration", "Accessibility", "Sustainable design"],
      goals: [
        "Transition to UX Lead role",
        "Build personal design portfolio brand",
        "Speak at design conferences",
      ],
      motivations: [
        "Making products more human-centered",
        "Expressing creativity through work",
        "Mentoring junior designers",
      ],
      frustrations: [
        "Brand tools not designed for designers",
        "Lack of design-first brand platforms",
        "Complex interfaces in existing tools",
      ],
      behaviors: [
        "Tries free trials before committing",
        "Values aesthetic quality of tools",
        "Active in design communities",
        "Uses Figma ecosystem extensively",
      ],
      preferredChannels: ["LinkedIn", "Dribbble", "Medium", "Design podcasts", "UX conferences"],
      techStack: ["Figma", "FigJam", "Notion", "Slack", "Miro", "Adobe Creative Suite"],
      quote: "I shouldn't need a separate tool just to keep my brand consistent — it should be baked into my design workflow.",
      bio: "Lisa is a senior UX designer at a mid-size design studio in Berlin, passionate about bridging the gap between brand strategy and user experience. After years of frustration with disconnected brand tools, she's actively looking for an integrated solution that speaks her design language.",
      buyingTriggers: ["Current tools lack brand consistency features", "Team scaling requires better collaboration", "Client demands for brand-aligned deliverables increasing", "New project with strict brand guidelines"],
      decisionCriteria: ["Design quality and aesthetics of the tool itself", "Figma integration", "Ease of onboarding for creative teams", "Price vs. feature balance", "Quality of AI-generated outputs"],
      strategicImplications: null,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Lisa's research methods (all available, no AI exploration yet)
  const lisaMethods: Array<{
    method: PersonaResearchMethodType;
    status: ResearchMethodStatus;
    progress: number;
  }> = [
    { method: "AI_EXPLORATION", status: "AVAILABLE", progress: 0 },
    { method: "INTERVIEWS", status: "AVAILABLE", progress: 0 },
    { method: "QUESTIONNAIRE", status: "AVAILABLE", progress: 0 },
    { method: "USER_TESTING", status: "AVAILABLE", progress: 0 },
  ];

  for (const m of lisaMethods) {
    await prisma.personaResearchMethod.create({
      data: {
        method: m.method,
        status: m.status,
        progress: m.progress,
        personaId: lisa.id,
      },
    });
  }

  // ============================================
  // AI PERSONA ANALYSIS SESSIONS (Sarah + Marcus)
  // ============================================

  // Sarah's completed AI analysis session
  const sarahAnalysis = await prisma.aIPersonaAnalysisSession.create({
    data: {
      status: "COMPLETED",
      progress: 100,
      totalDimensions: 4,
      answeredDimensions: 4,
      completedAt: new Date("2026-01-15T10:00:00Z"),
      insightsData: {
        dimensions: [
          { key: "demographics", title: "Demographics Profile", icon: "Users", summary: "Young female tech entrepreneur in Amsterdam, highly educated with strong income potential. Represents the growing segment of female founders in European tech hubs." },
          { key: "goals_motivations", title: "Goals & Motivations", icon: "TrendingUp", summary: "Driven by impact and independence. Primary goal is scaling a B2B SaaS company, motivated by proving innovative ideas can succeed in the European market." },
          { key: "challenges_frustrations", title: "Challenges & Pain Points", icon: "Heart", summary: "Main frustration is the fragmented marketing tool landscape. Struggles with maintaining brand consistency during rapid growth phases." },
          { key: "value_proposition", title: "Value Alignment", icon: "Zap", summary: "Branddock directly addresses her need for an affordable, integrated brand strategy platform. The AI-powered approach matches her tech-savvy decision-making style." },
        ],
        researchBoostPercentage: 35,
        completedAt: "2026-01-15T10:00:00Z",
      },
      personaId: sarah.id,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Sarah's analysis messages (8 messages: intro + 4 questions + 4 answers)
  const sarahAnalysisMsgs = [
    { type: "SYSTEM_INTRO" as const, content: "Welcome to the AI Persona Analysis for Sarah Chen. I'll guide you through 4 key dimensions to build a comprehensive understanding of this persona.", orderIndex: 0 },
    { type: "AI_QUESTION" as const, content: "Let's start with Demographics. Tell me about Sarah's background — her age, location, education, and professional context. What defines her demographic profile?", orderIndex: 1 },
    { type: "USER_ANSWER" as const, content: "Sarah is a 28-35 year old female tech entrepreneur based in Amsterdam. She has an MSc in Computer Science from TU Delft and co-founded a B2B SaaS company. Her income is in the €80-120K range.", orderIndex: 2 },
    { type: "AI_FEEDBACK" as const, content: "Excellent. Sarah represents the growing segment of highly educated female founders in European tech hubs. Her technical background and entrepreneurial drive make her a sophisticated buyer who values efficiency.", orderIndex: 3 },
    { type: "AI_QUESTION" as const, content: "Now let's explore Goals & Motivations. What drives Sarah professionally? What are her key ambitions and what motivates her daily decisions?", orderIndex: 4 },
    { type: "USER_ANSWER" as const, content: "She wants to scale to 50 employees by 2027, secure Series A funding, and build a recognizable B2B SaaS brand. She's motivated by creating meaningful impact and financial independence.", orderIndex: 5 },
    { type: "AI_QUESTION" as const, content: "Let's examine Challenges & Frustrations. What obstacles does Sarah face? What frustrates her about current solutions in the market?", orderIndex: 6 },
    { type: "USER_ANSWER" as const, content: "She's frustrated by the lack of affordable brand strategy tools, too many fragmented platforms, and difficulty maintaining brand consistency while scaling rapidly.", orderIndex: 7 },
  ];

  for (const msg of sarahAnalysisMsgs) {
    await prisma.aIPersonaAnalysisMessage.create({
      data: { ...msg, sessionId: sarahAnalysis.id },
    });
  }

  // Marcus's completed AI analysis session
  const marcusAnalysis = await prisma.aIPersonaAnalysisSession.create({
    data: {
      status: "COMPLETED",
      progress: 100,
      totalDimensions: 4,
      answeredDimensions: 4,
      completedAt: new Date("2026-01-20T14:00:00Z"),
      insightsData: {
        dimensions: [
          { key: "demographics", title: "Demographics Profile", icon: "Users", summary: "Senior marketing executive in London with MBA-level education and enterprise experience. Represents the enterprise buyer segment that values reliability and ROI." },
          { key: "goals_motivations", title: "Goals & Motivations", icon: "TrendingUp", summary: "Focused on brand consistency across 5 regions and reducing agency dependency. Motivated by proving marketing ROI to C-suite and advancing to CMO." },
          { key: "challenges_frustrations", title: "Challenges & Pain Points", icon: "Heart", summary: "Struggles with siloed brand assets across departments and inconsistent messaging across markets. Needs quantifiable brand metrics." },
          { key: "value_proposition", title: "Value Alignment", icon: "Zap", summary: "Branddock's unified platform addresses his need for cross-regional brand consistency. Enterprise features like SSO and team management are critical requirements." },
        ],
        researchBoostPercentage: 35,
        completedAt: "2026-01-20T14:00:00Z",
      },
      personaId: marcus.id,
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });

  // Marcus's analysis messages (6 messages)
  const marcusAnalysisMsgs = [
    { type: "SYSTEM_INTRO" as const, content: "Welcome to the AI Persona Analysis for Marcus Thompson. I'll guide you through 4 key dimensions to build a comprehensive understanding of this persona.", orderIndex: 0 },
    { type: "AI_QUESTION" as const, content: "Let's start with Demographics. Tell me about Marcus's background — his professional role, experience level, and organizational context.", orderIndex: 1 },
    { type: "USER_ANSWER" as const, content: "Marcus is a 40-50 year old Director of Marketing at GlobalCorp in London. He has an MBA from London Business School and manages marketing across 5 regions. Income £100-150K, married with 2 children.", orderIndex: 2 },
    { type: "AI_FEEDBACK" as const, content: "Marcus represents the enterprise decision-maker persona — experienced, data-driven, and focused on scalable solutions. His multi-regional responsibility makes brand consistency a critical need.", orderIndex: 3 },
    { type: "AI_QUESTION" as const, content: "Now let's explore Goals & Motivations. What are Marcus's key professional objectives and what drives his decision-making?", orderIndex: 4 },
    { type: "USER_ANSWER" as const, content: "He wants to increase brand awareness by 30%, implement a unified brand platform across 5 regions, and reduce agency dependency. He's motivated by proving ROI to the C-suite and career advancement to CMO.", orderIndex: 5 },
  ];

  for (const msg of marcusAnalysisMsgs) {
    await prisma.aIPersonaAnalysisMessage.create({
      data: { ...msg, sessionId: marcusAnalysis.id },
    });
  }

  // ============================================
  // PRODUCTS & SERVICES SEED DATA (S4)
  // ============================================

  const productSourceManual: ProductSource = "MANUAL";
  const productSourceUrl: ProductSource = "WEBSITE_URL";
  const productSourcePdf: ProductSource = "PDF_UPLOAD";
  const productStatusAnalyzed: ProductStatus = "ANALYZED";

  const product1 = await prisma.product.create({
    data: {
      name: "Digital Platform Suite",
      slug: "digital-platform-suite",
      description: "Comprehensive digital workspace solution that combines project management, real-time collaboration, and AI-powered analytics into a unified platform for modern teams.",
      category: "software",
      categoryIcon: "Globe",
      pricingModel: "Enterprise",
      pricingDetails: "Custom pricing based on team size and features. Starting from €299/month for teams of 10.",
      source: productSourceManual,
      status: productStatusAnalyzed,
      features: ["Real-time collaboration workspace", "AI-powered analytics dashboard", "Custom workflow builder", "Enterprise SSO & security", "API integration hub"],
      benefits: ["40% faster project completion", "Unified team communication", "Data-driven decision making", "Reduced tool fragmentation"],
      useCases: ["Enterprise digital transformation", "Remote team coordination", "Cross-department project management", "Client reporting automation"],
      workspaceId: workspace.id,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "Brand Strategy Consulting",
      slug: "brand-strategy-consulting",
      description: "Expert-led brand strategy development combining market research, competitive analysis, and creative direction to build distinctive, resonant brand identities.",
      category: "consulting",
      categoryIcon: "Zap",
      pricingModel: "Custom",
      pricingDetails: "Project-based pricing. Discovery phase from €5,000, full brand strategy from €15,000.",
      source: productSourceUrl,
      sourceUrl: "https://example.com/brand-consulting",
      status: productStatusAnalyzed,
      features: ["Competitive landscape analysis", "Brand positioning workshop", "Visual identity direction", "Brand architecture planning"],
      benefits: ["Clear brand differentiation", "Aligned stakeholder vision", "Measurable brand equity growth"],
      useCases: ["Brand launch or rebrand", "Market expansion strategy", "Post-merger brand consolidation"],
      workspaceId: workspace.id,
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: "Mobile App Framework",
      slug: "mobile-app-framework",
      description: "Cross-platform mobile development framework with built-in UI components, offline-first architecture, and native performance optimization for iOS and Android.",
      category: "mobile",
      categoryIcon: "Smartphone",
      pricingModel: "€149/month",
      pricingDetails: "Per developer seat. Annual plans available at €1,490/year (2 months free).",
      source: productSourcePdf,
      status: productStatusAnalyzed,
      features: ["Cross-platform (iOS + Android)", "Offline-first architecture", "Pre-built UI component library", "Native performance optimization", "Hot reload development"],
      benefits: ["50% faster development cycles", "Single codebase for both platforms", "Native-quality user experience", "Reduced maintenance overhead"],
      useCases: ["Consumer mobile apps", "Internal enterprise tools", "MVP rapid prototyping"],
      workspaceId: workspace.id,
    },
  });

  // ============================================
  // S5: KNOWLEDGE LIBRARY SEED DATA (10 resources, 2 featured)
  // ============================================

  const diffBeginner: DifficultyLevel = "BEGINNER";
  const diffIntermediate: DifficultyLevel = "INTERMEDIATE";
  const diffAdvanced: DifficultyLevel = "ADVANCED";
  const srcManual: ResourceSource = "MANUAL";
  const srcFileUpload: ResourceSource = "FILE_UPLOAD";
  const srcUrlImport: ResourceSource = "URL_IMPORT";

  await prisma.knowledgeResource.createMany({
    data: [
      {
        title: "Building a StoryBrand",
        slug: "building-a-storybrand",
        description: "Donald Miller's proven framework for clarifying your brand message so customers will listen. Learn how to use the 7-part StoryBrand framework to transform your marketing.",
        type: "book",
        category: "Brand Strategy",
        author: "Donald Miller",
        url: "https://storybrand.com",
        source: srcManual,
        difficultyLevel: diffBeginner,
        estimatedDuration: "6 hours",
        rating: 4.5,
        isFeatured: false,
        isbn: "978-0718033323",
        pageCount: 240,
        tags: JSON.stringify(["Storytelling", "Brand Strategy", "Messaging"]),
        workspaceId: workspace.id,
      },
      {
        title: "Design System Gallery",
        slug: "design-system-gallery",
        description: "Curated collection of real-world design systems from top companies. Browse patterns, components, and documentation approaches to build better products.",
        type: "website",
        category: "Design",
        author: "Design Systems",
        url: "https://designsystemsgallery.com",
        source: srcManual,
        difficultyLevel: diffIntermediate,
        estimatedDuration: "Ongoing",
        rating: 4.0,
        isFeatured: true,
        tags: JSON.stringify(["Design Systems", "UI", "Components"]),
        workspaceId: workspace.id,
      },
      {
        title: "Data-Driven Marketing Masterclass",
        slug: "data-driven-marketing-masterclass",
        description: "Mark Ritson's acclaimed masterclass covering the fundamentals of data-driven marketing strategy, segmentation, targeting, and positioning with real-world case studies.",
        type: "masterclass",
        category: "Marketing",
        author: "Mark Ritson",
        url: "https://example.com/masterclass",
        source: srcManual,
        difficultyLevel: diffAdvanced,
        estimatedDuration: "12 hours",
        rating: 5.0,
        isFeatured: true,
        tags: JSON.stringify(["Marketing", "Analytics", "Strategy"]),
        workspaceId: workspace.id,
      },
      {
        title: "The Brand Gap",
        slug: "the-brand-gap",
        description: "Marty Neumeier bridges the gap between business strategy and design by explaining brand as a gut feeling — not a logo. Essential reading for understanding modern branding.",
        type: "book",
        category: "Brand Strategy",
        author: "Marty Neumeier",
        url: "https://example.com/brand-gap",
        source: srcManual,
        difficultyLevel: diffBeginner,
        estimatedDuration: "3 hours",
        rating: 4.5,
        isbn: "978-0321348104",
        pageCount: 194,
        tags: JSON.stringify(["Brand", "Design", "Strategy"]),
        workspaceId: workspace.id,
      },
      {
        title: "UX Research Methods",
        slug: "ux-research-methods",
        description: "Comprehensive guide from Nielsen Norman Group covering when and how to use the most common UX research methods for maximum impact on your product design.",
        type: "research",
        category: "User Experience",
        author: "Nielsen Norman Group",
        url: "https://nngroup.com/articles/which-ux-research-methods",
        source: srcManual,
        difficultyLevel: diffIntermediate,
        estimatedDuration: "45 minutes",
        rating: 4.0,
        tags: JSON.stringify(["UX", "Research", "Methods"]),
        workspaceId: workspace.id,
      },
      {
        title: "Content Strategy Template",
        slug: "content-strategy-template",
        description: "Ready-to-use content strategy template covering audience analysis, content pillars, editorial calendar, and distribution channels for B2B and B2C brands.",
        type: "template",
        category: "Content",
        author: "Branddock",
        source: srcFileUpload,
        difficultyLevel: diffBeginner,
        rating: 3.5,
        fileName: "content-strategy-template.pdf",
        fileSize: 2500000,
        fileType: "application/pdf",
        tags: JSON.stringify(["Content", "Template", "Strategy"]),
        workspaceId: workspace.id,
      },
      {
        title: "Positioning Podcast",
        slug: "positioning-podcast",
        description: "April Dunford shares practical positioning advice for B2B SaaS companies, covering competitive positioning, category creation, and value proposition development.",
        type: "podcast",
        category: "Brand Strategy",
        author: "April Dunford",
        url: "https://example.com/podcast",
        source: srcManual,
        difficultyLevel: diffIntermediate,
        estimatedDuration: "30 min/episode",
        rating: 4.0,
        tags: JSON.stringify(["Positioning", "SaaS", "B2B"]),
        workspaceId: workspace.id,
      },
      {
        title: "Case Study: Nike Rebrand",
        slug: "case-study-nike-rebrand",
        description: "In-depth analysis of Nike's brand evolution, covering strategy shifts, visual identity updates, and the role of storytelling in building one of the world's most valuable brands.",
        type: "case_study",
        category: "Brand Strategy",
        author: "Nike Design Team",
        url: "https://example.com/nike-case",
        source: srcManual,
        difficultyLevel: diffIntermediate,
        estimatedDuration: "20 minutes",
        rating: 4.5,
        tags: JSON.stringify(["Rebrand", "Nike", "Case Study"]),
        workspaceId: workspace.id,
      },
      {
        title: "Workshop Facilitation Guide",
        slug: "workshop-facilitation-guide",
        description: "IDEO's comprehensive guide to facilitating design thinking workshops, covering preparation, activities, synthesis, and follow-up for brand strategy sessions.",
        type: "guide",
        category: "Research",
        author: "IDEO",
        url: "https://example.com/facilitation",
        source: srcManual,
        difficultyLevel: diffAdvanced,
        estimatedDuration: "2 hours",
        rating: 4.0,
        tags: JSON.stringify(["Workshop", "Facilitation", "Design Thinking"]),
        workspaceId: workspace.id,
      },
      {
        title: "Brand Identity Video Course",
        slug: "brand-identity-video-course",
        description: "The Futur's video course on building a complete brand identity, from logo design to color theory, typography selection, and brand guidelines creation.",
        type: "video",
        category: "Design",
        author: "The Futur",
        url: "https://example.com/video-course",
        source: srcUrlImport,
        difficultyLevel: diffIntermediate,
        estimatedDuration: "8 hours",
        rating: 4.5,
        tags: JSON.stringify(["Identity", "Logo", "Visual Design"]),
        workspaceId: workspace.id,
      },
    ],
  });

  // ============================================
  // S5: RESEARCH BUNDLES (6 Foundation + 4 Specialized)
  // ============================================

  const catFoundation: BundleCategory = "FOUNDATION";
  const catSpecialized: BundleCategory = "SPECIALIZED";

  const bundle1 = await prisma.researchBundle.create({
    data: {
      name: "Foundation Complete",
      slug: "foundation-complete",
      description: "The most comprehensive brand foundation validation package. Covers all core brand assets with every research method for maximum confidence.",
      category: catFoundation,
      price: 4999,
      originalPrice: 5880,
      discount: 15,
      timeline: "6 weeks",
      methodCount: 4,
      isRecommended: true,
      includedTags: ["Full Audit", "All Methods", "Expert Report"],
      trustSignals: ["100% Satisfaction Guarantee", "Expert-Led Research", "Most Popular Choice"],
      assets: {
        create: [
          { assetName: "Golden Circle", assetDescription: "Your core purpose", assetIcon: "🎯" },
          { assetName: "Brand Promise", assetDescription: "What you deliver", assetIcon: "🤝" },
          { assetName: "Value Proposition", assetDescription: "Unique value", assetIcon: "💎" },
          { assetName: "Mission/Vision", assetDescription: "Direction", assetIcon: "🧭" },
        ],
      },
      methods: {
        create: [
          { methodName: "Stakeholder Interviews (10-12)" },
          { methodName: "Brand Questionnaire (50 responses)" },
          { methodName: "AI Exploration (4 dimensions)" },
          { methodName: "Workshop Session (half-day)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Foundation Essential",
      slug: "foundation-essential",
      description: "Core brand foundation validation with the three most impactful research methods. Ideal for mid-market companies starting their brand strategy journey.",
      category: catFoundation,
      price: 2999,
      originalPrice: 3500,
      discount: 14,
      timeline: "4 weeks",
      methodCount: 3,
      includedTags: ["Core Audit", "3 Methods"],
      trustSignals: ["100% Satisfaction Guarantee", "Expert-Led"],
      assets: {
        create: [
          { assetName: "Golden Circle", assetDescription: "Your core purpose", assetIcon: "🎯" },
          { assetName: "Brand Promise", assetDescription: "What you deliver", assetIcon: "🤝" },
        ],
      },
      methods: {
        create: [
          { methodName: "Stakeholder Interviews (6-8)" },
          { methodName: "Brand Questionnaire (30 responses)" },
          { methodName: "AI Exploration (4 dimensions)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Foundation Quick",
      slug: "foundation-quick",
      description: "Fast-track brand validation using AI-powered analysis and targeted questionnaires. Get actionable insights in just two weeks.",
      category: catFoundation,
      price: 1499,
      timeline: "2 weeks",
      methodCount: 2,
      includedTags: ["Quick Audit", "2 Methods"],
      assets: {
        create: [
          { assetName: "Golden Circle", assetDescription: "Your core purpose", assetIcon: "🎯" },
          { assetName: "Value Proposition", assetDescription: "Unique value", assetIcon: "💎" },
        ],
      },
      methods: {
        create: [
          { methodName: "AI Exploration (4 dimensions)" },
          { methodName: "Brand Questionnaire (20 responses)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Strategy Deep Dive",
      slug: "strategy-deep-dive",
      description: "Focused validation of your strategic brand assets with stakeholder interviews and expert-facilitated workshops for leadership alignment.",
      category: catFoundation,
      price: 3999,
      timeline: "4 weeks",
      methodCount: 3,
      includedTags: ["Strategy Focus", "3 Methods"],
      assets: {
        create: [
          { assetName: "Mission/Vision", assetDescription: "Direction", assetIcon: "🧭" },
          { assetName: "Brand Promise", assetDescription: "What you deliver", assetIcon: "🤝" },
          { assetName: "Value Proposition", assetDescription: "Unique value", assetIcon: "💎" },
        ],
      },
      methods: {
        create: [
          { methodName: "Stakeholder Interviews (8-10)" },
          { methodName: "AI Exploration (4 dimensions)" },
          { methodName: "Workshop Session (half-day)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Leadership Alignment",
      slug: "leadership-alignment",
      description: "Workshop-led validation package designed to align leadership teams on brand strategy. Combines facilitated sessions with comprehensive stakeholder research.",
      category: catFoundation,
      price: 5499,
      originalPrice: 6200,
      discount: 11,
      timeline: "5 weeks",
      methodCount: 4,
      isPopular: true,
      includedTags: ["Team Alignment", "Workshop-Led"],
      assets: {
        create: [
          { assetName: "Golden Circle", assetDescription: "Your core purpose", assetIcon: "🎯" },
          { assetName: "Mission/Vision", assetDescription: "Direction", assetIcon: "🧭" },
          { assetName: "Brand Promise", assetDescription: "What you deliver", assetIcon: "🤝" },
          { assetName: "Value Proposition", assetDescription: "Unique value", assetIcon: "💎" },
        ],
      },
      methods: {
        create: [
          { methodName: "Workshop Session (full-day)" },
          { methodName: "Stakeholder Interviews (12-15)" },
          { methodName: "Brand Questionnaire (50 responses)" },
          { methodName: "AI Exploration (4 dimensions)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "AI-First Validation",
      slug: "ai-first-validation",
      description: "Our fastest and most affordable validation package. Leverages AI-powered analysis for rapid insights with minimal questionnaire validation.",
      category: catFoundation,
      price: 999,
      timeline: "1 week",
      methodCount: 2,
      includedTags: ["AI-Powered", "Fast Results"],
      assets: {
        create: [
          { assetName: "Golden Circle", assetDescription: "Your core purpose", assetIcon: "🎯" },
          { assetName: "Brand Promise", assetDescription: "What you deliver", assetIcon: "🤝" },
        ],
      },
      methods: {
        create: [
          { methodName: "AI Exploration (4 dimensions)" },
          { methodName: "Brand Questionnaire (10 responses)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Persona Validation",
      slug: "persona-validation",
      description: "Focused user research package to validate and refine your customer personas with real-world data from interviews, questionnaires, and AI analysis.",
      category: catSpecialized,
      price: 2499,
      timeline: "3 weeks",
      methodCount: 3,
      includedTags: ["Persona Focus", "User Research"],
      assets: {
        create: [
          { assetName: "Target Audience", assetDescription: "Primary persona", assetIcon: "👥" },
          { assetName: "Buyer Journey", assetDescription: "Decision path", assetIcon: "🛤️" },
        ],
      },
      methods: {
        create: [
          { methodName: "User Interviews (8-10)" },
          { methodName: "Persona Questionnaire (30 responses)" },
          { methodName: "AI Exploration" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Competitive Intelligence",
      slug: "competitive-intelligence",
      description: "Deep competitive analysis package combining stakeholder insights with AI-powered market analysis to sharpen your competitive positioning.",
      category: catSpecialized,
      price: 3499,
      timeline: "3 weeks",
      methodCount: 2,
      isRecommended: true,
      includedTags: ["Market Analysis", "Competitor Audit"],
      assets: {
        create: [
          { assetName: "Competitive Positioning", assetDescription: "Market position", assetIcon: "📊" },
          { assetName: "Value Proposition", assetDescription: "Unique value", assetIcon: "💎" },
        ],
      },
      methods: {
        create: [
          { methodName: "Stakeholder Interviews (6-8)" },
          { methodName: "AI Exploration (competitive analysis)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Content & Messaging Audit",
      slug: "content-messaging-audit",
      description: "Validate your brand messaging and content strategy with audience questionnaires and AI-powered content analysis for consistent, impactful communication.",
      category: catSpecialized,
      price: 1999,
      timeline: "2 weeks",
      methodCount: 2,
      includedTags: ["Content Audit", "Messaging"],
      assets: {
        create: [
          { assetName: "Brand Voice", assetDescription: "Tone & style", assetIcon: "🗣️" },
          { assetName: "Key Messages", assetDescription: "Core messaging", assetIcon: "💬" },
        ],
      },
      methods: {
        create: [
          { methodName: "Brand Questionnaire (25 responses)" },
          { methodName: "AI Exploration (content analysis)" },
        ],
      },
    },
  });

  await prisma.researchBundle.create({
    data: {
      name: "Visual Identity Validation",
      slug: "visual-identity-validation",
      description: "Comprehensive visual identity audit combining workshop sessions, audience questionnaires, and AI analysis to validate your design system and brand guidelines.",
      category: catSpecialized,
      price: 4499,
      originalPrice: 5200,
      discount: 13,
      timeline: "4 weeks",
      methodCount: 3,
      includedTags: ["Visual Audit", "Design Testing"],
      assets: {
        create: [
          { assetName: "Visual Identity", assetDescription: "Design system", assetIcon: "🎨" },
          { assetName: "Brand Guidelines", assetDescription: "Style rules", assetIcon: "📐" },
        ],
      },
      methods: {
        create: [
          { methodName: "Workshop Session (half-day)" },
          { methodName: "Questionnaire (40 responses)" },
          { methodName: "AI Exploration" },
        ],
      },
    },
  });

  // ============================================
  // S5: RESEARCH STUDIES (3)
  // ============================================

  const studyInProgress: StudyStatus = "IN_PROGRESS";
  const methodAi: ResearchMethodType = "AI_EXPLORATION";
  const methodQuestionnaire: ResearchMethodType = "QUESTIONNAIRE";
  const methodInterviews: ResearchMethodType = "INTERVIEWS";

  // Find brand assets by slug for linking
  const goldenCircleAsset = await prisma.brandAsset.findFirst({ where: { slug: "golden-circle", workspaceId: workspace.id } });
  const brandPromiseAsset = await prisma.brandAsset.findFirst({ where: { slug: "brand-promise", workspaceId: workspace.id } });

  await prisma.researchStudy.createMany({
    data: [
      {
        title: "Sarah Chen Persona — AI Exploration",
        method: methodAi,
        progress: 65,
        status: studyInProgress,
        personaId: sarah.id,
        lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        workspaceId: workspace.id,
      },
      {
        title: "Brand Promise — Questionnaire",
        method: methodQuestionnaire,
        progress: 40,
        status: studyInProgress,
        brandAssetId: brandPromiseAsset?.id ?? null,
        lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        workspaceId: workspace.id,
      },
      {
        title: "Golden Circle — Interviews",
        method: methodInterviews,
        progress: 85,
        status: studyInProgress,
        brandAssetId: goldenCircleAsset?.id ?? null,
        lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        workspaceId: workspace.id,
      },
    ],
  });

  // ============================================
  // S5: DEMO VALIDATION PLAN (1)
  // ============================================

  const planDraft: ValidationPlanStatus = "DRAFT";

  await prisma.validationPlan.create({
    data: {
      status: planDraft,
      totalPrice: 180,
      createdBy: user.id,
      workspaceId: workspace.id,
      selectedAssets: {
        create: [
          { assetName: "Golden Circle", assetCategory: "FOUNDATION", brandAssetId: goldenCircleAsset?.id ?? null },
          { assetName: "Brand Promise", assetCategory: "STRATEGY", brandAssetId: brandPromiseAsset?.id ?? null },
        ],
      },
      selectedMethods: {
        create: [
          { methodType: methodAi, quantity: 1, unitPrice: 0, subtotal: 0 },
          { methodType: methodQuestionnaire, quantity: 10, unitPrice: 10, subtotal: 100 },
          { methodType: methodInterviews, quantity: 1, unitPrice: 80, subtotal: 80 },
        ],
      },
    },
  });

  // ============================================
  // PRODUCT-PERSONA JOINS (S4)
  // ============================================

  await prisma.productPersona.createMany({
    data: [
      { productId: product1.id, personaId: sarah.id },
      { productId: product2.id, personaId: marcus.id },
      { productId: product3.id, personaId: lisa.id },
    ],
  });

  // ============================================
  // MARKET INSIGHTS SEED DATA (S4)
  // ============================================

  const insightsData: Array<{
    title: string;
    slug: string;
    description: string;
    category: InsightCategory;
    scope: InsightScope;
    impactLevel: ImpactLevel;
    timeframe: InsightTimeframe;
    relevanceScore: number;
    source: InsightSource;
    industries: string[];
    tags: string[];
    howToUse: string[];
    aiResearchPrompt?: string;
    useBrandContext?: boolean;
  }> = [
    {
      title: "AI-Powered Personalization at Scale",
      slug: "ai-powered-personalization",
      description: "Machine learning algorithms are enabling hyper-personalized customer experiences across all touchpoints, from product recommendations to dynamic pricing and content.",
      category: "TECHNOLOGY",
      scope: "MICRO",
      impactLevel: "HIGH",
      timeframe: "SHORT_TERM",
      relevanceScore: 95,
      source: "AI_RESEARCH",
      industries: ["SaaS", "E-commerce", "FinTech"],
      tags: ["AI", "Personalization", "Customer Experience", "Machine Learning"],
      howToUse: ["Implement AI-driven content recommendations in your product", "Use customer data to create personalized onboarding flows", "A/B test personalized vs generic messaging in campaigns"],
      aiResearchPrompt: "What are the latest trends in AI-powered personalization for B2B SaaS?",
      useBrandContext: true,
    },
    {
      title: "Sustainability as Brand Standard",
      slug: "sustainability-brand-standard",
      description: "Consumers increasingly expect brands to demonstrate genuine environmental commitment, with sustainability shifting from differentiator to baseline requirement.",
      category: "ENVIRONMENTAL",
      scope: "MACRO",
      impactLevel: "HIGH",
      timeframe: "LONG_TERM",
      relevanceScore: 88,
      source: "MANUAL",
      industries: ["Consumer Goods", "Fashion", "Food & Beverage"],
      tags: ["Sustainability", "ESG", "Consumer Trust", "Green Marketing"],
      howToUse: ["Audit your brand's environmental claims for authenticity", "Integrate sustainability messaging into brand positioning", "Develop transparent supply chain communication strategy"],
    },
    {
      title: "Remote-First Work Culture",
      slug: "remote-first-work-culture",
      description: "Organizations are moving beyond hybrid models to truly remote-first cultures, fundamentally redesigning collaboration tools, management practices, and company culture.",
      category: "SOCIAL",
      scope: "MESO",
      impactLevel: "HIGH",
      timeframe: "MEDIUM_TERM",
      relevanceScore: 82,
      source: "AI_RESEARCH",
      industries: ["Technology", "Professional Services", "Education"],
      tags: ["Remote Work", "Culture", "Digital Transformation", "Collaboration"],
      howToUse: ["Position products for distributed team use cases", "Highlight async collaboration features in marketing", "Create content around remote-first best practices"],
    },
    {
      title: "Micro-Moment Marketing",
      slug: "micro-moment-marketing",
      description: "Brief, intent-driven mobile interactions are replacing traditional customer journeys, requiring brands to deliver instant value at precisely the right moment.",
      category: "CONSUMER",
      scope: "MICRO",
      impactLevel: "HIGH",
      timeframe: "SHORT_TERM",
      relevanceScore: 90,
      source: "MANUAL",
      industries: ["Retail", "Travel", "Media"],
      tags: ["Mobile", "Real-time", "Intent Marketing", "Conversion"],
      howToUse: ["Map customer micro-moments across the journey", "Create snackable content for mobile touchpoints", "Implement real-time trigger-based campaigns"],
    },
    {
      title: "Community Commerce",
      slug: "community-commerce",
      description: "Social communities are becoming direct sales channels, with peer recommendations and creator-led commerce outperforming traditional advertising.",
      category: "BUSINESS",
      scope: "MESO",
      impactLevel: "MEDIUM",
      timeframe: "SHORT_TERM",
      relevanceScore: 85,
      source: "IMPORTED",
      industries: ["E-commerce", "Fashion", "Beauty"],
      tags: ["Social Commerce", "Community", "Creator Economy", "D2C"],
      howToUse: ["Build brand ambassador programs", "Integrate social proof into product pages", "Develop community-driven content strategy"],
    },
    {
      title: "Privacy-First Data Strategies",
      slug: "privacy-first-data",
      description: "With cookie deprecation and stricter regulations, brands must shift to first-party data collection and privacy-respecting personalization approaches.",
      category: "TECHNOLOGY",
      scope: "MICRO",
      impactLevel: "HIGH",
      timeframe: "SHORT_TERM",
      relevanceScore: 92,
      source: "AI_RESEARCH",
      industries: ["AdTech", "SaaS", "Healthcare"],
      tags: ["Privacy", "First-party Data", "GDPR", "Cookieless"],
      howToUse: ["Audit current data collection practices", "Develop first-party data strategy", "Create value exchanges for data consent"],
    },
    {
      title: "Experience Economy Evolution",
      slug: "experience-economy",
      description: "Consumer preference is shifting from product ownership to memorable experiences, driving brands to create immersive, shareable moments across physical and digital spaces.",
      category: "CONSUMER",
      scope: "MACRO",
      impactLevel: "HIGH",
      timeframe: "LONG_TERM",
      relevanceScore: 87,
      source: "MANUAL",
      industries: ["Hospitality", "Entertainment", "Luxury"],
      tags: ["Experience Design", "Immersive", "Brand Experience", "Storytelling"],
      howToUse: ["Design brand experiences that are inherently shareable", "Blend digital and physical brand touchpoints", "Measure experience metrics beyond satisfaction scores"],
    },
  ];

  const createdInsights = [];
  for (const insight of insightsData) {
    const created = await prisma.marketInsight.create({
      data: { ...insight, workspaceId: workspace.id },
    });
    createdInsights.push(created);
  }

  // InsightSourceUrls
  const sourceUrlData: Array<{ insightSlug: string; name: string; url: string }> = [
    { insightSlug: "ai-powered-personalization", name: "McKinsey Digital Report", url: "https://mckinsey.com/example" },
    { insightSlug: "ai-powered-personalization", name: "Gartner Predictions", url: "https://gartner.com/example" },
    { insightSlug: "sustainability-brand-standard", name: "Deloitte Sustainability Report", url: "https://deloitte.com/example" },
    { insightSlug: "remote-first-work-culture", name: "Buffer State of Remote", url: "https://buffer.com/example" },
    { insightSlug: "micro-moment-marketing", name: "Google Think with Google", url: "https://thinkwithgoogle.com/example" },
    { insightSlug: "privacy-first-data", name: "IAB Privacy Report", url: "https://iab.com/example" },
    { insightSlug: "privacy-first-data", name: "Google Privacy Sandbox", url: "https://privacysandbox.com/example" },
    { insightSlug: "experience-economy", name: "Pine & Gilmore Updated Framework", url: "https://example.com/experience-economy" },
  ];

  for (const su of sourceUrlData) {
    const insight = createdInsights.find((i) => i.slug === su.insightSlug);
    if (insight) {
      await prisma.insightSourceUrl.create({
        data: { name: su.name, url: su.url, insightId: insight.id },
      });
    }
  }

  // ============================================
  // R0.1: ALIGNMENT SCAN SEED DATA (Fase 8)
  // ============================================

  const scanStatusCompleted: ScanStatus = "COMPLETED";
  const scan = await prisma.alignmentScan.create({
    data: {
      score: 78,
      totalItems: 18,
      alignedCount: 14,
      reviewCount: 3,
      misalignedCount: 1,
      status: scanStatusCompleted,
      startedAt: new Date("2026-02-15T09:00:00"),
      completedAt: new Date("2026-02-15T09:02:34"),
      workspaceId: workspace.id,
    },
  });

  // 6 ModuleScores
  const moduleScoresData: Array<{
    moduleName: AlignmentModule;
    score: number;
    alignedCount: number;
    reviewCount: number;
    misalignedCount: number;
  }> = [
    { moduleName: "BRAND_FOUNDATION", score: 82, alignedCount: 10, reviewCount: 2, misalignedCount: 1 },
    { moduleName: "BUSINESS_STRATEGY", score: 85, alignedCount: 5, reviewCount: 1, misalignedCount: 0 },
    { moduleName: "BRANDSTYLE", score: 95, alignedCount: 8, reviewCount: 0, misalignedCount: 0 },
    { moduleName: "PERSONAS", score: 68, alignedCount: 2, reviewCount: 1, misalignedCount: 1 },
    { moduleName: "PRODUCTS_SERVICES", score: 72, alignedCount: 3, reviewCount: 1, misalignedCount: 0 },
    { moduleName: "MARKET_INSIGHTS", score: 90, alignedCount: 6, reviewCount: 1, misalignedCount: 0 },
  ];

  for (const ms of moduleScoresData) {
    await prisma.moduleScore.create({
      data: { ...ms, scanId: scan.id },
    });
  }

  // 4 AlignmentIssues
  const issueSeverityCritical: IssueSeverity = "CRITICAL";
  const issueSeverityWarning: IssueSeverity = "WARNING";
  const issueSeveritySuggestion: IssueSeverity = "SUGGESTION";
  const issueStatusOpen: IssueStatus = "OPEN";

  const alignmentIssuesData = [
    {
      severity: issueSeverityCritical,
      title: "Persona contradicts Brand Positioning",
      modulePath: "Personas → Sarah Chen (Startup Founder)",
      description: "The 'Tech-savvy Startup Founder' persona emphasizes budget-consciousness and self-service, but the Brand Positioning asset positions Branddock as a premium, full-service brand strategy partner. This creates a messaging conflict in targeting materials.",
      conflictsWith: ["brand-positioning", "brand-promise"],
      recommendation: "Either adjust the Brand Positioning to emphasize accessibility and self-service alongside premium quality, or create a separate positioning for the startup segment.",
      status: issueStatusOpen,
    },
    {
      severity: issueSeverityWarning,
      title: "Product tone mismatch with Brand Voice",
      modulePath: "Products & Services → AI Content Assistant",
      description: "The AI Content Assistant product description uses technical jargon ('NLP pipeline', 'multi-channel orchestration') that conflicts with the Brand Tone & Voice guidelines emphasizing 'simple, clear language — avoid jargon'.",
      conflictsWith: ["brand-tone-voice"],
      recommendation: "Rewrite product descriptions to align with tone guidelines. Replace technical terms with benefit-focused language.",
      status: issueStatusOpen,
    },
    {
      severity: issueSeverityWarning,
      title: "Strategy objective overlap detected",
      modulePath: "Business Strategy → Growth Strategy 2026",
      description: "The 'Increase MRR by 40%' objective and 'Secure 10 Beta Enterprise Clients' objective (Product Launch Strategy) target overlapping customer segments with potentially conflicting pricing strategies.",
      conflictsWith: ["growth-strategy-2026", "product-launch-strategy"],
      recommendation: "Define clear segment boundaries between growth targets and enterprise beta program. Consider a unified pricing strategy.",
      status: issueStatusOpen,
    },
    {
      severity: issueSeveritySuggestion,
      title: "Core Values not reflected in Product descriptions",
      modulePath: "Brand Foundation → Core Values × Products & Services",
      description: "The stated Core Values (Innovation, Authenticity, Collaboration, Excellence, Empowerment) are not explicitly referenced or reflected in any of the 3 product descriptions. Values-aligned messaging strengthens brand coherence.",
      conflictsWith: ["core-values"],
      recommendation: "Weave core values into product descriptions and feature lists. For example, frame AI features through the lens of 'Empowerment' and workshops through 'Collaboration'.",
      status: issueStatusOpen,
    },
  ];

  for (const issue of alignmentIssuesData) {
    await prisma.alignmentIssue.create({
      data: { ...issue, scanId: scan.id, workspaceId: workspace.id },
    });
  }

  // ============================================
  // S6: CAMPAIGNS + CONTENT STUDIO
  // ============================================

  const campaignTypeStrategic: CampaignType = "STRATEGIC";
  const campaignTypeQuick: CampaignType = "QUICK";
  const campaignStatusActive: CampaignStatus = "ACTIVE";
  const campaignStatusCompleted: CampaignStatus = "COMPLETED";
  const deliverableStatusNotStarted: DeliverableStatus = "NOT_STARTED";
  const deliverableStatusInProgress: DeliverableStatus = "IN_PROGRESS";
  const deliverableStatusCompleted: DeliverableStatus = "COMPLETED";
  const insertFormatInline: InsertFormat = "INLINE";
  const insertFormatQuote: InsertFormat = "QUOTE";
  const suggestionStatusPending: SuggestionStatus = "PENDING";
  const suggestionStatusApplied: SuggestionStatus = "APPLIED";
  const suggestionStatusDismissed: SuggestionStatus = "DISMISSED";

  // --- 3 Strategic Campaigns ---

  const campaign1 = await prisma.campaign.create({
    data: {
      title: "Spring Brand Refresh 2025",
      slug: "spring-brand-refresh-2025",
      type: campaignTypeStrategic,
      status: campaignStatusActive,
      confidence: 87,
      campaignGoalType: "BRAND",
      description: "Comprehensive brand refresh campaign for spring 2025, updating visual identity and messaging to reflect our evolved positioning in the AI-powered brand strategy market.",
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-06-30"),
      strategyConfidence: 85,
      strategicApproach: "Lead with thought leadership content that positions Branddock as the bridge between AI capabilities and human brand strategy expertise. Focus on demonstrating tangible ROI through case studies and interactive demos.",
      keyMessages: ["AI-augmented brand strategy for the modern era", "From data to decisions in hours, not months", "Your brand deserves more than templates"],
      targetAudienceInsights: "CMOs and brand managers at mid-market companies (50-500 employees) who are frustrated with traditional agency timelines and want to leverage AI without losing strategic depth.",
      recommendedChannels: ["LinkedIn", "Blog", "Email", "Webinar"],
      strategyGeneratedAt: new Date("2025-02-15"),
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      title: "Product Launch: AI Assistant",
      slug: "product-launch-ai-assistant",
      type: campaignTypeStrategic,
      status: campaignStatusActive,
      confidence: 92,
      campaignGoalType: "PRODUCT",
      description: "Launch campaign for the new AI Brand Assistant feature, targeting existing users and new prospects with a freemium trial approach.",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-07-31"),
      strategyConfidence: 90,
      strategicApproach: "Product-led growth strategy with freemium access to the AI Assistant. Generate buzz through beta user testimonials and live product demos. Convert free users through strategic upsell touchpoints.",
      keyMessages: ["Meet your AI brand strategist", "10x faster brand decisions", "Try free for 14 days"],
      targetAudienceInsights: "Startup founders and solo brand managers who need strategic guidance but can't afford a full agency engagement. Tech-forward, data-driven decision makers.",
      recommendedChannels: ["Product Hunt", "Twitter", "LinkedIn", "In-app"],
      strategyGeneratedAt: new Date("2025-03-10"),
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  const campaign3 = await prisma.campaign.create({
    data: {
      title: "Q1 Thought Leadership",
      slug: "q1-thought-leadership",
      type: campaignTypeStrategic,
      status: campaignStatusCompleted,
      confidence: 78,
      campaignGoalType: "CONTENT",
      description: "Establish Branddock as a thought leader in AI-driven brand strategy through a series of research-backed articles and speaking engagements.",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-31"),
      keyMessages: ["The future of brand strategy is human + AI", "Research-backed brand decisions", "Beyond logo design: strategic brand building"],
      recommendedChannels: ["Blog", "LinkedIn", "Medium", "Podcast"],
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  // --- 3 Quick Content Campaigns ---

  const campaign4 = await prisma.campaign.create({
    data: {
      title: "AI Trends Blog Post",
      slug: "ai-trends-blog-post",
      type: campaignTypeQuick,
      status: campaignStatusCompleted,
      contentType: "blog-post",
      contentCategory: "Written",
      prompt: "Write an insightful blog post about the top 5 AI trends shaping brand strategy in 2025, focusing on practical applications for mid-market brands.",
      outputFormat: "Text",
      qualityScore: 8.5,
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  const campaign5 = await prisma.campaign.create({
    data: {
      title: "LinkedIn Product Update",
      slug: "linkedin-product-update",
      type: campaignTypeQuick,
      status: campaignStatusActive,
      contentType: "linkedin",
      contentCategory: "Social",
      prompt: "Create a LinkedIn post announcing our new AI-powered brand analysis feature, emphasizing how it saves brand managers 10+ hours per week.",
      outputFormat: "Text",
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  const campaign6 = await prisma.campaign.create({
    data: {
      title: "Welcome Email Series",
      slug: "welcome-email-series",
      type: campaignTypeQuick,
      status: campaignStatusCompleted,
      contentType: "welcome-email",
      contentCategory: "Email",
      prompt: "Design a 3-email welcome series for new Branddock users that guides them through setting up their brand foundation, creating their first persona, and running their first AI analysis.",
      outputFormat: "Text",
      qualityScore: 7.8,
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  });

  // --- Knowledge Assets (4 per strategic campaign) ---

  const knowledgeAssetsData = [
    // Campaign 1: Spring Brand Refresh
    { campaignId: campaign1.id, assetName: "Brand Identity", assetType: "Brand", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign1.id, assetName: "Sarah Chen (Startup Founder)", assetType: "Persona", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign1.id, assetName: "Digital Platform Suite", assetType: "Product", validationStatus: "Validated", isAutoSelected: false },
    { campaignId: campaign1.id, assetName: "AI in Brand Strategy", assetType: "Trend", validationStatus: "Not Validated", isAutoSelected: false },
    // Campaign 2: Product Launch
    { campaignId: campaign2.id, assetName: "AI Content Assistant", assetType: "Product", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign2.id, assetName: "Marcus Thompson (Enterprise)", assetType: "Persona", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign2.id, assetName: "Brand Positioning", assetType: "Brand", validationStatus: "Not Validated", isAutoSelected: false },
    // Campaign 3: Thought Leadership
    { campaignId: campaign3.id, assetName: "Brand Promise", assetType: "Brand", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign3.id, assetName: "Lisa Müller (UX Designer)", assetType: "Persona", validationStatus: "Not Validated", isAutoSelected: false },
    { campaignId: campaign3.id, assetName: "Sustainability Trends", assetType: "Trend", validationStatus: "Validated", isAutoSelected: true },
    { campaignId: campaign3.id, assetName: "Brand Strategy Consulting", assetType: "Product", validationStatus: "Validated", isAutoSelected: false },
    { campaignId: campaign3.id, assetName: "Personalization at Scale", assetType: "Trend", validationStatus: "Validated", isAutoSelected: false },
  ];

  for (const ka of knowledgeAssetsData) {
    await prisma.campaignKnowledgeAsset.create({ data: ka });
  }

  // --- Team Members ---

  await prisma.campaignTeamMember.create({
    data: { campaignId: campaign1.id, userId: user.id, role: "owner" },
  });
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaign1.id, userId: teamMember.id, role: "member" },
  });
  // Third team member for campaign1 - reuse directUser
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaign1.id, userId: directUser.id, role: "member" },
  });
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaign2.id, userId: user.id, role: "owner" },
  });
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaign2.id, userId: teamMember.id, role: "member" },
  });

  // --- Deliverables (13 total) ---

  // Campaign 1: 4 deliverables (1 completed, 2 in progress, 1 not started)
  const deliverable1_1 = await prisma.deliverable.create({
    data: {
      title: "Brand Refresh Guidelines",
      contentType: "Blog Post",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Erik Jager",
      generatedText: "# Brand Refresh Guidelines 2025\n\nAs we enter a new era of AI-powered brand strategy, our brand identity needs to evolve to reflect our commitment to innovation while maintaining the trust and authenticity our clients expect.\n\n## Visual Identity Updates\n\nOur refreshed visual identity embraces a modern, clean aesthetic that communicates both technological sophistication and human warmth. The updated color palette introduces deeper teals and warmer accent colors that convey both authority and approachability.\n\n## Messaging Framework\n\nOur core message remains centered on empowerment: we believe every brand deserves access to strategic insights that were previously only available to Fortune 500 companies.\n\n## Key Takeaways\n\n1. AI augments human creativity — it doesn't replace it\n2. Data-driven decisions lead to stronger brands\n3. Accessibility and sophistication can coexist",
      qualityScore: 85,
      qualityMetrics: { brandAlignment: 88, audienceFit: 82, readability: 90, researchBacked: 78 },
      checklistItems: [
        { id: "c1", label: "Brand alignment verified", checked: true },
        { id: "c2", label: "Tone of voice consistent", checked: true },
        { id: "c3", label: "Key messages included", checked: true },
        { id: "c4", label: "CTA optimized", checked: false },
      ],
      campaignId: campaign1.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Social Media Campaign Kit",
      contentType: "Social Media Post",
      status: deliverableStatusInProgress,
      progress: 65,
      assignedTo: "Sarah Chen",
      campaignId: campaign1.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Email Newsletter Announcement",
      contentType: "Newsletter",
      status: deliverableStatusInProgress,
      progress: 30,
      assignedTo: "Erik Jager",
      campaignId: campaign1.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Landing Page Copy",
      contentType: "Landing Page",
      status: deliverableStatusNotStarted,
      progress: 0,
      campaignId: campaign1.id,
    },
  });

  // Campaign 2: 6 deliverables (2 completed, 3 in progress, 1 not started)
  const deliverable2_1 = await prisma.deliverable.create({
    data: {
      title: "Product Launch Blog Post",
      contentType: "Blog Post",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Erik Jager",
      generatedText: "# Introducing the AI Brand Assistant\n\nToday we're thrilled to announce the launch of our AI Brand Assistant — a game-changing tool that puts the power of strategic brand analysis at your fingertips.\n\n## What It Does\n\nThe AI Brand Assistant analyzes your brand foundation, personas, and market insights to provide actionable recommendations in minutes, not weeks.\n\n## How It Works\n\n1. Connect your brand assets\n2. Let AI analyze patterns and gaps\n3. Receive prioritized recommendations\n4. Take action with confidence\n\nTry it free for 14 days and see the difference data-driven brand strategy can make.",
      qualityScore: 78,
      qualityMetrics: { brandAlignment: 80, audienceFit: 75, readability: 85, researchBacked: 70 },
      campaignId: campaign2.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Product Hunt Launch Copy",
      contentType: "Landing Page",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Sarah Chen",
      campaignId: campaign2.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Feature Demo Video Script",
      contentType: "Video Script",
      status: deliverableStatusInProgress,
      progress: 50,
      assignedTo: "Erik Jager",
      campaignId: campaign2.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Onboarding Email Sequence",
      contentType: "Email",
      status: deliverableStatusInProgress,
      progress: 40,
      campaignId: campaign2.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "LinkedIn Launch Announcement",
      contentType: "LinkedIn Post",
      status: deliverableStatusInProgress,
      progress: 80,
      assignedTo: "Sarah Chen",
      campaignId: campaign2.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Case Study: Beta User Success",
      contentType: "Case Study",
      status: deliverableStatusNotStarted,
      progress: 0,
      campaignId: campaign2.id,
    },
  });

  // Campaign 3: 3 deliverables (all completed)
  const deliverable3_1 = await prisma.deliverable.create({
    data: {
      title: "AI Trends in Brand Strategy",
      contentType: "Blog Post",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Erik Jager",
      generatedText: "# Top 5 AI Trends Shaping Brand Strategy in 2025\n\nThe intersection of artificial intelligence and brand strategy is evolving rapidly. Here are the five trends that every brand strategist needs to watch.\n\n## 1. Predictive Brand Analytics\n\nAI can now predict how brand positioning changes will impact market perception before you commit to them.\n\n## 2. Real-time Competitive Intelligence\n\nAutomated monitoring and analysis of competitor brand movements gives strategists a real-time advantage.\n\n## 3. Personalized Brand Experiences at Scale\n\nAI enables brands to deliver personalized messaging without sacrificing consistency.\n\n## 4. Automated Content Quality Scoring\n\nEvery piece of content can be scored for brand alignment before publication.\n\n## 5. AI-Augmented Workshop Facilitation\n\nVirtual facilitation tools enhance collaborative brand strategy sessions.",
      qualityScore: 82,
      qualityMetrics: { brandAlignment: 85, audienceFit: 80, readability: 88, researchBacked: 75 },
      checklistItems: [
        { id: "c1", label: "Brand alignment verified", checked: true },
        { id: "c2", label: "Sources cited", checked: true },
        { id: "c3", label: "SEO optimized", checked: true },
        { id: "c4", label: "Social sharing ready", checked: true },
      ],
      campaignId: campaign3.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "Research-Backed Brand Building Whitepaper",
      contentType: "Whitepaper",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Erik Jager",
      campaignId: campaign3.id,
    },
  });

  await prisma.deliverable.create({
    data: {
      title: "LinkedIn Article Series",
      contentType: "LinkedIn Post",
      status: deliverableStatusCompleted,
      progress: 100,
      assignedTo: "Sarah Chen",
      campaignId: campaign3.id,
    },
  });

  // --- Content Versions (3 for "AI Trends" deliverable) ---

  await prisma.contentVersion.create({
    data: {
      versionNumber: 1,
      contentSnapshot: { text: "# Top 5 AI Trends in Brand Strategy\n\nDraft version with initial research and outline.", qualityScore: 65 },
      qualityScore: 65,
      deliverableId: deliverable3_1.id,
      createdBy: user.id,
    },
  });

  await prisma.contentVersion.create({
    data: {
      versionNumber: 2,
      contentSnapshot: { text: "# Top 5 AI Trends Shaping Brand Strategy in 2025\n\nRefined version with detailed examples and research citations.", qualityScore: 75 },
      qualityScore: 75,
      deliverableId: deliverable3_1.id,
      createdBy: user.id,
    },
  });

  await prisma.contentVersion.create({
    data: {
      versionNumber: 3,
      contentSnapshot: { text: deliverable3_1.generatedText, qualityScore: 82 },
      qualityScore: 82,
      deliverableId: deliverable3_1.id,
      createdBy: user.id,
    },
  });

  // --- Improve Suggestions (4 for Brand Refresh Guidelines) ---

  await prisma.improveSuggestion.create({
    data: {
      metric: "Brand Alignment",
      impactPoints: 5,
      currentText: "our brand identity needs to evolve",
      suggestedText: "our brand identity must evolve to embody our core values of innovation, authenticity, and empowerment",
      status: suggestionStatusPending,
      deliverableId: deliverable1_1.id,
    },
  });

  await prisma.improveSuggestion.create({
    data: {
      metric: "Audience Fit",
      impactPoints: 3,
      currentText: "every brand deserves access to strategic insights",
      suggestedText: "every mid-market brand team deserves the strategic insights that drive confident decision-making",
      status: suggestionStatusPending,
      deliverableId: deliverable1_1.id,
    },
  });

  await prisma.improveSuggestion.create({
    data: {
      metric: "Readability",
      impactPoints: 4,
      currentText: "communicates both technological sophistication and human warmth",
      suggestedText: "feels both cutting-edge and approachable — tech-forward without being cold",
      status: suggestionStatusApplied,
      deliverableId: deliverable1_1.id,
    },
  });

  await prisma.improveSuggestion.create({
    data: {
      metric: "Research Backed",
      impactPoints: 2,
      currentText: "Data-driven decisions lead to stronger brands",
      suggestedText: "Research shows that data-driven brand decisions achieve 2.3x higher market impact (McKinsey, 2024)",
      status: suggestionStatusDismissed,
      deliverableId: deliverable1_1.id,
    },
  });

  // --- Inserted Insights (2 for Product Launch Blog Post) ---

  await prisma.insertedInsight.create({
    data: {
      insightTitle: "AI-powered tools reduce brand analysis time by 73%",
      insightSource: "Market Insights: AI in Brand Strategy",
      insertFormat: insertFormatInline,
      insertLocation: "paragraph-2",
      deliverableId: deliverable2_1.id,
    },
  });

  await prisma.insertedInsight.create({
    data: {
      insightTitle: "89% of CMOs plan to increase AI investment for brand strategy in 2025",
      insightSource: "Market Insights: CMO Technology Survey",
      insertFormat: insertFormatQuote,
      insertLocation: "section-conclusion",
      deliverableId: deliverable2_1.id,
    },
  });

  // --- Campaign Template ---

  await prisma.campaignTemplate.create({
    data: {
      name: "Brand Launch Template",
      campaignGoalType: "BRAND",
      knowledgePattern: { requiredTypes: ["Brand", "Persona", "Product"], minAssets: 3 },
      deliverableMix: [
        { contentType: "Blog Post", quantity: 2 },
        { contentType: "LinkedIn Post", quantity: 3 },
        { contentType: "Infographic", quantity: 1 },
        { contentType: "Newsletter", quantity: 1 },
      ],
      workspaceId: workspace.id,
    },
  });

  // ============================================
  // S9: SETTINGS
  // ============================================

  // --- UserProfile (demo user) ---
  await prisma.userProfile.create({
    data: {
      userId: DEMO_USER_ID,
      firstName: "Erik",
      lastName: "Jager",
      email: "erik@branddock.com",
      emailVerified: true,
      jobTitle: "Brand Strategy Director",
      phone: "+31 6 1234 5678",
      avatarUrl: null,
      workspaceId: DEMO_WORKSPACE_ID,
    },
  });

  // --- EmailPreference (defaults) ---
  await prisma.emailPreference.create({
    data: {
      userId: DEMO_USER_ID,
      productUpdates: true,
      researchNotifications: true,
      teamActivity: true,
      marketing: false,
    },
  });

  // --- 3 ConnectedAccounts ---
  await prisma.connectedAccount.create({
    data: {
      userId: DEMO_USER_ID,
      provider: "GOOGLE" as OAuthProvider,
      providerUserId: "google-demo-user-001",
      accessToken: "demo-google-access-token",
      refreshToken: "demo-google-refresh-token",
      status: "CONNECTED" as ConnectionStatus,
      connectedAt: new Date("2025-11-15"),
    },
  });

  await prisma.connectedAccount.create({
    data: {
      userId: DEMO_USER_ID,
      provider: "SLACK" as OAuthProvider,
      providerUserId: null,
      accessToken: null,
      refreshToken: null,
      status: "DISCONNECTED" as ConnectionStatus,
      connectedAt: null,
    },
  });

  await prisma.connectedAccount.create({
    data: {
      userId: DEMO_USER_ID,
      provider: "MICROSOFT" as OAuthProvider,
      providerUserId: null,
      accessToken: null,
      refreshToken: null,
      status: "DISCONNECTED" as ConnectionStatus,
      connectedAt: null,
    },
  });

  // --- 3 Plans ---
  const starterPlan = await prisma.plan.create({
    data: {
      name: "Starter",
      slug: "starter",
      monthlyPrice: 29,
      yearlyPrice: 290,
      maxSeats: 2,
      maxAiGenerations: 50,
      maxResearchStudies: 3,
      maxStorageGb: 5,
      features: JSON.stringify([
        "Brand Asset Management",
        "Basic AI Analysis",
        "2 Team Members",
        "3 Research Studies/month",
        "5 GB Storage",
        "Email Support",
      ]),
      isRecommended: false,
      sortOrder: 1,
    },
  });

  const professionalPlan = await prisma.plan.create({
    data: {
      name: "Professional",
      slug: "professional",
      monthlyPrice: 99,
      yearlyPrice: 990,
      maxSeats: 10,
      maxAiGenerations: 500,
      maxResearchStudies: 20,
      maxStorageGb: 50,
      features: JSON.stringify([
        "Everything in Starter",
        "Advanced AI Analysis",
        "10 Team Members",
        "20 Research Studies/month",
        "50 GB Storage",
        "Priority Support",
        "Brand Alignment Monitoring",
        "Campaign Management",
        "Content Studio",
        "Custom Research Bundles",
      ]),
      isRecommended: true,
      sortOrder: 2,
    },
  });

  await prisma.plan.create({
    data: {
      name: "Enterprise",
      slug: "enterprise",
      monthlyPrice: null,
      yearlyPrice: null,
      maxSeats: 999,
      maxAiGenerations: 9999,
      maxResearchStudies: 999,
      maxStorageGb: 500,
      features: JSON.stringify([
        "Everything in Professional",
        "Unlimited AI Generations",
        "Unlimited Team Members",
        "Unlimited Research Studies",
        "500 GB Storage",
        "Dedicated Account Manager",
        "Custom Integrations",
        "SSO / SAML",
        "SLA Guarantee",
        "White-label Options",
        "API Access",
      ]),
      isRecommended: false,
      sortOrder: 3,
    },
  });

  // --- 1 Subscription (Professional, monthly, active) ---
  const subscriptionEnd = new Date();
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      workspaceId: DEMO_WORKSPACE_ID,
      planId: professionalPlan.id,
      status: "ACTIVE" as SubscriptionStatus,
      billingCycle: "MONTHLY" as BillingCycle,
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscriptionEnd,
      cancelAtPeriodEnd: false,
    },
  });

  // --- 1 PaymentMethod (Visa 4242) ---
  await prisma.paymentMethod.create({
    data: {
      workspaceId: DEMO_WORKSPACE_ID,
      type: "Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
      stripePaymentMethodId: "pm_demo_visa_4242",
    },
  });

  // --- 4 Invoices (all paid) ---
  const invoiceMonths = [
    { num: "INV-2025-0010", start: new Date("2025-10-01"), end: new Date("2025-10-31"), issued: new Date("2025-10-01") },
    { num: "INV-2025-0011", start: new Date("2025-11-01"), end: new Date("2025-11-30"), issued: new Date("2025-11-01") },
    { num: "INV-2025-0012", start: new Date("2025-12-01"), end: new Date("2025-12-31"), issued: new Date("2025-12-01") },
    { num: "INV-2026-0001", start: new Date("2026-01-01"), end: new Date("2026-01-31"), issued: new Date("2026-01-01") },
  ];

  for (const inv of invoiceMonths) {
    await prisma.invoice.create({
      data: {
        workspaceId: DEMO_WORKSPACE_ID,
        invoiceNumber: inv.num,
        amount: 99.0,
        currency: "USD",
        status: "PAID" as InvoiceStatus,
        periodStart: inv.start,
        periodEnd: inv.end,
        pdfUrl: `/invoices/${inv.num}.pdf`,
        issuedAt: inv.issued,
      },
    });
  }

  // --- NotificationPreference (defaults + 36-toggle matrix) ---
  const notificationMatrix = {
    brandAssets: { email: true, browser: true, slack: false },
    personas: { email: true, browser: true, slack: false },
    research: { email: true, browser: true, slack: false },
    campaigns: { email: true, browser: true, slack: false },
    alignment: { email: true, browser: true, slack: false },
    teamActivity: { email: true, browser: true, slack: false },
    billing: { email: true, browser: false, slack: false },
    security: { email: true, browser: true, slack: false },
    productUpdates: { email: true, browser: false, slack: false },
    weeklyDigest: { email: true, browser: false, slack: false },
    aiAnalysis: { email: false, browser: true, slack: false },
    contentStudio: { email: false, browser: true, slack: false },
  };

  await prisma.notificationPreference.create({
    data: {
      userId: DEMO_USER_ID,
      emailEnabled: true,
      browserEnabled: true,
      slackEnabled: false,
      matrix: notificationMatrix,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      quietHoursEnabled: false,
    },
  });

  // --- AppearancePreference (System theme, Teal accent) ---
  await prisma.appearancePreference.create({
    data: {
      userId: DEMO_USER_ID,
      theme: "SYSTEM" as Theme,
      accentColor: "TEAL" as AccentColor,
      language: "en",
      fontSize: "MEDIUM" as FontSize,
      sidebarPosition: "LEFT" as SidebarPosition,
      compactMode: false,
      animations: true,
    },
  });

  // ============================================
  // S9: HELP & SUPPORT
  // ============================================

  // --- 6 Help Categories ---
  const helpCatGettingStarted = await prisma.helpCategory.create({
    data: {
      name: "Getting Started",
      slug: "getting-started",
      icon: "Rocket",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      articleCount: 8,
      sortOrder: 1,
    },
  });

  const helpCatFeatures = await prisma.helpCategory.create({
    data: {
      name: "Features & Tools",
      slug: "features-tools",
      icon: "Wrench",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      articleCount: 8,
      sortOrder: 2,
    },
  });

  const helpCatKnowledge = await prisma.helpCategory.create({
    data: {
      name: "Knowledge & Research",
      slug: "knowledge-research",
      icon: "BookOpen",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      articleCount: 12,
      sortOrder: 3,
    },
  });

  const helpCatAccount = await prisma.helpCategory.create({
    data: {
      name: "Account & Team",
      slug: "account-team",
      icon: "Users",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      articleCount: 6,
      sortOrder: 4,
    },
  });

  const helpCatBilling = await prisma.helpCategory.create({
    data: {
      name: "Billing & Plans",
      slug: "billing-plans",
      icon: "CreditCard",
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      articleCount: 5,
      sortOrder: 5,
    },
  });

  const helpCatTroubleshooting = await prisma.helpCategory.create({
    data: {
      name: "Troubleshooting",
      slug: "troubleshooting",
      icon: "LifeBuoy",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      articleCount: 8,
      sortOrder: 6,
    },
  });

  // --- 5 Help Articles (incl. 1 full markdown tutorial) ---
  const helpArticle1 = await prisma.helpArticle.create({
    data: {
      title: "Setting Up Your First Brand",
      slug: "setting-up-your-first-brand",
      subtitle: "A complete guide to creating and configuring your brand workspace in Branddock",
      content: `# Setting Up Your First Brand

Welcome to Branddock! This guide will walk you through setting up your first brand workspace step by step.

## Prerequisites

Before you begin, make sure you have:
- A Branddock account (free or paid)
- Your brand's basic information ready (name, industry, target audience)
- Any existing brand assets (logos, style guides, etc.)

## Step 1: Create Your Workspace

After logging in, you'll land on the dashboard. Click **"Create Workspace"** in the top navigation bar.

1. Enter your brand name
2. Choose your industry category
3. Select your team size
4. Click **"Create"**

> **Tip:** Choose a descriptive name — you can always change it later in Settings.

## Step 2: Add Brand Assets

Navigate to **Brand Assets** in the sidebar. Here you can add your core brand elements:

### Core Assets to Add First
- **Brand Mission** — Your brand's purpose and reason for existing
- **Brand Vision** — Where you want your brand to be in the future
- **Brand Values** — The principles that guide your brand
- **Brand Promise** — What customers can expect from your brand
- **Target Audience** — Who your brand serves

### How to Add an Asset
1. Click the **"+ Add Asset"** button
2. Select the asset category
3. Enter your content
4. Click **"Save"**

\`\`\`
Pro tip: Use the AI Brand Analysis feature to get
suggestions for improving your brand assets.
\`\`\`

## Step 3: Create Personas

Go to **Personas** and create at least one target persona:

1. Click **"Create Persona"**
2. Fill in demographics (age, location, occupation)
3. Add psychographics (values, interests, pain points)
4. Save your persona

## Step 4: Run Your First Analysis

With brand assets and personas in place, you're ready for your first analysis:

1. Open any brand asset
2. Click **"AI Analysis"** in the action bar
3. Answer the AI's questions about your brand
4. Generate your report

## Next Steps

- Explore the **Research Hub** for validation tools
- Set up **Brand Alignment** monitoring
- Create your first **Campaign**

---

*Need more help? Contact our support team or browse our FAQ section.*`,
      categoryId: helpCatGettingStarted.id,
      readTimeMinutes: 8,
      helpfulYes: 42,
      helpfulNo: 3,
      relatedArticleIds: [],
    },
  });

  await prisma.helpArticle.create({
    data: {
      title: "Understanding Brand Alignment Scores",
      slug: "understanding-brand-alignment-scores",
      subtitle: "Learn how Branddock calculates and presents your brand alignment score",
      content: `# Understanding Brand Alignment Scores

Your Brand Alignment Score measures how consistent your brand elements are across all modules. This article explains how it works.

## How Scores Are Calculated

The alignment score is a weighted average across 6 modules:

| Module | Weight | What It Measures |
|--------|--------|-----------------|
| Brand Assets | 25% | Content consistency across assets |
| Personas | 20% | Alignment between personas and brand values |
| Products | 15% | Product-brand fit |
| Strategy | 15% | Strategic alignment with brand goals |
| Content | 15% | Content tone and messaging consistency |
| Visual | 10% | Visual identity consistency |

## Score Ranges

- **90-100%**: Excellent — Your brand is highly aligned
- **70-89%**: Good — Minor inconsistencies to address
- **50-69%**: Needs Attention — Several areas need work
- **Below 50%**: Critical — Significant alignment issues

## Fixing Issues

When the scan finds issues, you can:
1. Click on any issue to see details
2. Use **AI Fix** to get 3 suggested solutions
3. Choose the best option and apply it
4. Re-scan to verify the fix

## Best Practices

- Run alignment scans weekly
- Address critical issues immediately
- Review module-specific scores for targeted improvements`,
      categoryId: helpCatFeatures.id,
      readTimeMinutes: 5,
      helpfulYes: 28,
      helpfulNo: 2,
      relatedArticleIds: [helpArticle1.id],
    },
  });

  await prisma.helpArticle.create({
    data: {
      title: "Research Methods Explained",
      slug: "research-methods-explained",
      subtitle: "A comprehensive overview of all available research and validation methods",
      content: `# Research Methods Explained

Branddock offers four research methods to validate your brand assets and personas.

## AI Exploration
Automated AI-powered analysis of your brand elements. Quick, cost-effective, and available 24/7.

## Workshops
Facilitated team sessions for collaborative brand discovery. Best for new brands or major pivots.

## Interviews
One-on-one structured conversations with stakeholders, customers, or team members.

## Questionnaires
Scalable surveys for quantitative validation across larger audiences.

## Choosing the Right Method

Consider your goals, timeline, and budget when selecting research methods. For best results, combine multiple methods.`,
      categoryId: helpCatKnowledge.id,
      readTimeMinutes: 4,
      helpfulYes: 35,
      helpfulNo: 1,
      relatedArticleIds: [],
    },
  });

  await prisma.helpArticle.create({
    data: {
      title: "Managing Team Members & Roles",
      slug: "managing-team-members-roles",
      subtitle: "How to invite team members and manage their access levels",
      content: `# Managing Team Members & Roles

Learn how to add team members to your workspace and manage their permissions.

## Available Roles

| Role | Permissions |
|------|------------|
| Owner | Full access, billing, delete workspace |
| Admin | Manage members, all content access |
| Editor | Create and edit content, run analyses |
| Viewer | Read-only access to all content |

## Inviting Members

1. Go to **Settings → Team**
2. Click **"Invite Member"**
3. Enter their email address
4. Select their role
5. Click **"Send Invite"**

The invitee will receive an email with a link to join your workspace.

## Changing Roles

Owners and Admins can change member roles at any time from the Team settings page.`,
      categoryId: helpCatAccount.id,
      readTimeMinutes: 3,
      helpfulYes: 19,
      helpfulNo: 0,
      relatedArticleIds: [],
    },
  });

  await prisma.helpArticle.create({
    data: {
      title: "Troubleshooting AI Analysis Issues",
      slug: "troubleshooting-ai-analysis-issues",
      subtitle: "Common issues with AI analysis and how to resolve them",
      content: `# Troubleshooting AI Analysis Issues

If you're experiencing issues with AI-powered features, try these solutions.

## Analysis Not Starting

- Check your internet connection
- Ensure your brand assets have content (empty assets cannot be analyzed)
- Verify your plan includes AI features

## Slow Analysis

AI analysis typically takes 30-60 seconds. If it takes longer:
- The AI models may be experiencing high demand
- Try again in a few minutes
- Check our status page for any ongoing issues

## Unexpected Results

- Ensure your brand assets contain clear, descriptive content
- Add more context to your brand mission and values
- Try running the analysis again — AI outputs can vary

## Contact Support

If issues persist, submit a support ticket with:
- Your workspace name
- The specific asset or feature affected
- Screenshots of any error messages`,
      categoryId: helpCatTroubleshooting.id,
      readTimeMinutes: 3,
      helpfulYes: 15,
      helpfulNo: 4,
      relatedArticleIds: [],
    },
  });

  // --- 6 Video Tutorials ---
  await prisma.videoTutorial.create({
    data: {
      title: "Getting Started with Branddock",
      description: "A 5-minute overview of Branddock's core features and how to set up your first workspace.",
      thumbnailUrl: "/images/tutorials/getting-started-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-1",
      duration: "5:12",
      categoryBadge: "Getting Started",
      categoryColor: "emerald",
      sortOrder: 1,
    },
  });

  await prisma.videoTutorial.create({
    data: {
      title: "Creating Effective Brand Assets",
      description: "Learn how to create and manage brand assets that drive brand consistency.",
      thumbnailUrl: "/images/tutorials/brand-assets-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-2",
      duration: "8:34",
      categoryBadge: "Brand Assets",
      categoryColor: "blue",
      sortOrder: 2,
    },
  });

  await prisma.videoTutorial.create({
    data: {
      title: "Running AI Brand Analysis",
      description: "Step-by-step guide to using AI-powered analysis to improve your brand strategy.",
      thumbnailUrl: "/images/tutorials/ai-analysis-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-3",
      duration: "6:45",
      categoryBadge: "AI Features",
      categoryColor: "purple",
      sortOrder: 3,
    },
  });

  await prisma.videoTutorial.create({
    data: {
      title: "Building Personas That Convert",
      description: "How to create data-driven personas using research methods and AI insights.",
      thumbnailUrl: "/images/tutorials/personas-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-4",
      duration: "7:20",
      categoryBadge: "Personas",
      categoryColor: "amber",
      sortOrder: 4,
    },
  });

  await prisma.videoTutorial.create({
    data: {
      title: "Campaign Creation Masterclass",
      description: "From strategy to content — learn the full campaign workflow in Branddock.",
      thumbnailUrl: "/images/tutorials/campaigns-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-5",
      duration: "12:08",
      categoryBadge: "Campaigns",
      categoryColor: "teal",
      sortOrder: 5,
    },
  });

  await prisma.videoTutorial.create({
    data: {
      title: "Brand Alignment Deep Dive",
      description: "Understanding and improving your brand alignment score across all modules.",
      thumbnailUrl: "/images/tutorials/alignment-thumb.jpg",
      videoUrl: "https://www.youtube.com/watch?v=placeholder-6",
      duration: "9:15",
      categoryBadge: "Alignment",
      categoryColor: "red",
      sortOrder: 6,
    },
  });

  // --- 7 FAQ Items ---
  await prisma.faqItem.create({
    data: {
      question: "What is Branddock and how does it work?",
      answer: "Branddock is a SaaS platform for brand strategy, research validation, and AI-powered content generation. It helps you build, validate, and manage your brand through a suite of interconnected tools including brand asset management, persona creation, research validation, campaign management, and AI-powered analysis. You start by setting up your brand workspace, adding brand assets and personas, then use research methods to validate and improve your brand strategy.",
      helpfulYes: 52,
      helpfulNo: 3,
      sortOrder: 1,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "How does AI Brand Analysis work?",
      answer: "AI Brand Analysis uses advanced language models to evaluate your brand assets. It starts a conversational session where the AI asks targeted questions about your brand. Based on your responses and existing brand data, it generates a comprehensive report with findings, scores, and actionable recommendations. The analysis covers brand consistency, messaging clarity, competitive positioning, and strategic alignment.",
      helpfulYes: 41,
      helpfulNo: 2,
      sortOrder: 2,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "Can I invite team members to my workspace?",
      answer: "Yes! Branddock supports team collaboration with four role levels: Owner (full access), Admin (member management + content), Editor (create and edit content), and Viewer (read-only). Go to Settings → Team to invite members by email. Each invitee receives a link to join your workspace. The number of seats depends on your subscription plan.",
      helpfulYes: 28,
      helpfulNo: 1,
      sortOrder: 3,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "What research methods are available?",
      answer: "Branddock offers four research methods: AI Exploration (automated AI analysis), Workshops (facilitated team sessions), Interviews (structured one-on-one conversations), and Questionnaires (scalable surveys). Each method has a different weight in your brand validation score. You can use individual methods or combine them through Research Bundles for comprehensive validation.",
      helpfulYes: 35,
      helpfulNo: 0,
      sortOrder: 4,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "How is the Brand Alignment score calculated?",
      answer: "The Brand Alignment score is a weighted average across 6 modules: Brand Assets (25%), Personas (20%), Products (15%), Strategy (15%), Content (15%), and Visual Identity (10%). The score measures consistency and alignment across all your brand elements. Scores range from 0-100%, with 90%+ indicating excellent alignment.",
      helpfulYes: 30,
      helpfulNo: 2,
      sortOrder: 5,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "Can I export my brand data and reports?",
      answer: "Yes, Branddock supports multiple export formats. AI Analysis reports can be exported as JSON (raw data). Campaign content can be exported in various formats from the Content Studio. Brand Styleguide PDF export is planned for a future update. You can access export options from the action bars of individual features.",
      helpfulYes: 22,
      helpfulNo: 5,
      sortOrder: 6,
    },
  });

  await prisma.faqItem.create({
    data: {
      question: "What happens if I downgrade my plan?",
      answer: "When you downgrade your plan, your existing data remains intact but some features may become restricted. You'll keep access to all content you've created, but may lose access to premium features like advanced AI analysis, additional team seats, or extended research methods. Any ongoing research studies will complete normally.",
      helpfulYes: 18,
      helpfulNo: 3,
      sortOrder: 7,
    },
  });

  // --- 5 Feature Requests ---
  const featureRequestStatus = (s: string) => s as FeatureRequestStatus;

  await prisma.featureRequest.create({
    data: {
      title: "Slack integration for team notifications",
      description: "Would love to receive brand alignment alerts and campaign updates directly in our Slack channels. This would help our team stay informed without having to check Branddock constantly.",
      status: featureRequestStatus("REQUESTED"),
      voteCount: 47,
      submittedById: DEMO_USER_ID,
    },
  });

  await prisma.featureRequest.create({
    data: {
      title: "Custom brand scoring weights",
      description: "Allow us to customize the weights for brand alignment scoring. Our industry has different priorities than the defaults — visual identity is much more important for us than the current 10% weight.",
      status: featureRequestStatus("UNDER_REVIEW"),
      voteCount: 32,
      submittedById: DEMO_USER_ID,
    },
  });

  await prisma.featureRequest.create({
    data: {
      title: "Multi-language brand asset support",
      description: "We operate in 5 countries and need to manage brand assets in multiple languages. It would be great to have localized versions of brand assets with translation tracking.",
      status: featureRequestStatus("REQUESTED"),
      voteCount: 58,
      submittedById: DEMO_USER_ID,
    },
  });

  await prisma.featureRequest.create({
    data: {
      title: "Competitor analysis module",
      description: "Add a module for tracking and analyzing competitor brands. Include features like competitor brand scoring, positioning maps, and automated competitive intelligence.",
      status: featureRequestStatus("UNDER_REVIEW"),
      voteCount: 73,
      submittedById: DEMO_USER_ID,
    },
  });

  await prisma.featureRequest.create({
    data: {
      title: "API access for brand data",
      description: "Provide a public API for accessing brand data programmatically. This would allow us to integrate Branddock data into our internal tools, dashboards, and workflows.",
      status: featureRequestStatus("PLANNED"),
      voteCount: 41,
      submittedById: DEMO_USER_ID,
    },
  });

  // =============================================
  // Persona Chat AI — Default Config
  // =============================================
  await prisma.personaChatConfig.create({
    data: {
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.8,
      maxTokens: 1000,
      systemPromptTemplate: DEFAULT_PERSONA_CHAT_PROMPT,
    },
  });

  console.log("Seed complete: 2 organizations, 2 workspaces, 4 users, 3 org members, 1 invitation, 15 notifications, 13 brand assets (3 with content+frameworks), 1 AI session (10 messages, REPORT_READY), 52 research methods, 6 asset versions, 3 workshop bundles, 2 workshops, 20 question templates, 3 interviews, 3 strategies (7 objectives, 15 key results, 5 focus areas, 4 milestones), 1 styleguide (9 colors), 3 personas (12 research methods), 3 products (3 persona links), 10 knowledge resources (2 featured), 7 market insights (8 source URLs), 1 alignment scan (6 module scores, 4 issues), 10 research bundles (6 Foundation + 4 Specialized), 3 research studies, 1 validation plan (2 assets, 3 methods), 6 campaigns (3 strategic + 3 quick), 12 knowledge assets, 13 deliverables, 3 content versions, 4 improve suggestions, 2 inserted insights, 1 campaign template, 1 persona chat config, S9 Settings: 1 user profile, 1 email preference, 3 connected accounts, 3 plans, 1 subscription, 1 payment method, 4 invoices, 1 notification preference, 1 appearance preference, S9 Help: 6 help categories, 5 help articles, 6 video tutorials, 7 FAQ items, 5 feature requests");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
