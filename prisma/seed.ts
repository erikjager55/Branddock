import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Fixed IDs for cross-referencing ────────────────────────────────────────
const OWNER_ID = randomUUID();
const EDITOR_ID = randomUUID();
const WORKSPACE_ID = randomUUID();

const ASSET_GOLDEN_CIRCLE_ID = randomUUID();
const ASSET_CORE_VALUES_ID = randomUUID();
const ASSET_BRAND_PROMISE_ID = randomUUID();
const ASSET_BRAND_POSITIONING_ID = randomUUID();
const ASSET_BRAND_PERSONALITY_ID = randomUUID();
const ASSET_COMPETITIVE_ADVANTAGE_ID = randomUUID();

const CAMPAIGN_Q1_ID = randomUUID();
const CAMPAIGN_AWARENESS_ID = randomUUID();

const PERSONA_SARAH_ID = randomUUID();
const PERSONA_MARCUS_ID = randomUUID();

const PRODUCT_PLATFORM_ID = randomUUID();
const PRODUCT_CONSULTING_ID = randomUUID();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean up (in reverse dependency order) ─────────────────────────────────
  console.log("🧹 Cleaning existing data...");

  await prisma.productPersona.deleteMany();
  await prisma.newAIAnalysis.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.questionnaire.deleteMany();
  await prisma.assetRelation.deleteMany();
  await prisma.content.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.product.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.brandAsset.deleteMany();
  await prisma.brandStyleguide.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.strategicObjective.deleteMany();
  await prisma.strategyMilestone.deleteMany();
  await prisma.businessStrategy.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.marketInsight.deleteMany();
  await prisma.researchProject.deleteMany();
  // Don't delete users/workspaces/accounts/sessions to preserve auth

  // ─── Task 1: Users ──────────────────────────────────────────────────────────
  console.log("👤 Seeding users...");

  const owner = await prisma.user.upsert({
    where: { email: "owner@branddock.demo" },
    update: { name: "Brand Manager" },
    create: {
      id: OWNER_ID,
      name: "Brand Manager",
      email: "owner@branddock.demo",
      role: "OWNER",
      emailVerified: new Date("2024-01-15T10:00:00Z"),
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=BrandManager",
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@branddock.demo" },
    update: { name: "Content Editor" },
    create: {
      id: EDITOR_ID,
      name: "Content Editor",
      email: "editor@branddock.demo",
      role: "EDITOR",
      emailVerified: new Date("2024-02-01T14:30:00Z"),
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=ContentEditor",
    },
  });

  // ─── Task 1: Workspace ──────────────────────────────────────────────────────
  console.log("🏢 Seeding workspace...");

  const workspace = await prisma.workspace.upsert({
    where: { slug: "branddock-demo" },
    update: { name: "Branddock Demo" },
    create: {
      id: WORKSPACE_ID,
      name: "Branddock Demo",
      slug: "branddock-demo",
      plan: "FREE",
      ownerId: owner.id,
      logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Branddock",
    },
  });

  // ─── Task 1: Workspace Member ───────────────────────────────────────────────
  console.log("👥 Seeding workspace members...");

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: editor.id,
        workspaceId: workspace.id,
      },
    },
    update: { role: "EDITOR" },
    create: {
      userId: editor.id,
      workspaceId: workspace.id,
      role: "EDITOR",
    },
  });

  // ─── Task 3: Brand Assets ──────────────────────────────────────────────────
  console.log("🎯 Seeding brand assets...");

  const goldenCircle = await prisma.brandAsset.create({
    data: {
      id: ASSET_GOLDEN_CIRCLE_ID,
      name: "Golden Circle",
      description:
        "Our fundamental purpose, process, and offering — structured around Simon Sinek's Golden Circle framework to articulate why we exist, how we deliver, and what we provide.",
      type: "MISSION",
      category: "FOUNDATION",
      status: "VALIDATED",
      validationScore: 92,
      isLocked: false,
      content: {
        assetTypeKey: "golden-circle",
        why: "We believe every brand deserves to be understood deeply — not just on the surface, but at the core of what makes it meaningful. We exist to bridge the gap between brand intent and audience perception.",
        how: "By combining AI-powered analysis with structured research methodologies, we create a continuous feedback loop between strategy and validation. Our platform guides teams through workshops, interviews, and questionnaires to build evidence-based brand foundations.",
        what: "Branddock is a SaaS platform that unifies brand strategy, validation research, and campaign-driven content creation into one seamless workflow.",
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  const coreValues = await prisma.brandAsset.create({
    data: {
      id: ASSET_CORE_VALUES_ID,
      name: "Core Values",
      description:
        "The foundational principles that guide every decision, interaction, and piece of content we create.",
      type: "VALUES",
      category: "FOUNDATION",
      status: "ACTIVE",
      validationScore: 88,
      isLocked: false,
      content: {
        assetTypeKey: "core-values",
        values: [
          {
            name: "Evidence-Based",
            description:
              "Every strategic decision is backed by research data, not assumptions. We validate before we create.",
          },
          {
            name: "Clarity Over Complexity",
            description:
              "We distill complex brand strategy into clear, actionable frameworks that any team can execute.",
          },
          {
            name: "Continuous Alignment",
            description:
              "Brand consistency isn't a one-time achievement — it's an ongoing process of measurement and refinement.",
          },
          {
            name: "Collaborative Intelligence",
            description:
              "The best brand insights emerge when human creativity meets AI-powered analysis.",
          },
          {
            name: "Transparency",
            description:
              "We show our work. Every recommendation comes with the data and reasoning behind it.",
          },
        ],
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  const brandPromise = await prisma.brandAsset.create({
    data: {
      id: ASSET_BRAND_PROMISE_ID,
      name: "Brand Promise",
      description:
        "The commitment we make to our customers — what they can always expect from us.",
      type: "PROMISE",
      category: "FOUNDATION",
      status: "DRAFT",
      validationScore: 0,
      isLocked: false,
      content: null,
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  const brandPositioning = await prisma.brandAsset.create({
    data: {
      id: ASSET_BRAND_POSITIONING_ID,
      name: "Brand Positioning",
      description:
        "How we differentiate ourselves in the market and the unique space we occupy in our customers' minds.",
      type: "POSITIONING",
      category: "STRATEGY",
      status: "AI_ANALYSIS_COMPLETE",
      validationScore: 75,
      isLocked: false,
      content: {
        assetTypeKey: "brand-positioning",
        statement:
          "For marketing teams and brand managers who struggle with inconsistent brand execution, Branddock is the only platform that combines AI-powered brand analysis with structured validation research, enabling them to build evidence-based brand foundations that drive on-brand content at scale.",
        targetAudience: "Marketing teams and brand managers at growth-stage companies",
        category: "Brand strategy and content platforms",
        differentiator:
          "Integrated validation research loop that connects strategy to measurable brand alignment",
        proofPoints: [
          "AI analysis across 12 brand dimensions",
          "3 research methods: workshops, interviews, questionnaires",
          "Real-time brand alignment scoring on all content",
        ],
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  const brandPersonality = await prisma.brandAsset.create({
    data: {
      id: ASSET_BRAND_PERSONALITY_ID,
      name: "Brand Personality",
      description:
        "The human characteristics and traits that define our brand voice and presence.",
      type: "OTHER",
      category: "EXPRESSION",
      status: "IN_PROGRESS",
      validationScore: 45,
      isLocked: false,
      content: {
        assetTypeKey: "brand-personality",
        archetypes: ["The Sage", "The Creator"],
        traits: [
          "Insightful",
          "Methodical",
          "Approachable",
          "Empowering",
          "Trustworthy",
        ],
        voiceAttributes: {
          formal: 35,
          casual: 65,
          serious: 55,
          playful: 45,
          authoritative: 70,
          friendly: 60,
        },
      },
      workspaceId: workspace.id,
      createdBy: editor.id,
    },
  });

  const competitiveAdvantage = await prisma.brandAsset.create({
    data: {
      id: ASSET_COMPETITIVE_ADVANTAGE_ID,
      name: "Competitive Advantage",
      description:
        "Our sustainable competitive moat and the factors that make our approach uniquely effective.",
      type: "OTHER",
      category: "STRATEGY",
      status: "LOCKED",
      validationScore: 95,
      isLocked: true,
      lockedAt: new Date("2024-11-15T09:00:00Z"),
      lockedById: owner.id,
      content: {
        moat: "Integrated research-to-content pipeline",
        advantages: [
          {
            area: "Validation Loop",
            description:
              "No other platform combines AI brand analysis with three distinct human research methods (workshops, interviews, questionnaires) in a single workflow.",
          },
          {
            area: "Campaign-First Architecture",
            description:
              "All content is organized around campaigns, ensuring strategic alignment from the start rather than retrofitting individual pieces.",
          },
          {
            area: "Real-Time Brand Scoring",
            description:
              "Every piece of content receives an instant brand alignment score, creating a measurable quality standard across the team.",
          },
          {
            area: "Knowledge Compound Effect",
            description:
              "Each research method feeds into a shared knowledge base, making brand strategy increasingly precise over time.",
          },
        ],
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  // Additional brand assets to cover all 13 types
  await prisma.brandAsset.create({
    data: {
      name: "Social Relevancy",
      description: "How Branddock contributes to society and addresses social issues in the marketing industry.",
      type: "OTHER",
      category: "FOUNDATION",
      status: "DRAFT",
      validationScore: 0,
      content: { assetTypeKey: "social-relevancy" },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Brand Tone & Voice",
      description: "The consistent voice and tone that defines how Branddock communicates across all channels.",
      type: "OTHER",
      category: "EXPRESSION",
      status: "IN_PROGRESS",
      validationScore: 30,
      content: {
        assetTypeKey: "brand-tone-voice",
        tone: "Professional yet approachable",
        voice: "Knowledgeable mentor who empowers teams",
      },
      workspaceId: workspace.id,
      createdBy: editor.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Brand Story",
      description: "The narrative that connects Branddock's past, present, and future.",
      type: "STORY",
      category: "EXPRESSION",
      status: "DRAFT",
      validationScore: 0,
      content: { assetTypeKey: "brand-story" },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Brand Essence",
      description: "The two core traits that capture the heart and soul of Branddock.",
      type: "OTHER",
      category: "FOUNDATION",
      status: "AI_ANALYSIS_COMPLETE",
      validationScore: 60,
      content: {
        assetTypeKey: "brand-essence",
        traits: ["Strategic Clarity", "Research-Driven"],
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Vision Statement",
      description: "A forward-looking declaration of Branddock's purpose and aspirations.",
      type: "VISION",
      category: "STRATEGY",
      status: "ACTIVE",
      validationScore: 85,
      content: {
        assetTypeKey: "vision-statement",
        statement: "A world where every brand is built on evidence, not assumptions — where strategy and creativity are united by research.",
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Mission Statement",
      description: "What Branddock does, how it does it, and for whom.",
      type: "MISSION",
      category: "STRATEGY",
      status: "VALIDATED",
      validationScore: 90,
      content: {
        assetTypeKey: "mission-statement",
        statement: "We empower marketing teams to build research-backed brand strategies and create consistently on-brand content through AI-powered analysis and structured validation.",
      },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Brand Archetype",
      description: "Universal behavior patterns that define how Branddock shows up in the world.",
      type: "OTHER",
      category: "IDENTITY",
      status: "IN_PROGRESS",
      validationScore: 40,
      content: {
        assetTypeKey: "brand-archetype",
        primary: "The Sage",
        secondary: "The Creator",
        description: "We combine the Sage's pursuit of knowledge and truth with the Creator's vision for building something meaningful.",
      },
      workspaceId: workspace.id,
      createdBy: editor.id,
    },
  });

  await prisma.brandAsset.create({
    data: {
      name: "Transformative Goals",
      description: "Ambitious goals that will transform Branddock's business and create lasting impact.",
      type: "OTHER",
      category: "STRATEGY",
      status: "DRAFT",
      validationScore: 0,
      content: { assetTypeKey: "transformative-goals" },
      workspaceId: workspace.id,
      createdBy: owner.id,
    },
  });

  // ─── Task 2: Campaigns ──────────────────────────────────────────────────────
  console.log("📢 Seeding campaigns...");

  const campaignQ1 = await prisma.campaign.create({
    data: {
      id: CAMPAIGN_Q1_ID,
      name: "Q1 Brand Launch",
      description:
        "Comprehensive brand launch campaign for Q1 2025. Focuses on establishing market presence through thought leadership content, social proof, and strategic partnerships. Goal: 50,000 impressions and 500 qualified leads.",
      status: "ACTIVE",
      startDate: new Date("2025-01-15T00:00:00Z"),
      endDate: new Date("2025-03-31T23:59:59Z"),
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  const campaignAwareness = await prisma.campaign.create({
    data: {
      id: CAMPAIGN_AWARENESS_ID,
      name: "Product Awareness",
      description:
        "Ongoing product awareness campaign to educate the market about our platform capabilities. Targeted at marketing teams exploring brand management solutions.",
      status: "PLANNING",
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  // ─── Task 2: Content ────────────────────────────────────────────────────────
  console.log("📝 Seeding content...");

  // Q1 Brand Launch content
  await prisma.content.create({
    data: {
      title: "Why Evidence-Based Branding Outperforms Gut Instinct",
      body: "In the era of data-driven marketing, many companies still rely on intuition for their most critical strategic decisions — their brand. This disconnect creates a dangerous gap between brand intent and market perception.\n\nAt Branddock, we've analyzed over 1,200 brand strategies and found that companies using structured validation methods achieve 3.2x better brand consistency scores than those relying on internal assumptions alone.\n\n## The Problem with Assumption-Based Branding\n\nMost brand strategies are built on a foundation of assumptions: what leadership thinks customers want, what the creative team believes resonates, and what competitors seem to be doing. These assumptions often go untested.\n\n## The Validation Advantage\n\nOur research shows that brands employing at least two validation methods — such as customer interviews combined with AI analysis — see measurable improvements across three key metrics: brand recall (+47%), message consistency (+62%), and customer trust (+38%).",
      type: "BLOG_POST",
      status: "PUBLISHED",
      format: "blog",
      channel: "website",
      onBrand: true,
      brandScore: 94,
      wordCount: 1847,
      metadata: {
        seoTitle: "Evidence-Based Branding vs Gut Instinct | Branddock",
        metaDescription:
          "Discover why data-driven brand strategy outperforms intuition by 3.2x. Learn the validation methods that leading brands use.",
        tags: ["brand strategy", "validation", "research", "data-driven"],
        readTime: 8,
      },
      campaignId: campaignQ1.id,
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "Introducing Branddock: Brand Strategy Meets Validation Research",
      body: "We're thrilled to announce the public launch of Branddock — the first platform to integrate brand strategy, validation research, and campaign-driven content creation into a single workflow.\n\nAfter 18 months of development and beta testing with 47 companies, we've built something we're genuinely proud of. 🚀",
      type: "SOCIAL_MEDIA",
      status: "APPROVED",
      format: "social",
      channel: "linkedin",
      onBrand: true,
      brandScore: 91,
      wordCount: 280,
      metadata: {
        platform: "linkedin",
        hashtags: [
          "#brandstrategy",
          "#marketing",
          "#SaaS",
          "#brandmanagement",
        ],
        scheduledFor: "2025-01-20T09:00:00Z",
      },
      campaignId: campaignQ1.id,
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "Welcome to the Future of Brand Management",
      body: "Hi {{firstName}},\n\nYou signed up for early access to Branddock, and we're excited to let you know — your account is ready.\n\nHere's what you can do right now:\n\n1. Run your first AI Brand Analysis (takes ~5 minutes)\n2. Set up your Golden Circle workshop\n3. Create your first campaign\n\nWe've built Branddock because we believe every brand deserves research-backed strategy, not just the Fortune 500.\n\nLet's get started.\n\nBest,\nThe Branddock Team",
      type: "EMAIL",
      status: "IN_REVIEW",
      format: "email",
      channel: "email",
      onBrand: true,
      brandScore: 87,
      wordCount: 312,
      metadata: {
        subject: "Your Branddock Account is Ready",
        preheader: "Run your first AI Brand Analysis in 5 minutes",
        templateType: "onboarding",
      },
      campaignId: campaignQ1.id,
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "Brand Alignment Checklist: 10 Signs Your Brand Strategy Needs Validation",
      body: null,
      type: "BLOG_POST",
      status: "DRAFT",
      format: "blog",
      channel: "website",
      onBrand: false,
      brandScore: null,
      wordCount: 0,
      metadata: {
        outline: [
          "Introduction: The hidden cost of brand misalignment",
          "Sign 1: Your team describes the brand differently",
          "Sign 2: Customer feedback contradicts your positioning",
          "Sign 3: Content approval takes more than 3 rounds",
          "Conclusion: The validation path forward",
        ],
      },
      campaignId: campaignQ1.id,
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // Product Awareness content
  await prisma.content.create({
    data: {
      title: "How AI Brand Analysis Works: A Technical Deep Dive",
      body: "Branddock's AI analysis engine examines your brand across 12 distinct dimensions, from visual consistency to messaging coherence. Here's how it works under the hood.\n\n## The 12 Dimensions\n\nOur analysis framework evaluates brands across: Purpose Clarity, Value Proposition, Market Positioning, Audience Alignment, Visual Consistency, Messaging Coherence, Tone Consistency, Competitive Differentiation, Emotional Resonance, Cultural Relevance, Digital Presence, and Brand Promise Delivery.",
      type: "BLOG_POST",
      status: "IN_PROGRESS",
      format: "blog",
      channel: "website",
      onBrand: true,
      brandScore: 78,
      wordCount: 2100,
      metadata: {
        seoTitle: "How AI Brand Analysis Works | Technical Deep Dive",
        tags: ["AI", "brand analysis", "technology", "product"],
      },
      campaignId: campaignAwareness.id,
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "5 Minutes to Your First Brand Score",
      body: "Getting started with Branddock is as simple as answering a few questions. In this quick tutorial, we'll walk you through running your first AI brand analysis and understanding your results.",
      type: "VIDEO",
      status: "PLANNED",
      format: "video",
      channel: "youtube",
      onBrand: true,
      brandScore: null,
      wordCount: 0,
      metadata: {
        duration: 300,
        resolution: "1080p",
        scriptStatus: "draft",
        thumbnailUrl: null,
      },
      campaignId: campaignAwareness.id,
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "Case Study: How TechFlow Achieved 95% Brand Consistency",
      body: "When TechFlow approached us, their brand consistency score was at 43%. Six months later, they hit 95%. Here's exactly how they did it.\n\n## The Challenge\n\nTechFlow, a Series B fintech startup with 120 employees across 4 offices, had a common problem: every team had its own interpretation of the brand. Marketing said one thing, sales pitched another, and the product spoke a different language entirely.",
      type: "CASE_STUDY",
      status: "IN_REVIEW",
      format: "case-study",
      channel: "website",
      onBrand: true,
      brandScore: 88,
      wordCount: 1650,
      metadata: {
        clientName: "TechFlow",
        industry: "Fintech",
        resultMetric: "95% brand consistency",
        timeframe: "6 months",
      },
      campaignId: campaignAwareness.id,
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.content.create({
    data: {
      title: "Product Awareness Social Series: Week 1",
      body: "Post 1/5: Did you know that 73% of consumers say brand consistency increases their trust? Yet only 25% of companies have a formal brand validation process.\n\nBranddock changes that. Our platform gives you research-backed confidence in every brand decision.\n\n#BrandStrategy #Marketing #Branddock",
      type: "SOCIAL_MEDIA",
      status: "DRAFT",
      format: "social",
      channel: "instagram",
      onBrand: false,
      brandScore: 65,
      wordCount: 95,
      metadata: {
        seriesWeek: 1,
        totalPosts: 5,
        imageRequired: true,
        platform: "instagram",
      },
      campaignId: campaignAwareness.id,
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  // ─── Task 4: NewAIAnalysis (Brand) ──────────────────────────────────────────
  console.log("🤖 Seeding AI analyses...");

  await prisma.newAIAnalysis.create({
    data: {
      type: "BRAND_ANALYSIS",
      status: "COMPLETED",
      progress: 100,
      dataPoints: 147,
      duration: 342,
      messages: [
        {
          role: "system",
          content:
            "Starting brand analysis for Branddock Demo workspace. Analyzing across 12 dimensions.",
          timestamp: "2024-12-01T10:00:00Z",
        },
        {
          role: "assistant",
          content:
            "I'll begin by examining your Golden Circle framework. Your 'Why' statement is clear and compelling — it addresses a genuine market pain point around the gap between brand intent and audience perception.",
          timestamp: "2024-12-01T10:00:15Z",
        },
        {
          role: "assistant",
          content:
            "Analyzing your Core Values... I see strong alignment between your values and your product positioning. The emphasis on 'Evidence-Based' directly supports your market differentiation.",
          timestamp: "2024-12-01T10:01:30Z",
        },
        {
          role: "assistant",
          content:
            "Now examining your Brand Positioning statement. The positioning is well-structured and follows the classic framework. However, I notice the 'only platform' claim could benefit from stronger proof points.",
          timestamp: "2024-12-01T10:02:45Z",
        },
        {
          role: "assistant",
          content:
            "Your Competitive Advantage asset is exceptionally well-defined. The four advantage areas create a cohesive moat narrative. The 'Knowledge Compound Effect' is particularly distinctive.",
          timestamp: "2024-12-01T10:04:00Z",
        },
        {
          role: "assistant",
          content:
            "Analysis complete. Overall brand health score: 82/100. Your foundation is strong, but there are opportunities to strengthen your Brand Promise and complete your Brand Personality definition.",
          timestamp: "2024-12-01T10:05:42Z",
        },
      ],
      executiveSummary:
        "Branddock's brand foundation demonstrates strong strategic clarity with a well-articulated Golden Circle and differentiated positioning. The overall brand health score is 82/100, driven by exceptional competitive advantage definition (95) and validated core values (88). Key areas for improvement include completing the Brand Promise asset and finalizing the Brand Personality to ensure consistent voice across all channels. The validation research loop — your core differentiator — is well-reflected in your brand assets but could be more prominently featured in customer-facing messaging.",
      keyFindings: [
        {
          dimension: "Purpose Clarity",
          score: 92,
          finding:
            "Golden Circle is exceptionally well-defined with clear articulation of Why, How, and What. The 'Why' resonates authentically with the product's core value proposition.",
        },
        {
          dimension: "Value Proposition",
          score: 88,
          finding:
            "Core Values are strongly aligned with market positioning. Each value is actionable and measurable, not just aspirational.",
        },
        {
          dimension: "Competitive Differentiation",
          score: 95,
          finding:
            "Competitive advantage is the strongest asset. The four moat areas are distinct, defensible, and clearly communicated.",
        },
        {
          dimension: "Messaging Coherence",
          score: 75,
          finding:
            "Positioning statement is solid but the 'only platform' claim needs substantiation. Brand Promise gap creates messaging inconsistency.",
        },
        {
          dimension: "Brand Promise",
          score: 0,
          finding:
            "Critical gap: No Brand Promise has been defined. This creates a vacuum in customer expectation management.",
        },
        {
          dimension: "Brand Expression",
          score: 45,
          finding:
            "Brand Personality is still in progress. Without clear personality definition, content creators lack guidance on voice and tone.",
        },
      ],
      recommendations: [
        {
          priority: "HIGH",
          title: "Define Brand Promise Immediately",
          description:
            "The Brand Promise is the most critical missing piece. It should articulate the specific, measurable commitment you make to every customer. Consider: 'We promise that every brand decision you make will be backed by evidence, not assumptions.'",
          impact: "Expected +15 points to overall brand health score",
        },
        {
          priority: "HIGH",
          title: "Complete Brand Personality Workshop",
          description:
            "Run a dedicated workshop to finalize personality archetypes and voice attributes. The current draft shows promise but needs validation with the full team.",
          impact: "Expected +20 points to Brand Expression dimension",
        },
        {
          priority: "MEDIUM",
          title: "Strengthen Positioning Proof Points",
          description:
            "Replace the 'only platform' claim with specific, verifiable differentiators. Use data from your competitive analysis to support each claim.",
          impact: "Expected +10 points to Messaging Coherence dimension",
        },
        {
          priority: "LOW",
          title: "Create Brand Messaging Framework",
          description:
            "Develop a messaging hierarchy document that maps key messages to audience segments, ensuring consistent communication across all channels.",
          impact:
            "Will improve content team efficiency and reduce approval cycles",
        },
      ],
      assetId: goldenCircle.id,
      createdById: owner.id,
    },
  });

  // ─── Task 5: Workshops ──────────────────────────────────────────────────────
  console.log("🎓 Seeding workshops...");

  await prisma.workshop.create({
    data: {
      title: "Golden Circle Discovery Workshop",
      status: "COMPLETED",
      type: "golden-circle",
      bundle: "foundation-starter",
      hasFacilitator: true,
      purchaseAmount: 299.0,
      purchasedAt: new Date("2024-10-01T09:00:00Z"),
      currentStep: 6,
      totalSteps: 6,
      startedAt: new Date("2024-10-15T14:00:00Z"),
      completedAt: new Date("2024-10-15T17:30:00Z"),
      duration: 12600,
      facilitator: "Dr. Elena Rodriguez",
      participantCount: 6,
      participants: [
        {
          name: "Brand Manager",
          role: "Owner",
          email: "owner@branddock.demo",
        },
        {
          name: "Content Editor",
          role: "Editor",
          email: "editor@branddock.demo",
        },
        { name: "Sarah Kim", role: "Product Lead", email: "sarah@company.com" },
        {
          name: "James Torres",
          role: "Sales Director",
          email: "james@company.com",
        },
        {
          name: "Priya Patel",
          role: "Customer Success",
          email: "priya@company.com",
        },
        {
          name: "Michael Brown",
          role: "Engineering Lead",
          email: "michael@company.com",
        },
      ],
      stepResponses: {
        step1: {
          title: "Warm-Up & Introductions",
          responses: [
            "Each participant shared their personal connection to the brand",
            "Common theme: passion for making brand strategy accessible",
          ],
        },
        step2: {
          title: "Exploring the WHY",
          responses: [
            "Brainstorm: Why does this company exist beyond profit?",
            "Key themes: democratizing brand strategy, evidence over intuition, empowering small teams",
            "Voting results: 'bridging the gap between intent and perception' received highest alignment",
          ],
        },
        step3: {
          title: "Defining the HOW",
          responses: [
            "Process mapping of core methodology",
            "AI + human research hybrid identified as key differentiator",
            "Emphasis on making validation accessible, not just available",
          ],
        },
        step4: {
          title: "Articulating the WHAT",
          responses: [
            "Product definition exercise",
            "Platform capabilities mapped to customer outcomes",
            "Unified description: SaaS platform for strategy + validation + content",
          ],
        },
        step5: {
          title: "Synthesis & Alignment",
          responses: [
            "Team alignment check: 94% agreement on final Golden Circle",
            "Minor refinements to WHY wording based on customer-facing language",
          ],
        },
        step6: {
          title: "Action Items & Next Steps",
          responses: [
            "Golden Circle to be documented and shared with full organization",
            "Next workshop: Core Values deep dive scheduled for November",
            "Brand Promise workshop to follow in December",
          ],
        },
      },
      canvas: {
        why: "We believe every brand deserves to be understood deeply — not just on the surface, but at the core of what makes it meaningful. We exist to bridge the gap between brand intent and audience perception.",
        how: "By combining AI-powered analysis with structured research methodologies, we create a continuous feedback loop between strategy and validation.",
        what: "Branddock is a SaaS platform that unifies brand strategy, validation research, and campaign-driven content creation into one seamless workflow.",
      },
      objectives: [
        "Define a clear and authentic Golden Circle for the brand",
        "Achieve team alignment on purpose, process, and product",
        "Create a foundation for subsequent brand assets",
        "Identify key differentiators for market positioning",
      ],
      agenda: [
        { time: "14:00", activity: "Warm-Up & Introductions", duration: 30 },
        { time: "14:30", activity: "Exploring the WHY", duration: 45 },
        { time: "15:15", activity: "Break", duration: 15 },
        { time: "15:30", activity: "Defining the HOW", duration: 40 },
        { time: "16:10", activity: "Articulating the WHAT", duration: 35 },
        { time: "16:45", activity: "Synthesis & Alignment", duration: 30 },
        { time: "17:15", activity: "Action Items & Next Steps", duration: 15 },
      ],
      aiReport: {
        overallScore: 92,
        teamAlignment: 94,
        clarityScore: 90,
        actionabilityScore: 88,
        summary:
          "Exceptionally productive workshop with high team alignment. The Golden Circle articulation is clear, authentic, and well-differentiated from competitors. The WHY statement effectively addresses the core market pain point.",
        strengths: [
          "High team participation and engagement across all departments",
          "Clear connection between WHY and actual product capabilities",
          "Strong emotional resonance in purpose statement",
          "Actionable next steps with clear ownership",
        ],
        improvements: [
          "Consider adding customer voice validation to verify resonance",
          "The HOW could be more specific about the unique methodology",
          "Recommend testing the WHAT statement with potential customers",
        ],
      },
      notes: {
        facilitatorNotes:
          "Excellent group dynamic. The engineering lead provided unexpectedly valuable insights about the 'continuous feedback loop' concept. Recommend including technical team in future brand workshops.",
        participantFeedback:
          "Overwhelmingly positive. 5/6 rated the session as 'extremely valuable'. One participant noted they wished they had done this exercise 6 months earlier.",
      },
      gallery: [
        {
          type: "whiteboard",
          url: "/uploads/workshop-whiteboard-01.jpg",
          caption: "Golden Circle brainstorm board",
        },
        {
          type: "photo",
          url: "/uploads/workshop-team-01.jpg",
          caption: "Team alignment voting exercise",
        },
      ],
      assetId: goldenCircle.id,
      createdById: owner.id,
    },
  });

  await prisma.workshop.create({
    data: {
      title: "Core Values Exploration Workshop",
      status: "IN_PROGRESS",
      type: "core-values",
      bundle: "foundation-starter",
      hasFacilitator: false,
      purchaseAmount: 0,
      currentStep: 3,
      totalSteps: 6,
      startedAt: new Date("2024-12-10T10:00:00Z"),
      participantCount: 4,
      participants: [
        {
          name: "Brand Manager",
          role: "Owner",
          email: "owner@branddock.demo",
        },
        {
          name: "Content Editor",
          role: "Editor",
          email: "editor@branddock.demo",
        },
        { name: "Sarah Kim", role: "Product Lead", email: "sarah@company.com" },
        {
          name: "James Torres",
          role: "Sales Director",
          email: "james@company.com",
        },
      ],
      stepResponses: {
        step1: {
          title: "Value Brainstorm",
          responses: [
            "Open brainstorm generated 23 candidate values",
            "Grouped into 7 thematic clusters",
          ],
        },
        step2: {
          title: "Prioritization",
          responses: [
            "Dot voting reduced to top 8 values",
            "Team discussed trade-offs between similar values",
          ],
        },
        step3: {
          title: "Definition Writing",
          responses: [
            "Currently drafting descriptions for top 5 values",
            "Each value needs behavioral examples",
          ],
        },
      },
      canvas: null,
      objectives: [
        "Identify and define 5 core brand values",
        "Ensure values are actionable, not just aspirational",
        "Create behavioral examples for each value",
        "Align values with Golden Circle purpose",
      ],
      assetId: coreValues.id,
      createdById: owner.id,
    },
  });

  // ─── Task 6: Interviews ─────────────────────────────────────────────────────
  console.log("🎤 Seeding interviews...");

  await prisma.interview.create({
    data: {
      title: "Customer Perception Interview - Enterprise Segment",
      status: "COMPLETED",
      currentStep: 5,
      contactName: "Alexandra Petrov",
      contactPosition: "VP of Marketing",
      contactEmail: "a.petrov@techcorp.com",
      contactPhone: "+1 (415) 555-0142",
      contactCompany: "TechCorp International",
      scheduledDate: new Date("2024-11-20T10:00:00Z"),
      scheduledTime: "10:00 AM PST",
      duration: 75,
      questions: [
        {
          id: "q1",
          text: "When you first heard about Branddock, what was your initial impression?",
          category: "brand-perception",
        },
        {
          id: "q2",
          text: "How would you describe Branddock to a colleague in one sentence?",
          category: "brand-clarity",
        },
        {
          id: "q3",
          text: "What problem were you trying to solve when you started using the platform?",
          category: "problem-solution",
        },
        {
          id: "q4",
          text: "What three words come to mind when you think of our brand?",
          category: "brand-association",
        },
        {
          id: "q5",
          text: "How does our brand compare to alternatives you considered?",
          category: "competitive",
        },
        {
          id: "q6",
          text: "What would make you recommend Branddock to someone in your network?",
          category: "advocacy",
        },
      ],
      selectedAssets: [ASSET_GOLDEN_CIRCLE_ID, ASSET_BRAND_POSITIONING_ID],
      answers: [
        {
          questionId: "q1",
          answer:
            "My first impression was curiosity mixed with skepticism. The idea of combining AI analysis with traditional research methods sounded promising, but I'd seen similar claims before. What convinced me was the demo — seeing actual brand scores change in real-time was compelling.",
          notes: "Strong initial skepticism suggests need for social proof in marketing",
        },
        {
          questionId: "q2",
          answer:
            "It's like having a brand strategist, research team, and content quality checker all in one platform.",
          notes: "Excellent natural positioning — close to our intended message",
        },
        {
          questionId: "q3",
          answer:
            "We had 4 offices saying different things about who we are. Our brand deck was 3 years old, and nobody followed it. We needed a way to get everyone on the same page and keep them there.",
          notes: "Pain point: brand inconsistency across distributed teams",
        },
        {
          questionId: "q4",
          answer: "Structured, insightful, and refreshingly honest.",
          notes:
            "All three align well with our brand personality targets. 'Honest' maps to our Transparency value.",
        },
        {
          questionId: "q5",
          answer:
            "Most alternatives were either pure strategy tools or pure content tools. Nobody else gave us the validation loop — the ability to test our assumptions with real research before creating content.",
          notes:
            "Validates our core differentiator: the validation loop. Use this in positioning.",
        },
        {
          questionId: "q6",
          answer:
            "If they have a team larger than 5 people creating content, I'd recommend it in a heartbeat. The brand scoring alone saves us hours of review cycles.",
          notes: "Key advocacy trigger: team size > 5 and review cycle reduction",
        },
      ],
      generalNotes:
        "Alexandra was highly engaged and articulate. She represents our ideal enterprise customer profile well. Her feedback validates our Golden Circle and suggests our positioning resonates with the target audience. Key takeaway: the validation loop is our strongest perceived differentiator.",
      completionRate: 100,
      isLocked: true,
      lockedAt: new Date("2024-11-21T09:00:00Z"),
      approvedAt: new Date("2024-11-21T09:00:00Z"),
      assetId: goldenCircle.id,
      createdById: owner.id,
    },
  });

  await prisma.interview.create({
    data: {
      title: "SMB Customer Interview - Brand Alignment",
      status: "SCHEDULED",
      currentStep: 2,
      contactName: "David Okonkwo",
      contactPosition: "Head of Marketing",
      contactEmail: "david@freshstart.io",
      contactPhone: "+1 (312) 555-0198",
      contactCompany: "FreshStart Labs",
      scheduledDate: new Date("2025-02-15T14:00:00Z"),
      scheduledTime: "2:00 PM CST",
      duration: 60,
      questions: [
        {
          id: "q1",
          text: "What does brand consistency mean to your organization?",
          category: "brand-perception",
        },
        {
          id: "q2",
          text: "How do you currently measure whether your content is on-brand?",
          category: "current-process",
        },
        {
          id: "q3",
          text: "What tools or processes have you tried before?",
          category: "competitive",
        },
        {
          id: "q4",
          text: "If you could solve one brand-related problem tomorrow, what would it be?",
          category: "problem-solution",
        },
      ],
      selectedAssets: [ASSET_CORE_VALUES_ID],
      completionRate: 0,
      assetId: coreValues.id,
      createdById: editor.id,
    },
  });

  await prisma.interview.create({
    data: {
      title: "Agency Partner Interview - Value Proposition",
      status: "TO_SCHEDULE",
      currentStep: 1,
      contactName: "Maria Santos",
      contactPosition: "Creative Director",
      contactEmail: "maria@brightcreative.agency",
      contactCompany: "Bright Creative Agency",
      duration: 45,
      questions: [
        {
          id: "q1",
          text: "How do you currently approach brand strategy for your clients?",
          category: "current-process",
        },
        {
          id: "q2",
          text: "What role does research play in your brand development process?",
          category: "validation",
        },
        {
          id: "q3",
          text: "What would an ideal brand strategy tool look like for an agency?",
          category: "product-feedback",
        },
      ],
      completionRate: 0,
      assetId: brandPositioning.id,
      createdById: owner.id,
    },
  });

  // ─── Task 7: Questionnaires ─────────────────────────────────────────────────
  console.log("📊 Seeding questionnaires...");

  await prisma.questionnaire.create({
    data: {
      name: "Brand Perception Survey Q4 2024",
      description:
        "Comprehensive survey to measure external brand perception across key dimensions. Distributed to current customers and prospects.",
      status: "ANALYZED",
      currentStep: 5,
      questions: [
        {
          id: "q1",
          text: "How familiar are you with Branddock?",
          type: "scale",
          scale: { min: 1, max: 5, labels: ["Not at all", "Extremely"] },
        },
        {
          id: "q2",
          text: "Which words best describe Branddock? (Select up to 3)",
          type: "multiselect",
          options: [
            "Innovative",
            "Trustworthy",
            "Complex",
            "Affordable",
            "Professional",
            "Approachable",
            "Data-driven",
            "Creative",
            "Reliable",
            "Expensive",
          ],
        },
        {
          id: "q3",
          text: "How likely are you to recommend Branddock to a colleague?",
          type: "nps",
          scale: { min: 0, max: 10 },
        },
        {
          id: "q4",
          text: "What is the primary benefit you associate with Branddock?",
          type: "open",
        },
        {
          id: "q5",
          text: "How consistent is Branddock's messaging across channels?",
          type: "scale",
          scale: {
            min: 1,
            max: 5,
            labels: ["Very inconsistent", "Very consistent"],
          },
        },
        {
          id: "q6",
          text: "Which of our competitors have you also evaluated?",
          type: "multiselect",
          options: [
            "Frontify",
            "Bynder",
            "Brandfolder",
            "Canva Brand Kit",
            "Marq",
            "None",
          ],
        },
        {
          id: "q7",
          text: "What is the biggest gap in Branddock's current offering?",
          type: "open",
        },
        {
          id: "q8",
          text: "Rate your overall satisfaction with Branddock.",
          type: "scale",
          scale: {
            min: 1,
            max: 5,
            labels: ["Very unsatisfied", "Very satisfied"],
          },
        },
      ],
      distributionMethod: "email",
      emailSubject: "Help shape the future of Branddock (2 min survey)",
      emailBody:
        "Hi {{name}},\n\nWe're running a quick brand perception survey to understand how you experience Branddock. Your feedback directly shapes our product and messaging.\n\nIt takes about 2 minutes. Your responses are anonymous.\n\nThank you for being part of our community.\n\n— The Branddock Team",
      isAnonymous: true,
      allowMultiple: false,
      reminderDays: 3,
      shareableLink: "https://survey.branddock.com/bp-q4-2024",
      recipients: {
        total: 120,
        segments: [
          { name: "Active Users", count: 65 },
          { name: "Trial Users", count: 30 },
          { name: "Churned", count: 15 },
          { name: "Prospects", count: 10 },
        ],
      },
      totalResponses: 42,
      responseRate: 35.0,
      completionRate: 89.3,
      avgTime: 156,
      responses: {
        summary: {
          q1: { average: 3.8, distribution: { 1: 2, 2: 4, 3: 8, 4: 18, 5: 10 } },
          q2: {
            topSelections: [
              { word: "Data-driven", count: 31 },
              { word: "Professional", count: 27 },
              { word: "Innovative", count: 24 },
              { word: "Trustworthy", count: 19 },
              { word: "Approachable", count: 12 },
            ],
          },
          q3: { nps: 47, promoters: 22, passives: 14, detractors: 6 },
          q5: { average: 4.1, distribution: { 1: 0, 2: 2, 3: 6, 4: 18, 5: 16 } },
          q6: {
            competitors: [
              { name: "Frontify", count: 18 },
              { name: "Canva Brand Kit", count: 14 },
              { name: "Bynder", count: 8 },
              { name: "None", count: 12 },
            ],
          },
          q8: { average: 4.2, distribution: { 1: 0, 2: 1, 3: 5, 4: 20, 5: 16 } },
        },
        openResponses: {
          q4: [
            "Research-backed brand decisions",
            "The AI analysis saves me hours",
            "Keeping our whole team on the same brand page",
            "Brand scoring on content — finally measurable quality",
            "The workshop feature is a game-changer for alignment",
          ],
          q7: [
            "More integrations with design tools like Figma",
            "A mobile app for on-the-go approvals",
            "Multi-language support for global teams",
            "Better reporting and analytics dashboard",
            "Template library for common brand assets",
          ],
        },
      },
      aiInsights: {
        overallSentiment: "positive",
        sentimentScore: 78,
        keyThemes: [
          {
            theme: "Research-Backed Value",
            mentions: 28,
            sentiment: "very positive",
            insight:
              "Respondents consistently cite the research and validation aspect as the primary differentiator. This aligns perfectly with our 'Evidence-Based' core value.",
          },
          {
            theme: "Team Alignment",
            mentions: 19,
            sentiment: "positive",
            insight:
              "The platform's ability to get teams on the same page is highly valued, particularly in organizations with 10+ content creators.",
          },
          {
            theme: "AI Analysis Quality",
            mentions: 15,
            sentiment: "positive",
            insight:
              "AI analysis is perceived as valuable but some users want more transparency in how scores are calculated.",
          },
          {
            theme: "Integration Gaps",
            mentions: 12,
            sentiment: "negative",
            insight:
              "Lack of integrations with existing design and project management tools is the most frequently cited limitation.",
          },
        ],
        npsAnalysis: {
          score: 47,
          benchmark: "Above average for B2B SaaS (industry avg: 31)",
          promoterDrivers: [
            "Brand scoring accuracy",
            "Research methodology quality",
            "Customer support responsiveness",
          ],
          detractorDrivers: [
            "Limited integrations",
            "Learning curve for new users",
            "Price relative to features used",
          ],
        },
        recommendations: [
          "Prioritize Figma and Slack integrations based on demand signals",
          "Create an interactive onboarding tutorial to reduce learning curve",
          "Consider a lighter pricing tier for small teams (1-3 users)",
          "Add AI score explainability feature to address transparency concerns",
        ],
      },
      isValidated: true,
      isLocked: true,
      validatedAt: new Date("2024-12-20T16:00:00Z"),
      assetId: goldenCircle.id,
      createdById: owner.id,
    },
  });

  await prisma.questionnaire.create({
    data: {
      name: "Employee Brand Alignment Survey",
      description:
        "Internal survey to measure how well employees understand and can articulate our brand values, positioning, and promise.",
      status: "DRAFT",
      currentStep: 2,
      questions: [
        {
          id: "q1",
          text: "Can you state our company's mission in your own words?",
          type: "open",
        },
        {
          id: "q2",
          text: "Which of the following are our core values?",
          type: "multiselect",
          options: [
            "Evidence-Based",
            "Move Fast",
            "Clarity Over Complexity",
            "Customer Obsession",
            "Continuous Alignment",
            "Collaborative Intelligence",
            "Transparency",
            "Disruption",
          ],
        },
        {
          id: "q3",
          text: "How confident are you in explaining our brand positioning to a customer?",
          type: "scale",
          scale: {
            min: 1,
            max: 5,
            labels: ["Not confident", "Very confident"],
          },
        },
      ],
      distributionMethod: "email",
      isAnonymous: false,
      totalResponses: 0,
      responseRate: 0,
      completionRate: 0,
      assetId: coreValues.id,
      createdById: editor.id,
    },
  });

  // ─── Task 8: Personas ──────────────────────────────────────────────────────
  console.log("👥 Seeding personas...");

  const personaSarah = await prisma.persona.create({
    data: {
      id: PERSONA_SARAH_ID,
      name: "Sarah Chen",
      tagline: "The Data-Driven Startup Founder",
      role: "Founder & CEO",
      description:
        "Sarah is a 34-year-old serial entrepreneur who has founded two B2B SaaS companies. She's deeply analytical and believes that every business decision should be backed by data. She bootstrapped her current startup to $2M ARR and is now preparing for a Series A. She struggles with brand consistency as her team scales from 8 to 25 people and knows that investors scrutinize brand strength.",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahChen",
      researchConfidence: 78,
      methodsCompleted: 3,
      isLocked: false,
      age: "34",
      gender: "Female",
      location: "San Francisco, CA",
      occupation: "Founder & CEO, DataLens Analytics",
      education: "MBA from Stanford, BS Computer Science from MIT",
      income: "$180,000 - $250,000",
      familyStatus: "Married, 1 child (toddler)",
      personalityType: "INTJ (Architect)",
      coreValues: [
        "Data-driven decision making",
        "Transparency and authenticity",
        "Efficiency and impact",
        "Continuous learning",
        "Building lasting relationships",
      ],
      interests: [
        "Startup podcasts (How I Built This, Masters of Scale)",
        "Data visualization and analytics",
        "Rock climbing",
        "Angel investing",
        "Reading business biographies",
      ],
      goals: [
        {
          goal: "Establish a recognizable brand before Series A",
          priority: "critical",
          timeframe: "6 months",
        },
        {
          goal: "Ensure brand consistency across growing team",
          priority: "high",
          timeframe: "3 months",
        },
        {
          goal: "Build thought leadership position in the analytics space",
          priority: "medium",
          timeframe: "12 months",
        },
        {
          goal: "Create a content engine that scales with the team",
          priority: "medium",
          timeframe: "6 months",
        },
      ],
      motivations: [
        "Proving to investors that her brand is strong and differentiated",
        "Being seen as a credible industry leader, not just another startup",
        "Empowering her team to create on-brand content without constant oversight",
        "Making brand decisions as rigorous as product decisions",
      ],
      frustrations: [
        "Brand guidelines PDF that nobody reads or follows",
        "Spending hours reviewing content that's off-brand",
        "Marketing agencies that don't understand her analytical approach",
        "Tools that are too enterprise-focused for a growing startup",
        "The subjective nature of traditional brand feedback",
      ],
      painPoints: [
        "No way to measure brand consistency quantitatively",
        "Team members interpret the brand differently",
        "Time wasted on brand debates without data to resolve them",
        "Content quality varies wildly between team members",
      ],
      behaviors: {
        digital: [
          "Uses Slack, Notion, Linear for daily work",
          "Active on LinkedIn and Twitter (X)",
          "Reads Stratechery, First Round Review, Lenny's Newsletter",
          "Evaluates tools by their data capabilities first",
        ],
        purchasing: [
          "Prefers self-service onboarding",
          "Will pay for tools that save measurable time",
          "Reads G2 and Product Hunt reviews before buying",
          "Needs to see ROI within 30 days",
          "Typically tries free tier first, upgrades if value is proven",
        ],
        brandInteraction: [
          "Expects consistent experience across all touchpoints",
          "Values transparency in pricing and product roadmap",
          "Appreciates data-backed recommendations over opinions",
          "Will share positive experiences with her founder network",
        ],
      },
      strategicImplications: {
        messaging:
          "Lead with data and measurable outcomes. Avoid fluffy brand language. Show ROI in terms she cares about: time saved on reviews, brand consistency scores, investor-ready brand metrics.",
        channels:
          "LinkedIn for thought leadership, Twitter for community engagement, email for product updates. She discovers tools through founder communities and peer recommendations.",
        contentStyle:
          "Analytical, concise, action-oriented. Include benchmarks, percentages, and case studies. She skips content that doesn't have a clear takeaway.",
        productFeatures:
          "Prioritize: brand scoring dashboard, team collaboration features, analytics and reporting, integration with Notion/Slack. De-prioritize: manual template builders, print-focused tools.",
      },
      demographics: {
        companySize: "8-25 employees",
        industry: "B2B SaaS / Analytics",
        fundingStage: "Bootstrapped to $2M ARR, preparing Series A",
        techStack: [
          "React",
          "Node.js",
          "PostgreSQL",
          "AWS",
          "Notion",
          "Linear",
          "Figma",
        ],
      },
      tags: [
        "early-adopter",
        "data-driven",
        "startup-founder",
        "high-value",
        "series-a-prep",
      ],
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  const personaMarcus = await prisma.persona.create({
    data: {
      id: PERSONA_MARCUS_ID,
      name: "Marcus Johnson",
      tagline: "The Enterprise Marketing Director",
      role: "Director of Marketing",
      description:
        "Marcus is a seasoned marketing professional who oversees a team of 12 at a mid-size enterprise. He's been tasked with a brand refresh and needs tools that can scale across departments while providing executive-level reporting.",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusJohnson",
      researchConfidence: 35,
      methodsCompleted: 1,
      isLocked: false,
      age: "42",
      gender: "Male",
      location: "Chicago, IL",
      occupation: "Director of Marketing, Meridian Financial",
      education: "BBA Marketing from Northwestern",
      income: "$150,000 - $200,000",
      familyStatus: "Married, 2 children",
      personalityType: "ENFJ (Protagonist)",
      coreValues: [
        "Team empowerment",
        "Strategic thinking",
        "Brand excellence",
      ],
      interests: [
        "Marketing conferences",
        "Golf",
        "Business strategy books",
        "Mentoring junior marketers",
      ],
      goals: [
        {
          goal: "Complete brand refresh within budget",
          priority: "critical",
          timeframe: "9 months",
        },
        {
          goal: "Improve cross-department brand consistency",
          priority: "high",
          timeframe: "6 months",
        },
      ],
      motivations: [
        "Demonstrating marketing's impact to the C-suite",
        "Building a cohesive brand that the whole company rallies behind",
      ],
      frustrations: [
        "Too many tools with overlapping features",
        "Difficulty getting buy-in from non-marketing stakeholders",
        "Long procurement cycles for new software",
      ],
      tags: ["enterprise", "brand-refresh", "team-lead"],
      workspaceId: workspace.id,
      createdById: editor.id,
    },
  });

  // ─── Task 4: NewAIAnalysis (Persona) ────────────────────────────────────────
  console.log("🧠 Seeding persona AI analysis...");

  await prisma.newAIAnalysis.create({
    data: {
      type: "PERSONA_ANALYSIS",
      status: "COMPLETED",
      progress: 100,
      dataPoints: 89,
      duration: 267,
      messages: [
        {
          role: "system",
          content:
            "Starting persona analysis for Sarah Chen. Analyzing behavioral patterns, psychographics, and strategic implications.",
          timestamp: "2024-12-05T11:00:00Z",
        },
        {
          role: "assistant",
          content:
            "Analyzing Sarah's demographic profile and professional context. She represents a high-value segment: data-driven startup founders preparing for institutional funding.",
          timestamp: "2024-12-05T11:00:20Z",
        },
        {
          role: "assistant",
          content:
            "Psychographic analysis reveals strong analytical tendencies with a preference for quantifiable outcomes. Her INTJ personality type suggests she values systems, efficiency, and evidence over intuition.",
          timestamp: "2024-12-05T11:01:30Z",
        },
        {
          role: "assistant",
          content:
            "Behavioral patterns indicate a self-service preference with rapid evaluation criteria. She's likely to convert within 14 days if the value proposition is clear and measurable.",
          timestamp: "2024-12-05T11:02:45Z",
        },
        {
          role: "assistant",
          content:
            "Analysis complete. Sarah Chen profile is highly actionable with clear strategic implications across messaging, channel strategy, and product development.",
          timestamp: "2024-12-05T11:04:27Z",
        },
      ],
      executiveSummary:
        "Sarah Chen represents the ideal early adopter for Branddock: a data-driven founder who values measurable outcomes and is experiencing acute brand consistency pain as her team scales. Her analytical mindset aligns perfectly with our evidence-based positioning. She has high lifetime value potential, strong network influence in the startup community, and her use case (Series A preparation) creates natural urgency. Key opportunity: position brand validation as essential investor due diligence.",
      keyFindings: [
        {
          finding: "High urgency segment",
          detail:
            "Series A preparation creates a natural deadline for brand strategy. Sarah needs measurable brand health metrics within 6 months.",
        },
        {
          finding: "Network multiplier",
          detail:
            "Active in founder communities and angel investing circles. A successful outcome with Sarah could drive 8-12 referrals.",
        },
        {
          finding: "Feature alignment",
          detail:
            "Core platform features (brand scoring, AI analysis, team collaboration) directly address her top frustrations.",
        },
        {
          finding: "Price sensitivity",
          detail:
            "Bootstrapped mentality but willing to pay for ROI. Free tier trial with clear upgrade path is optimal.",
        },
      ],
      recommendations: [
        {
          title: "Create 'Investor-Ready Brand' content track",
          description:
            "Develop targeted content showing how brand validation metrics strengthen Series A narratives. Include case studies of funded companies.",
          priority: "HIGH",
        },
        {
          title: "Build founder community partnership",
          description:
            "Partner with Y Combinator, Techstars, or First Round Capital to offer brand workshops as portfolio services.",
          priority: "MEDIUM",
        },
        {
          title: "Optimize self-service onboarding for analytical users",
          description:
            "Ensure the onboarding flow highlights data dashboards, scoring methodology, and ROI calculators within the first 5 minutes.",
          priority: "HIGH",
        },
      ],
      dimensions: {
        behavioral: {
          score: 85,
          summary:
            "Highly digital-native with strong self-service preference. Evaluates tools systematically and expects rapid time-to-value. Active content consumer who shares valuable discoveries with her network.",
        },
        psychographic: {
          score: 92,
          summary:
            "Data-driven decision maker with INTJ personality traits. Values efficiency, transparency, and evidence-based approaches. Low tolerance for subjective or unmeasurable brand advice.",
        },
        needsBased: {
          score: 78,
          summary:
            "Primary need is quantifiable brand consistency measurement. Secondary need is team enablement without constant oversight. Tertiary need is investor-ready brand documentation.",
        },
        strategic: {
          score: 88,
          summary:
            "High-value target with strong product-market fit. Optimal acquisition through founder communities and data-focused content marketing. Retention driven by measurable ROI and integration depth.",
        },
      },
      confidenceBoost: 35,
      personaId: personaSarah.id,
      createdById: owner.id,
    },
  });

  // ─── Task 9: Products ──────────────────────────────────────────────────────
  console.log("📦 Seeding products...");

  const productPlatform = await prisma.product.create({
    data: {
      id: PRODUCT_PLATFORM_ID,
      name: "Digital Platform Suite",
      description:
        "Comprehensive SaaS platform for brand strategy, validation research, and campaign-driven content creation. Includes AI-powered brand analysis, workshop facilitation tools, interview and questionnaire builders, persona management, and real-time brand scoring across all content.",
      category: "SaaS Platform",
      source: "WEBSITE_URL",
      sourceUrl: "https://branddock.com/platform",
      status: "ACTIVE",
      analysisStatus: "ANALYZED",
      pricing: "$49-499/month",
      pricingModel: "tiered-subscription",
      pricingDetails:
        "Free tier: 1 user, 1 campaign, basic AI analysis. Starter ($49/mo): 3 users, 5 campaigns, full AI analysis. Professional ($149/mo): 10 users, unlimited campaigns, all research methods. Enterprise ($499/mo): unlimited users, custom integrations, dedicated support.",
      features: [
        {
          name: "AI Brand Analysis",
          description:
            "12-dimension brand health assessment powered by GPT-4 and Claude",
          tier: "free",
        },
        {
          name: "Golden Circle Workshops",
          description:
            "Guided workshop sessions for defining purpose, process, and product",
          tier: "starter",
        },
        {
          name: "Customer Interviews",
          description:
            "Structured interview management with question templates and insights",
          tier: "professional",
        },
        {
          name: "Brand Questionnaires",
          description:
            "Customizable surveys with AI-powered analysis of responses",
          tier: "professional",
        },
        {
          name: "Persona Builder",
          description:
            "Research-backed persona creation with AI psychographic analysis",
          tier: "starter",
        },
        {
          name: "Campaign Manager",
          description:
            "Campaign-driven content organization with real-time brand scoring",
          tier: "free",
        },
        {
          name: "Brand Styleguide",
          description:
            "Centralized brand guidelines with automatic extraction from existing assets",
          tier: "starter",
        },
        {
          name: "Content Studio",
          description:
            "AI-assisted content creation with instant brand alignment scoring",
          tier: "professional",
        },
        {
          name: "Team Collaboration",
          description:
            "Role-based access control, approval workflows, and activity feeds",
          tier: "starter",
        },
        {
          name: "Custom Integrations",
          description:
            "API access, Slack/Notion integrations, SSO, custom webhooks",
          tier: "enterprise",
        },
      ],
      benefits: [
        {
          benefit: "Reduce content review cycles by 60%",
          target: "Marketing teams",
          evidence: "Based on beta customer data from 47 companies",
        },
        {
          benefit: "Achieve measurable brand consistency across all channels",
          target: "Brand managers",
          evidence: "Average brand consistency score improvement: 43% to 87%",
        },
        {
          benefit: "Cut brand strategy costs by 70% vs. agency alternatives",
          target: "Startup founders",
          evidence:
            "Compared to average agency brand strategy engagement ($25,000-$75,000)",
        },
        {
          benefit: "Get investor-ready brand metrics in under 30 days",
          target: "Series A/B companies",
          evidence: "12 of 15 beta customers successfully included brand metrics in pitch decks",
        },
        {
          benefit: "Onboard new team members to brand guidelines in 1 day vs. 2 weeks",
          target: "Growing teams",
          evidence: "Self-reported by 89% of beta customers with 10+ employees",
        },
      ],
      useCases: [
        {
          title: "Brand Launch",
          description:
            "New companies establishing their brand foundation from scratch, using workshops and AI analysis to build a validated brand strategy before going to market.",
          personas: ["Startup Founders", "First-time CMOs"],
        },
        {
          title: "Brand Refresh",
          description:
            "Established companies modernizing their brand with a research-backed approach, validating changes with customer interviews and surveys before rolling out.",
          personas: ["Marketing Directors", "Brand Managers"],
        },
        {
          title: "Scaling Content Operations",
          description:
            "Growing teams that need to maintain brand consistency while increasing content volume, using brand scoring and campaign management to ensure quality at scale.",
          personas: ["Content Leads", "Marketing Operations"],
        },
        {
          title: "Investor Preparation",
          description:
            "Pre-funding companies demonstrating brand strength with quantifiable metrics, using AI analysis and validation research to build compelling narratives.",
          personas: ["Founders", "CFOs"],
        },
      ],
      targetAudience: {
        primary: "Marketing teams at B2B SaaS companies (10-200 employees)",
        secondary: "Brand agencies serving growth-stage clients",
        segments: [
          {
            name: "Startup Founders",
            size: "Large",
            fit: "High",
            reasoning:
              "Acute brand pain during scaling, data-driven mindset, budget-conscious",
          },
          {
            name: "Marketing Directors",
            size: "Medium",
            fit: "High",
            reasoning:
              "Responsible for brand consistency, need executive reporting, manage teams",
          },
          {
            name: "Brand Agencies",
            size: "Small",
            fit: "Medium",
            reasoning:
              "Potential white-label or partner opportunity, need client-facing tools",
          },
        ],
      },
      analyzedAt: new Date("2024-11-01T10:00:00Z"),
      analysisSteps: [
        {
          step: "URL Analysis",
          status: "completed",
          timestamp: "2024-11-01T10:00:15Z",
        },
        {
          step: "Feature Extraction",
          status: "completed",
          timestamp: "2024-11-01T10:01:30Z",
        },
        {
          step: "Benefit Mapping",
          status: "completed",
          timestamp: "2024-11-01T10:02:45Z",
        },
        {
          step: "Use Case Generation",
          status: "completed",
          timestamp: "2024-11-01T10:03:30Z",
        },
        {
          step: "Audience Analysis",
          status: "completed",
          timestamp: "2024-11-01T10:04:15Z",
        },
      ],
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  const productConsulting = await prisma.product.create({
    data: {
      id: PRODUCT_CONSULTING_ID,
      name: "Consulting Services",
      description:
        "Premium hands-on brand strategy consulting for enterprises that need dedicated expertise. Includes facilitated workshops, stakeholder interviews, competitive analysis, and a comprehensive brand playbook.",
      category: "Professional Services",
      source: "MANUAL",
      status: "DRAFT",
      analysisStatus: "DRAFT",
      pricing: "$5,000 - $25,000 per engagement",
      pricingModel: "project-based",
      pricingDetails:
        "Brand Audit: $5,000. Brand Foundation Package: $12,000. Full Brand Strategy: $25,000. All include platform access for 12 months.",
      features: [
        {
          name: "Facilitated Workshops",
          description:
            "Expert-led brand workshops with a certified facilitator",
        },
        {
          name: "Stakeholder Interviews",
          description:
            "In-depth interviews with leadership, customers, and partners",
        },
        {
          name: "Competitive Analysis",
          description:
            "Comprehensive competitor brand audit and positioning map",
        },
        {
          name: "Brand Playbook",
          description:
            "Complete deliverable including strategy, guidelines, and implementation plan",
        },
      ],
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // ─── Task 9: ProductPersona Links ───────────────────────────────────────────
  console.log("🔗 Seeding product-persona links...");

  await prisma.productPersona.create({
    data: {
      productId: productPlatform.id,
      personaId: personaSarah.id,
    },
  });

  await prisma.productPersona.create({
    data: {
      productId: productConsulting.id,
      personaId: personaSarah.id,
    },
  });

  // ─── Task 10: Brand Styleguide ──────────────────────────────────────────────
  console.log("🎨 Seeding brand styleguide...");

  await prisma.brandStyleguide.create({
    data: {
      workspaceId: workspace.id,
      name: "Brand Styleguide",
      sourceType: "WEBSITE",
      sourceUrl: "https://www.branddock.com",
      status: "COMPLETE",

      // Typography
      primaryFont: "Inter",
      secondaryFont: "Georgia",
      typeScale: [
        { level: "H1", size: "48px", weight: "700", lineHeight: "1.2", preview: "The quick brown fox" },
        { level: "H2", size: "36px", weight: "600", lineHeight: "1.25", preview: "The quick brown fox" },
        { level: "H3", size: "28px", weight: "600", lineHeight: "1.3", preview: "The quick brown fox" },
        { level: "H4", size: "22px", weight: "500", lineHeight: "1.35", preview: "The quick brown fox" },
        { level: "Body", size: "16px", weight: "400", lineHeight: "1.5", preview: "The quick brown fox" },
        { level: "Small", size: "14px", weight: "400", lineHeight: "1.5", preview: "The quick brown fox" },
      ],

      // Tone of Voice
      contentGuidelines: [
        "Guidelines that feel on-point and authentic",
        "Material and expressions — descriptive, honest style",
        "Content credible — build trustworthiness",
        "Short and approachable tone throughout",
      ],
      writingGuidelines: [
        "Use active voice",
        "Keep sentences under 20 words",
        "Avoid jargon and complex terms",
        "Write with empathy and honesty",
        "Use contractions where possible",
      ],
      examplePhrases: [
        { text: "We started in a modest lab", type: "DO" },
        { text: "Design tools to help manufacturers", type: "DO" },
        { text: "Create content that resonates", type: "DO" },
        { text: "Utilize a platform to optimize workflow efficiency", type: "DONT" },
        { text: "The system enables content generation capabilities", type: "DONT" },
      ],

      // Imagery
      photographyGuidelines: [
        "Natural lighting preferred",
        "Real environments, not staged scenes",
        "Close-up and in-process details/action",
        "Clean, uncluttered backgrounds",
        "Warm imagery, aligned with brand color palette",
      ],
      illustrationGuidelines: [
        "Flat design with subtle gradients",
        "Consistent line weights",
        "Brand colors only",
        "Rounded corners on all shapes",
      ],
      imageryDonts: [
        "Generic stock photos",
        "Heavy filters or effects",
        "Clip art or outdated graphics",
        "Busy or distracting backgrounds",
        "Images that conflict with brand colors",
      ],

      // Logo usage guidelines & don'ts
      logoUsageGuidelines: [
        "Minimum clear space: 2x the mark logo",
        "Minimum size: 48px width/height, 32px for print",
        "Always provide three color versions of the logo file",
      ],
      logoDonts: [
        "Don't stretch or distort",
        "Don't use wrong colors",
        "Don't place on busy backgrounds",
        "Don't add effects or shadows",
        "Don't make it too small",
      ],
      colorDonts: [
        "Don't use colors outside the palette",
        "Don't reduce opacity below 60%",
        "Don't combine accent colors",
      ],

      // Logos (relational)
      logos: {
        create: [
          {
            variant: "PRIMARY",
            label: "Primary Logo",
            description: "Full color logo for standard use on light backgrounds",
            backgroundColor: "#f5f5f5",
            sortOrder: 0,
          },
          {
            variant: "ICON_MARK",
            label: "Icon Mark",
            description: "Standalone brand icon for compact spaces and favicons",
            backgroundColor: "#0d9488",
            sortOrder: 1,
          },
          {
            variant: "SCALE_ONLY",
            label: "Scale Only",
            description: "Clean, minimal version for small sizes and watermarks",
            backgroundColor: "#f5f5f5",
            sortOrder: 2,
          },
        ],
      },

      // Colors (relational)
      colors: {
        create: [
          // Primary colors
          {
            name: "Teal 600",
            hex: "#0d9488",
            rgb: "13, 148, 136",
            hsl: "175, 84%, 32%",
            cmyk: "91, 0, 8, 42",
            tags: ["Brand", "Primary"],
            category: "PRIMARY",
            sortOrder: 0,
          },
          {
            name: "Teal 700",
            hex: "#0f766e",
            rgb: "15, 118, 110",
            hsl: "175, 77%, 26%",
            cmyk: "87, 0, 7, 54",
            tags: ["Brand", "Primary Dark"],
            category: "PRIMARY",
            sortOrder: 1,
          },
          {
            name: "Teal 400",
            hex: "#2dd4bf",
            rgb: "45, 212, 191",
            hsl: "173, 66%, 50%",
            cmyk: "79, 0, 10, 17",
            tags: ["Brand", "Primary Light"],
            category: "PRIMARY",
            sortOrder: 2,
          },
          // Secondary
          {
            name: "Slate 800",
            hex: "#1e293b",
            rgb: "30, 41, 59",
            hsl: "217, 33%, 17%",
            cmyk: "49, 31, 0, 77",
            tags: ["Text", "Headings"],
            category: "SECONDARY",
            sortOrder: 3,
          },
          {
            name: "Slate 600",
            hex: "#475569",
            rgb: "71, 85, 105",
            hsl: "215, 19%, 35%",
            cmyk: "32, 19, 0, 59",
            tags: ["Text", "Body"],
            category: "SECONDARY",
            sortOrder: 4,
          },
          // Accent
          {
            name: "Amber 500",
            hex: "#f59e0b",
            rgb: "245, 158, 11",
            hsl: "38, 92%, 50%",
            cmyk: "0, 36, 96, 4",
            tags: ["Accent", "Warning"],
            category: "ACCENT",
            sortOrder: 5,
          },
          {
            name: "Rose 500",
            hex: "#f43f5e",
            rgb: "244, 63, 94",
            hsl: "350, 89%, 60%",
            cmyk: "0, 74, 62, 4",
            tags: ["Accent", "Error"],
            category: "ACCENT",
            sortOrder: 6,
          },
          // Neutral
          {
            name: "Gray 100",
            hex: "#f3f4f6",
            rgb: "243, 244, 246",
            hsl: "220, 14%, 96%",
            cmyk: "1, 1, 0, 4",
            tags: ["Background", "Surface"],
            category: "NEUTRAL",
            sortOrder: 7,
          },
          {
            name: "White",
            hex: "#ffffff",
            rgb: "255, 255, 255",
            hsl: "0, 0%, 100%",
            cmyk: "0, 0, 0, 0",
            tags: ["Background"],
            category: "NEUTRAL",
            sortOrder: 8,
          },
        ],
      },

      createdById: owner.id,
    },
  });

  // ─── Task 11: Business Strategies ───────────────────────────────────────────
  console.log("📈 Seeding business strategies...");

  const competitiveStrategy = await prisma.businessStrategy.create({
    data: {
      type: "BRAND_BUILDING",
      title: "Competitive Analysis",
      description:
        "Comprehensive analysis of the brand management and strategy tool landscape, identifying key competitors, market positioning opportunities, and sustainable competitive advantages.",
      status: "completed",
      isLocked: false,
      icon: "🏆",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-12-31"),
      vision: "Establish category leadership in the AI-powered brand management space by understanding and outmaneuvering competitors.",
      rationale: "A thorough competitive analysis is essential before allocating resources to product development and marketing efforts.",
      assumptions: [
        "The brand management tool market continues to grow at 12% CAGR",
        "No competitor currently offers integrated validation research",
        "AI-powered brand analysis is a differentiating factor",
      ],
      focusAreas: ["Market Share", "Brand Awareness", "Partnerships"],
      content: {
        overview:
          "The brand management tool market is valued at $4.2B in 2024, growing at 12% CAGR. The market is fragmented with no single player offering the full strategy-validation-content pipeline that Branddock provides.",
        competitors: [
          {
            name: "Frontify",
            category: "Brand Management",
            strengths: [
              "Strong DAM capabilities",
              "Enterprise-grade",
              "Good integrations",
            ],
            weaknesses: [
              "No research/validation tools",
              "No AI analysis",
              "High price point",
            ],
            marketShare: "12%",
            pricing: "$99-599/mo",
            threat: "Medium",
          },
          {
            name: "Bynder",
            category: "Digital Asset Management",
            strengths: [
              "Excellent DAM",
              "Creative workflow",
              "Global presence",
            ],
            weaknesses: [
              "Asset-focused, not strategy-focused",
              "No validation methodology",
              "Complex setup",
            ],
            marketShare: "15%",
            pricing: "Custom enterprise pricing",
            threat: "Low",
          },
          {
            name: "Canva Brand Kit",
            category: "Design & Brand",
            strengths: [
              "Massive user base",
              "Easy to use",
              "Free tier",
            ],
            weaknesses: [
              "Surface-level brand management",
              "No strategy tools",
              "Limited for complex brands",
            ],
            marketShare: "8%",
            pricing: "$12.99-29.99/mo",
            threat: "Low (different segment)",
          },
          {
            name: "Marq (formerly Lucidpress)",
            category: "Brand Templating",
            strengths: [
              "Template-first approach",
              "Good for distributed teams",
              "Reasonable pricing",
            ],
            weaknesses: [
              "No research tools",
              "Limited AI capabilities",
              "Template-only focus",
            ],
            marketShare: "5%",
            pricing: "$10-49/mo",
            threat: "Low",
          },
        ],
        positioningMap: {
          axes: {
            x: "Strategy Depth (Basic -> Comprehensive)",
            y: "Validation Capability (None -> Research-Backed)",
          },
          position:
            "Top-right quadrant: Branddock is uniquely positioned as the only tool offering both comprehensive strategy depth AND research-backed validation.",
        },
        opportunities: [
          "No competitor offers integrated validation research (workshops, interviews, surveys)",
          "AI-powered brand analysis is nascent — opportunity to establish category leadership",
          "Growing demand for measurable brand metrics from investors and boards",
          "Remote/distributed teams need centralized brand truth sources",
        ],
        threats: [
          "Large players (Adobe, Salesforce) could add brand strategy features",
          "AI-native startups could emerge with similar analysis capabilities",
          "Market consolidation could create all-in-one competitors",
        ],
      },
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  const growthStrategy = await prisma.businessStrategy.create({
    data: {
      type: "GROWTH",
      title: "Growth Strategy 2026",
      description:
        "Product-led growth strategy focusing on freemium acquisition, community-driven expansion, and strategic partnerships for market penetration.",
      status: "active",
      isLocked: false,
      icon: "📈",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      vision: "Achieve 10,000 active workspaces and $5M ARR through a product-led growth flywheel combining freemium acquisition with strategic partnerships.",
      rationale: "Product-led growth is the most capital-efficient path to market leadership in our segment. Freemium lowers acquisition cost while community builds a moat.",
      assumptions: [
        "Free AI brand analysis converts at 8% to paid plans",
        "Average revenue per user can increase 30% with premium tier",
        "Churn can be reduced below 5% with improved onboarding",
        "Partnership channels can drive 20% of new signups",
      ],
      focusAreas: ["Market Share", "Revenue Growth", "Customer Acquisition", "Brand Awareness", "Partnerships"],
      content: {
        overview:
          "Outline for PLG strategy targeting 10,000 active workspaces within 18 months of launch.",
        pillars: [
          {
            name: "Freemium Funnel",
            status: "planned",
            description:
              "Free AI brand analysis as top-of-funnel acquisition tool. Target: 5,000 free analyses/month converting at 8% to paid.",
          },
          {
            name: "Community & Content",
            status: "planned",
            description:
              "Build a community of brand practitioners through educational content, workshops, and a branded podcast.",
          },
          {
            name: "Strategic Partnerships",
            status: "not started",
            description:
              "Partner with accelerators, VC firms, and marketing agencies to embed Branddock in their workflows.",
          },
        ],
      },
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // ─── Objectives for Growth Strategy ───────────────────────────────────────────
  console.log("🎯 Seeding strategic objectives...");

  const objMarketShare = await prisma.strategicObjective.create({
    data: {
      title: "Increase Market Share",
      description: "Expand our presence in key markets and capture a larger share of the AI-powered brand management space.",
      focusArea: "Market Share",
      priority: "HIGH",
      status: "ON_TRACK",
      metricType: "PERCENTAGE",
      startValue: 8,
      targetValue: 15,
      currentValue: 12,
      sortOrder: 0,
      strategyId: growthStrategy.id,
    },
  });

  await prisma.keyResult.createMany({
    data: [
      { description: "Launch in 3 new regions", targetValue: "3", currentValue: "2", status: "IN_PROGRESS", sortOrder: 0, objectiveId: objMarketShare.id },
      { description: "Acquire 500 new enterprise customers", targetValue: "500", currentValue: "380", status: "IN_PROGRESS", sortOrder: 1, objectiveId: objMarketShare.id },
      { description: "Establish 10 strategic partnerships", targetValue: "10", currentValue: "7", status: "IN_PROGRESS", sortOrder: 2, objectiveId: objMarketShare.id },
    ],
  });

  const objRevenue = await prisma.strategicObjective.create({
    data: {
      title: "Revenue Growth",
      description: "Drive significant revenue growth through premium offerings and reduced churn.",
      focusArea: "Revenue Growth",
      priority: "HIGH",
      status: "ON_TRACK",
      metricType: "CURRENCY",
      startValue: 1800000,
      targetValue: 5000000,
      currentValue: 3200000,
      sortOrder: 1,
      strategyId: growthStrategy.id,
    },
  });

  await prisma.keyResult.createMany({
    data: [
      { description: "Launch premium tier", targetValue: "1", currentValue: "1", status: "COMPLETED", sortOrder: 0, objectiveId: objRevenue.id },
      { description: "Increase ARPU by 30%", targetValue: "30%", currentValue: "+22%", status: "IN_PROGRESS", sortOrder: 1, objectiveId: objRevenue.id },
      { description: "Reduce churn below 5%", targetValue: "5%", currentValue: "6.1%", status: "AT_RISK", sortOrder: 2, objectiveId: objRevenue.id },
    ],
  });

  const objAwareness = await prisma.strategicObjective.create({
    data: {
      title: "Brand Awareness",
      description: "Establish Branddock as a recognized thought leader in the brand management space.",
      focusArea: "Brand Awareness",
      priority: "MEDIUM",
      status: "AT_RISK",
      metricType: "PERCENTAGE",
      startValue: 12,
      targetValue: 35,
      currentValue: 21,
      sortOrder: 2,
      strategyId: growthStrategy.id,
    },
  });

  await prisma.keyResult.createMany({
    data: [
      { description: "Publish 50 thought leadership pieces", targetValue: "50", currentValue: "50", status: "COMPLETED", sortOrder: 0, objectiveId: objAwareness.id },
      { description: "Reach 100K social followers", targetValue: "100K", currentValue: "45K", status: "AT_RISK", sortOrder: 1, objectiveId: objAwareness.id },
      { description: "Secure 25 media mentions", targetValue: "25", currentValue: "8", status: "AT_RISK", sortOrder: 2, objectiveId: objAwareness.id },
    ],
  });

  const objAcquisition = await prisma.strategicObjective.create({
    data: {
      title: "Customer Acquisition",
      description: "Efficiently acquire new customers through targeted marketing campaigns and reduced CAC.",
      focusArea: "Customer Acquisition",
      priority: "MEDIUM",
      status: "ON_TRACK",
      metricType: "NUMBER",
      startValue: 150,
      targetValue: 500,
      currentValue: 340,
      sortOrder: 3,
      strategyId: growthStrategy.id,
    },
  });

  await prisma.keyResult.createMany({
    data: [
      { description: "Launch 5 marketing campaigns", targetValue: "5", currentValue: "5", status: "COMPLETED", sortOrder: 0, objectiveId: objAcquisition.id },
      { description: "Reduce CAC by 25%", targetValue: "-25%", currentValue: "-18%", status: "IN_PROGRESS", sortOrder: 1, objectiveId: objAcquisition.id },
    ],
  });

  await prisma.strategicObjective.create({
    data: {
      title: "Strategic Partnerships",
      description: "Build a strong partner ecosystem to extend reach and add value to our platform.",
      focusArea: "Partnerships",
      priority: "LOW",
      status: "ON_TRACK",
      metricType: "NUMBER",
      startValue: 5,
      targetValue: 10,
      currentValue: 7,
      sortOrder: 4,
      strategyId: growthStrategy.id,
    },
  });

  // ─── Milestones for Growth Strategy ─────────────────────────────────────────
  console.log("📅 Seeding strategy milestones...");

  await prisma.strategyMilestone.createMany({
    data: [
      { title: "Strategy Launch", dueDate: new Date("2026-01-15"), quarter: "Q1", completed: true, completedAt: new Date("2026-01-15"), sortOrder: 0, strategyId: growthStrategy.id },
      { title: "Mid-Year Review", dueDate: new Date("2026-07-01"), quarter: "Q2", completed: false, sortOrder: 1, strategyId: growthStrategy.id },
      { title: "Product Launch", dueDate: new Date("2026-09-15"), quarter: "Q3", completed: false, sortOrder: 2, strategyId: growthStrategy.id },
      { title: "Annual Review", dueDate: new Date("2026-12-31"), quarter: "Q4", completed: false, sortOrder: 3, strategyId: growthStrategy.id },
    ],
  });

  // ─── Legacy AI Analysis (for completeness) ─────────────────────────────────
  console.log("📋 Seeding legacy AI analysis...");

  await prisma.aIAnalysis.create({
    data: {
      analysisType: "BRAND_ALIGNMENT",
      content: {
        score: 82,
        dimensions: [
          { name: "Visual Consistency", score: 85, status: "good" },
          { name: "Messaging Coherence", score: 78, status: "needs-improvement" },
          { name: "Value Alignment", score: 88, status: "good" },
          { name: "Tone Consistency", score: 76, status: "needs-improvement" },
        ],
        generatedAt: "2024-10-15T10:00:00Z",
      },
      confidence: 0.87,
      assetId: goldenCircle.id,
    },
  });

  // ─── Asset Relations ────────────────────────────────────────────────────────
  console.log("🔗 Seeding asset relations...");

  await prisma.assetRelation.create({
    data: {
      fromAssetId: goldenCircle.id,
      toAssetId: coreValues.id,
      relationType: "USES",
    },
  });

  await prisma.assetRelation.create({
    data: {
      fromAssetId: brandPositioning.id,
      toAssetId: competitiveAdvantage.id,
      relationType: "USES",
    },
  });

  // ─── Goals ──────────────────────────────────────────────────────────────────
  console.log("🎯 Seeding goals...");

  await prisma.goal.create({
    data: {
      title: "Achieve 85% Brand Consistency Score",
      targetValue: 85,
      currentValue: 72,
      unit: "percent",
      deadline: new Date("2025-06-30T23:59:59Z"),
      status: "ON_TRACK",
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.goal.create({
    data: {
      title: "Validate All Foundation Assets",
      targetValue: 3,
      currentValue: 1,
      unit: "assets",
      deadline: new Date("2025-03-31T23:59:59Z"),
      status: "BEHIND",
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // ─── Competitors ────────────────────────────────────────────────────────────
  console.log("🏆 Seeding competitors...");

  await prisma.competitor.create({
    data: {
      name: "Frontify",
      website: "https://www.frontify.com",
      description:
        "Brand management platform focusing on digital asset management and brand guidelines.",
      strengths: [
        "Strong DAM capabilities",
        "Enterprise-grade security",
        "Wide integration ecosystem",
      ],
      weaknesses: [
        "No research or validation tools",
        "No AI-powered analysis",
        "High price point for small teams",
      ],
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.competitor.create({
    data: {
      name: "Bynder",
      website: "https://www.bynder.com",
      description:
        "Enterprise digital asset management with creative workflow automation.",
      strengths: [
        "Excellent DAM features",
        "Creative workflow tools",
        "Global enterprise presence",
      ],
      weaknesses: [
        "Asset-focused rather than strategy-focused",
        "Complex implementation",
        "No brand validation methodology",
      ],
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // ─── Market Insights ────────────────────────────────────────────────────────
  console.log("💡 Seeding market insights...");

  await prisma.marketInsight.create({
    data: {
      title: "AI in Brand Management Growing 34% YoY",
      source: "Gartner Marketing Technology Report 2024",
      type: "TREND",
      summary:
        "AI-powered brand management tools are growing at 34% year-over-year, driven by demand for automated brand consistency monitoring and content scoring.",
      content:
        "The report highlights that 67% of marketing leaders plan to increase spending on AI-powered brand tools in the next 12 months. Key drivers include the need for scalable brand consistency across distributed teams and the growing expectation for real-time content quality measurement.",
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.marketInsight.create({
    data: {
      title: "Brand Consistency Correlates with 23% Revenue Premium",
      source: "McKinsey Brand Health Study 2024",
      type: "INDUSTRY",
      summary:
        "Companies with above-average brand consistency scores command a 23% revenue premium over inconsistent competitors in the same category.",
      content:
        "Analysis of 850 B2B companies found a strong correlation between measured brand consistency and revenue performance. The study defined brand consistency across visual identity, messaging, tone, and customer experience touchpoints.",
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  // ─── Research Projects ──────────────────────────────────────────────────────
  console.log("🔬 Seeding research projects...");

  await prisma.researchProject.create({
    data: {
      name: "Q4 2024 Brand Perception Study",
      type: "SURVEY",
      status: "COMPLETED",
      description:
        "Comprehensive study combining customer interviews, surveys, and AI analysis to measure current brand perception across key segments.",
      findings: {
        nps: 47,
        brandAwareness: "32% unaided recall among target segment",
        topAssociations: ["data-driven", "professional", "innovative"],
        keyInsight:
          "The validation loop is our strongest perceived differentiator — customers who use 2+ research methods have 3x higher satisfaction.",
      },
      participantCount: 42,
      startDate: new Date("2024-10-01T00:00:00Z"),
      endDate: new Date("2024-12-20T00:00:00Z"),
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  await prisma.researchProject.create({
    data: {
      name: "Competitive Positioning Analysis",
      type: "ANALYSIS",
      status: "ACTIVE",
      description:
        "Ongoing analysis of competitor brand positioning, messaging, and market movements to inform our differentiation strategy.",
      participantCount: 0,
      startDate: new Date("2025-01-15T00:00:00Z"),
      workspaceId: workspace.id,
      createdById: owner.id,
    },
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
