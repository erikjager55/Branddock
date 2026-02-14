import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { NotificationType, NotificationCategory, AssetCategory, AssetStatus, AIMessageType, ResearchMethodType, ResearchMethodStatus, WorkshopStatus, InterviewStatus, InterviewQuestionType, StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority, StyleguideStatus, StyleguideSource, AnalysisStatus, ColorCategory, PersonaAvatarSource, PersonaResearchMethodType } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Cleanup existing data (in reverse dependency order)
  await prisma.personaChatInsight.deleteMany();
  await prisma.personaChatMessage.deleteMany();
  await prisma.personaChatSession.deleteMany();
  await prisma.aIPersonaAnalysisMessage.deleteMany();
  await prisma.aIPersonaAnalysisSession.deleteMany();
  await prisma.personaResearchMethod.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.styleguideColor.deleteMany();
  await prisma.brandStyleguide.deleteMany();
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
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Branddock Demo",
      slug: "branddock-demo",
    },
  });

  // User
  const user = await prisma.user.create({
    data: {
      email: "erik@branddock.com",
      name: "Erik Jager",
      workspaceId: workspace.id,
    },
  });

  // Dashboard Preferences
  await prisma.dashboardPreference.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      quickStartItems: JSON.stringify([
        { key: "brand_asset", label: "Create your first brand asset", completed: false, href: "/knowledge/brand-foundation" },
        { key: "persona", label: "Define your target persona", completed: false, href: "/knowledge/personas" },
        { key: "research", label: "Plan your first research session", completed: false, href: "/validation/research-hub" },
        { key: "campaign", label: "Generate your first campaign strategy", completed: false, href: "/campaigns/new" },
      ]),
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
        progress: 100,
        totalQuestions: 5,
        answeredQuestions: 5,
        brandAssetId: visionAsset.id,
        workspaceId: workspace.id,
        createdById: user.id,
        completedAt: new Date(),
        reportData: JSON.stringify({
          executiveSummary: "The Vision Statement analysis reveals a strong forward-looking direction with clear alignment to market trends. Key strengths include differentiation through brand-led innovation and a compelling long-term narrative.",
          findings: [
            { key: "brand_purpose", title: "Clear Purpose Alignment", description: "Your vision directly connects to societal impact through brand-led innovation." },
            { key: "target_audience", title: "Audience Resonance", description: "The vision speaks to tech-savvy professionals seeking meaningful brand connections." },
            { key: "unique_value", title: "Distinctive Positioning", description: "Strong differentiation through the combination of AI-driven insights and human creativity." },
            { key: "customer_challenge", title: "Pain Point Addressed", description: "Addresses the gap between brand strategy and consistent content execution." },
            { key: "market_position", title: "Market Opportunity", description: "Positioned at the intersection of brand strategy tools and AI content generation." },
          ],
          recommendations: [
            { number: 1, title: "Strengthen Emotional Connection", description: "Add more aspirational language to create deeper emotional resonance.", priority: "high" },
            { number: 2, title: "Quantify Impact Goals", description: "Include measurable milestones to track vision achievement.", priority: "high" },
            { number: 3, title: "Align Team Communication", description: "Create internal messaging that mirrors the external vision.", priority: "medium" },
            { number: 4, title: "Test with Stakeholders", description: "Validate the vision statement with key customer segments.", priority: "medium" },
            { number: 5, title: "Review Competitive Landscape", description: "Ensure differentiation is maintained as market evolves.", priority: "low" },
          ],
          dataPointsCount: 24,
          sourcesCount: 3,
          confidenceScore: 87,
          completedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        }),
      },
    });

    const messages: Array<{ type: AIMessageType; content: string; orderIndex: number }> = [
      { type: "SYSTEM_INTRO", content: "Welcome to AI Brand Analysis for your Vision Statement. I'll ask you a series of questions to understand your brand's direction and generate a comprehensive report.", orderIndex: 0 },
      { type: "AI_QUESTION", content: "What is the core purpose behind your brand's existence? Think beyond profit — what change do you want to create in the world?", orderIndex: 1 },
      { type: "USER_ANSWER", content: "We exist to bridge the gap between brand strategy and execution. Too many companies have great brand visions but struggle to translate them into consistent, high-quality content across channels.", orderIndex: 2 },
      { type: "AI_FEEDBACK", content: "That's a powerful purpose — bridging strategy and execution is a real pain point for many organizations. Your focus on consistency across channels suggests a systems-thinking approach.", orderIndex: 3 },
      { type: "AI_QUESTION", content: "Who is your primary audience, and what transformation do you promise them?", orderIndex: 4 },
      { type: "USER_ANSWER", content: "Brand managers and marketing teams at mid-size companies who want to maintain brand consistency without hiring a full agency. We promise them confidence that every piece of content aligns with their brand.", orderIndex: 5 },
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
  ];

  for (const fa of frameworkAssignments) {
    await prisma.brandAsset.updateMany({
      where: { slug: fa.slug, workspaceId: workspace.id },
      data: { frameworkType: fa.frameworkType, frameworkData: JSON.stringify(fa.frameworkData) },
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
    { name: "Market Expansion", description: "Expand into new European markets", icon: "Globe" },
    { name: "Product Innovation", description: "AI-powered feature development", icon: "Lightbulb" },
    { name: "Customer Acquisition", description: "Scale customer base to 500+", icon: "Users" },
    { name: "Brand Authority", description: "Establish thought leadership", icon: "Award" },
    { name: "Operational Scale", description: "Infrastructure for growth", icon: "Settings" },
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
  }> = [
    { title: "Q1 Revenue Target: €55K MRR", date: new Date("2026-03-31"), quarter: "Q1 2026", status: "DONE" },
    { title: "AI Analysis v2.0 Beta Launch", date: new Date("2026-04-15"), quarter: "Q2 2026", status: "UPCOMING" },
    { title: "Germany Market Launch", date: new Date("2026-02-01"), quarter: "Q1 2026", status: "DONE" },
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
      tagline: "Tech-savvy startup founder building the next big thing",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "28-35",
      gender: "Female",
      location: "Amsterdam, Netherlands",
      occupation: "Startup Founder & CEO",
      education: "MSc Computer Science, TU Delft",
      income: "€60,000 - €90,000",
      familyStatus: "Single, no children",
      personalityType: "ENTJ — The Commander: Strategic, ambitious, natural leader",
      coreValues: ["Innovation", "Authenticity", "Growth", "Impact", "Transparency"],
      interests: ["AI/ML", "Design Thinking", "Startup Culture", "Public Speaking", "Sustainability"],
      goals: [
        "Build a recognizable brand that stands out in the SaaS market",
        "Achieve product-market fit within 12 months",
        "Raise Series A funding by Q3 2026",
        "Build a diverse, high-performing team of 15+",
      ],
      motivations: [
        "Creating something meaningful that solves real problems",
        "Being recognized as a thought leader in her industry",
        "Financial independence and generational wealth",
        "Proving that ethical business can be profitable",
      ],
      frustrations: [
        "Too many branding tools that don't integrate with each other",
        "Expensive agencies that don't understand startup speed",
        "Inconsistent brand messaging across team members",
        "Lack of data-driven insights for brand decisions",
      ],
      behaviors: [
        "Researches extensively before purchasing (reads 5+ reviews)",
        "Active on LinkedIn and Twitter for professional networking",
        "Prefers self-service tools over agency relationships",
        "Makes decisions quickly once she has enough data",
        "Values free trials and freemium models",
      ],
      strategicImplications: "Sarah represents our core ICP: tech-savvy founders who need professional branding without agency overhead. Key opportunities: emphasize AI-powered efficiency, self-service capabilities, and data-driven brand insights. Her price sensitivity suggests our Professional tier (€99/mo) is the sweet spot. Critical to demonstrate ROI quickly — she'll churn within 30 days if value isn't obvious.",
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

  // Persona 2: Marcus the Marketing Director
  const marcus = await prisma.persona.create({
    data: {
      name: "Marcus Williams",
      tagline: "Experienced marketing leader scaling mid-market brands",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "40-50",
      gender: "Male",
      location: "London, United Kingdom",
      occupation: "VP of Marketing",
      education: "MBA, London Business School",
      income: "£120,000 - £160,000",
      familyStatus: "Married, 2 children",
      personalityType: "INTJ — The Architect: Strategic thinker, results-driven",
      coreValues: ["Excellence", "Strategy", "Efficiency", "Leadership", "Results"],
      interests: ["Brand Strategy", "Data Analytics", "Team Development", "Golf", "Business Books"],
      goals: [
        "Unify brand messaging across 5 international markets",
        "Reduce content production costs by 40%",
        "Increase brand awareness metrics by 25% YoY",
      ],
      motivations: [
        "Demonstrating measurable marketing ROI to the C-suite",
        "Building a best-in-class marketing organization",
        "Staying ahead of AI disruption in marketing",
      ],
      frustrations: [
        "Team members going off-brand despite guidelines",
        "Lengthy approval processes that slow down content delivery",
        "Difficulty measuring brand consistency across touchpoints",
      ],
      behaviors: [
        "Delegates tool evaluation to team but makes final decision",
        "Requires enterprise-grade security and compliance",
        "Prefers quarterly contracts over monthly subscriptions",
        "Attends 3-4 marketing conferences per year",
      ],
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

  // Persona 3: Lisa the UX Designer
  const lisa = await prisma.persona.create({
    data: {
      name: "Lisa Müller",
      tagline: "Creative UX designer passionate about user-centered brand experiences",
      avatarUrl: null,
      avatarSource: avatarSourceNone,
      age: "25-32",
      gender: "Female",
      location: "Berlin, Germany",
      occupation: "Senior UX Designer",
      education: "BA Interaction Design, HfG Schwäbisch Gmünd",
      income: "€55,000 - €75,000",
      familyStatus: "In a relationship, no children",
      personalityType: "INFP — The Mediator: Creative, empathetic, idealistic",
      coreValues: ["Creativity", "Empathy", "Sustainability", "Simplicity", "Collaboration"],
      interests: ["UX Research", "Design Systems", "Typography", "Cycling", "Illustration"],
      goals: [
        "Create seamless brand-to-product design experiences",
        "Build a personal brand as a UX thought leader",
        "Transition into a Design Lead role within 2 years",
      ],
      motivations: [
        "Designing interfaces that genuinely help people",
        "Working with tools that respect design craft",
        "Contributing to open-source design resources",
      ],
      frustrations: [
        "Brand guidelines that are too rigid for digital adaptation",
        "Marketing tools that ignore design principles",
        "Poor typography and color management in most SaaS tools",
      ],
      behaviors: [
        "Evaluates tools based on design quality first",
        "Active in design communities (Figma, Dribbble, Twitter)",
        "Creates detailed comparison spreadsheets before purchasing",
        "Shares tool recommendations with her network",
      ],
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

  console.log("Seed complete: workspace, user, preferences, 15 notifications, 13 brand assets, 1 AI session, 52 research methods, 2 frameworks, 3 versions, 3 bundles, 1 completed workshop, 1 scheduled workshop, 20 question templates, 3 interviews, 3 strategies (7 objectives, 15 key results, 5 focus areas, 4 milestones), 1 styleguide (9 colors), 3 personas (12 research methods)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
