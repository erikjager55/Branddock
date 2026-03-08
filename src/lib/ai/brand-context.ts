// =============================================================
// Brand Context Aggregator (R0.8)
//
// Collects brand data from 5 Prisma models into a single context
// block for AI prompts. Uses a 5-minute in-memory cache to avoid
// repeated DB reads within the same session.
//
// Models aggregated:
//  - BrandAsset (all 12 canonical assets with content + framework data)
//  - Persona (primary target audience description)
//  - Product (products overview)
//  - DetectedTrend (competitive landscape summary, activated trends only)
//  - Workspace (brand name, industry)
// =============================================================

import { prisma } from '@/lib/prisma';
import type { BrandContextBlock } from './prompt-templates';

// ─── Cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: BrandContextBlock;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(workspaceId: string): BrandContextBlock | null {
  const entry = cache.get(workspaceId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(workspaceId);
    return null;
  }
  return entry.data;
}

function setCache(workspaceId: string, data: BrandContextBlock): void {
  cache.set(workspaceId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate cached brand context for a workspace.
 * Call this when brand data is updated.
 */
export function invalidateBrandContext(workspaceId: string): void {
  cache.delete(workspaceId);
}

// ─── Framework Data Formatters ─────────────────────────────

interface GoldenCircleData {
  why?: { statement?: string; details?: string };
  how?: { statement?: string; details?: string };
  what?: { statement?: string; details?: string };
}

interface PurposeWheelData {
  impactType?: string;
  mechanism?: string;
  mechanismCategory?: string;
  pressureTest?: string;
}

interface BrandEssenceData {
  essenceStatement?: string;
  essenceNarrative?: string;
  functionalBenefit?: string;
  emotionalBenefit?: string;
  selfExpressiveBenefit?: string;
  discriminator?: string;
  audienceInsight?: string;
  proofPoints?: string[];
}

interface BrandPromiseData {
  promiseStatement?: string;
  promiseOneLiner?: string;
  functionalValue?: string;
  emotionalValue?: string;
  selfExpressiveValue?: string;
  targetAudience?: string;
  coreCustomerNeed?: string;
  differentiator?: string;
  onlynessStatement?: string;
  proofPoints?: string[];
  measurableOutcomes?: string[];
}

interface TransformativeGoalData {
  title?: string;
  description?: string;
  impactDomain?: string;
  timeframe?: string;
  measurableCommitment?: string;
  theoryOfChange?: string;
}

interface TransformativeGoalsData {
  massiveTransformativePurpose?: string;
  mtpNarrative?: string;
  goals?: TransformativeGoalData[];
  authenticityScores?: Record<string, number>;
  stakeholderImpact?: { stakeholder?: string; role?: string; expectedImpact?: string }[];
  brandIntegration?: {
    positioningLink?: string;
    communicationThemes?: string[];
    campaignDirections?: string[];
    internalActivation?: string;
  };
}

/** Format Golden Circle frameworkData into a readable string */
function formatGoldenCircle(data: GoldenCircleData): string {
  const parts: string[] = [];
  if (data.why?.statement) parts.push(`  - WHY: ${data.why.statement}`);
  if (data.how?.statement) parts.push(`  - HOW: ${data.how.statement}`);
  if (data.what?.statement) parts.push(`  - WHAT: ${data.what.statement}`);
  return parts.join('\n');
}

/** Format Purpose Wheel frameworkData into a readable string */
function formatPurposeWheel(data: PurposeWheelData): string {
  const parts: string[] = [];
  if (data.impactType) parts.push(`Impact Type: ${data.impactType}`);
  if (data.mechanismCategory) parts.push(`Mechanism: ${data.mechanismCategory}`);
  if (data.mechanism) parts.push(`How: ${data.mechanism}`);
  if (data.pressureTest) parts.push(`Pressure Test: ${data.pressureTest}`);
  return parts.join('. ');
}

/** Format Transformative Goals frameworkData into a readable string for AI context */
function formatTransformativeGoals(data: TransformativeGoalsData): string {
  const parts: string[] = [];
  if (data.massiveTransformativePurpose) parts.push(`MTP: ${data.massiveTransformativePurpose}`);
  if (data.mtpNarrative) parts.push(data.mtpNarrative);
  if (Array.isArray(data.goals) && data.goals.length > 0) {
    const goalSummaries = data.goals
      .filter((g) => g.title)
      .map((g) => {
        const gParts = [g.title];
        if (g.impactDomain) gParts.push(`[${g.impactDomain}]`);
        if (g.measurableCommitment) gParts.push(`Target: ${g.measurableCommitment}`);
        if (g.timeframe) gParts.push(`by ${g.timeframe}`);
        return gParts.join(' ');
      });
    if (goalSummaries.length > 0) parts.push(`Goals: ${goalSummaries.join('; ')}`);
  }
  if (data.authenticityScores) {
    const vals = Object.values(data.authenticityScores);
    const total = vals.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const avg = Math.round((total / vals.length) * 20);
      parts.push(`Authenticity score: ${avg}%`);
    }
  }
  if (data.brandIntegration?.positioningLink) {
    parts.push(`Positioning: ${data.brandIntegration.positioningLink}`);
  }
  if (data.brandIntegration && Array.isArray(data.brandIntegration.communicationThemes) && data.brandIntegration.communicationThemes.length > 0) {
    parts.push(`Themes: ${data.brandIntegration.communicationThemes.filter(Boolean).join('; ')}`);
  }
  if (data.brandIntegration && Array.isArray(data.brandIntegration.campaignDirections) && data.brandIntegration.campaignDirections.length > 0) {
    parts.push(`Campaign directions: ${data.brandIntegration.campaignDirections.filter(Boolean).join('; ')}`);
  }
  if (data.brandIntegration?.internalActivation) {
    parts.push(`Internal activation: ${data.brandIntegration.internalActivation}`);
  }
  if (Array.isArray(data.stakeholderImpact) && data.stakeholderImpact.length > 0) {
    const stakeholders = data.stakeholderImpact
      .filter((s) => s.stakeholder && (s.role || s.expectedImpact))
      .map((s) => `${s.stakeholder} (${s.role || 'stakeholder'})${s.expectedImpact ? `: ${s.expectedImpact}` : ''}`)
      .join('; ');
    if (stakeholders) parts.push(`Stakeholders: ${stakeholders}`);
  }
  return parts.join('. ');
}

interface BrandArchetypeData {
  primaryArchetype?: string;
  secondaryArchetype?: string;
  blendRatio?: string;
  subArchetype?: string;
  coreDesire?: string;
  coreFear?: string;
  brandGoal?: string;
  strategy?: string;
  giftTalent?: string;
  shadowWeakness?: string;
  brandVoiceDescription?: string;
  voiceAdjectives?: string[];
  languagePatterns?: string;
  weSayNotThat?: { weSay?: string; notThat?: string }[];
  toneVariations?: string;
  blacklistedPhrases?: string[];
  colorDirection?: string;
  typographyDirection?: string;
  imageryStyle?: string;
  visualMotifs?: string;
  archetypeInAction?: string;
  marketingExpression?: string;
  customerExperience?: string;
  contentStrategy?: string;
  storytellingApproach?: string;
  brandExamples?: string[];
  positioningApproach?: string;
  competitiveLandscape?: string;
}

/** Format Brand Archetype frameworkData into a readable string for AI context */
function formatBrandArchetype(data: BrandArchetypeData): string {
  const parts: string[] = [];

  // Archetype identity
  if (data.primaryArchetype) {
    let identity = `Primary Archetype: ${data.primaryArchetype}`;
    if (data.secondaryArchetype) identity += ` / Secondary: ${data.secondaryArchetype}`;
    if (data.blendRatio) identity += ` (${data.blendRatio})`;
    if (data.subArchetype) identity += ` — Sub-archetype: ${data.subArchetype}`;
    parts.push(identity);
  }

  // Core psychology
  if (data.coreDesire) parts.push(`Core Desire: ${data.coreDesire}`);
  if (data.coreFear) parts.push(`Core Fear: ${data.coreFear}`);
  if (data.brandGoal) parts.push(`Brand Goal: ${data.brandGoal}`);
  if (data.strategy) parts.push(`Strategy: ${data.strategy}`);
  if (data.giftTalent) parts.push(`Gift/Talent: ${data.giftTalent}`);
  if (data.shadowWeakness) parts.push(`Shadow/Weakness: ${data.shadowWeakness}`);

  // Voice & messaging
  if (data.brandVoiceDescription) parts.push(`Voice: ${data.brandVoiceDescription}`);
  if (Array.isArray(data.voiceAdjectives) && data.voiceAdjectives.length > 0) {
    parts.push(`Voice adjectives: ${data.voiceAdjectives.filter(Boolean).join(', ')}`);
  }
  if (data.languagePatterns) parts.push(`Language patterns: ${data.languagePatterns}`);
  if (Array.isArray(data.weSayNotThat) && data.weSayNotThat.length > 0) {
    const pairs = data.weSayNotThat
      .filter((p) => p.weSay)
      .map((p) => `"${p.weSay}" (not "${p.notThat ?? '...'}")`)
      .join('; ');
    if (pairs) parts.push(`We say/Not that: ${pairs}`);
  }
  if (data.toneVariations) parts.push(`Tone variations: ${data.toneVariations}`);
  if (Array.isArray(data.blacklistedPhrases) && data.blacklistedPhrases.length > 0) {
    parts.push(`Blacklisted phrases: ${data.blacklistedPhrases.filter(Boolean).join(', ')}`);
  }

  // Visual expression
  if (data.colorDirection) parts.push(`Color direction: ${data.colorDirection}`);
  if (data.typographyDirection) parts.push(`Typography: ${data.typographyDirection}`);
  if (data.imageryStyle) parts.push(`Imagery style: ${data.imageryStyle}`);
  if (data.visualMotifs) parts.push(`Visual motifs: ${data.visualMotifs}`);

  // Archetype in action
  if (data.archetypeInAction) parts.push(`In action: ${data.archetypeInAction}`);
  if (data.marketingExpression) parts.push(`Marketing expression: ${data.marketingExpression}`);
  if (data.customerExperience) parts.push(`Customer experience: ${data.customerExperience}`);
  if (data.contentStrategy) parts.push(`Content strategy: ${data.contentStrategy}`);
  if (data.storytellingApproach) parts.push(`Storytelling: ${data.storytellingApproach}`);

  // Reference & positioning
  if (Array.isArray(data.brandExamples) && data.brandExamples.length > 0) {
    parts.push(`Reference brands: ${data.brandExamples.filter(Boolean).join(', ')}`);
  }
  if (data.positioningApproach) parts.push(`Positioning approach: ${data.positioningApproach}`);
  if (data.competitiveLandscape) parts.push(`Competitive landscape: ${data.competitiveLandscape}`);

  return parts.join('. ');
}

/** Extract a text summary from content JSON (typically has a "text" or "body" field) */
function extractContentText(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    // Common content shapes: { text: "..." }, { body: "..." }, { summary: "..." }
    if (typeof obj.text === 'string' && obj.text) return obj.text;
    if (typeof obj.body === 'string' && obj.body) return obj.body;
    if (typeof obj.summary === 'string' && obj.summary) return obj.summary;
  }
  return null;
}

/** Extract Core Values from frameworkData (BRANDHOUSE_VALUES) */
function extractCoreValues(data: unknown): string[] | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  // Shape: { values: [{ name: "...", description: "..." }] } or { values: ["..."] }
  if (Array.isArray(obj.values) && obj.values.length > 0) {
    return obj.values.map((v: unknown) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        const val = v as Record<string, unknown>;
        return typeof val.name === 'string' ? val.name : String(v);
      }
      return String(v);
    });
  }
  return null;
}

// ─── Aggregator ────────────────────────────────────────────

/**
 * Fetch and aggregate brand context from the database.
 * Returns a BrandContextBlock suitable for prompt injection.
 *
 * Cached for 5 minutes per workspace.
 */
export async function getBrandContext(workspaceId: string): Promise<BrandContextBlock> {
  // Check cache first
  const cached = getCached(workspaceId);
  if (cached) return cached;

  // Fetch all sources in parallel
  const [workspace, brandAssets, personas, products, activatedTrends] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    }),

    prisma.brandAsset.findMany({
      where: { workspaceId },
      select: {
        name: true,
        slug: true,
        category: true,
        description: true,
        content: true,
        frameworkType: true,
        frameworkData: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),

    prisma.persona.findMany({
      where: { workspaceId },
      select: { name: true, occupation: true, tagline: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    prisma.product.findMany({
      where: { workspaceId },
      select: { name: true, category: true, description: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    prisma.detectedTrend.findMany({
      where: { workspaceId, isActivated: true },
      select: { title: true, category: true, impactLevel: true },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
    }),
  ]);

  // Build asset lookup by slug for reliable mapping
  const assetBySlug = new Map<string, typeof brandAssets[0]>();
  for (const asset of brandAssets) {
    if (asset.slug) assetBySlug.set(asset.slug, asset);
  }

  // Build context block
  const ctx: BrandContextBlock = {
    brandName: workspace?.name,
  };

  // ─── Map brand assets by slug to context fields ──────────

  // Purpose Statement (PURPOSE_WHEEL)
  const purpose = assetBySlug.get('purpose-statement');
  if (purpose) {
    const contentText = extractContentText(purpose.content);
    const fwData = purpose.frameworkData as PurposeWheelData | null;
    const parts: string[] = [];
    if (contentText) parts.push(contentText);
    if (fwData) {
      const formatted = formatPurposeWheel(fwData);
      if (formatted) parts.push(formatted);
    }
    if (parts.length) ctx.brandPurpose = parts.join('. ');
  }

  // Golden Circle (WHY/HOW/WHAT)
  const goldenCircle = assetBySlug.get('golden-circle');
  if (goldenCircle?.frameworkData) {
    const formatted = formatGoldenCircle(goldenCircle.frameworkData as GoldenCircleData);
    if (formatted) ctx.goldenCircle = formatted;
  }

  // Brand Essence (extended frameworkData)
  const essence = assetBySlug.get('brand-essence');
  if (essence) {
    const fwData = essence.frameworkData as BrandEssenceData | null;
    if (fwData?.essenceStatement) {
      const parts: string[] = [];
      parts.push(`Essence: ${fwData.essenceStatement}`);
      if (fwData.essenceNarrative) parts.push(fwData.essenceNarrative);
      if (fwData.functionalBenefit) parts.push(`Functional benefit: ${fwData.functionalBenefit}`);
      if (fwData.emotionalBenefit) parts.push(`Emotional benefit: ${fwData.emotionalBenefit}`);
      if (fwData.selfExpressiveBenefit) parts.push(`Self-expressive benefit: ${fwData.selfExpressiveBenefit}`);
      if (fwData.discriminator) parts.push(`Discriminator: ${fwData.discriminator}`);
      if (fwData.audienceInsight) parts.push(`Audience insight: ${fwData.audienceInsight}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Proof points: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
      }
      ctx.brandEssence = parts.join('. ');
    } else {
      ctx.brandEssence = extractContentText(essence.content) || essence.description || undefined;
    }
  }

  // Brand Promise (extended frameworkData)
  const promise = assetBySlug.get('brand-promise');
  if (promise) {
    const fwData = promise.frameworkData as BrandPromiseData | null;
    if (fwData?.promiseStatement) {
      const parts: string[] = [];
      if (fwData.promiseOneLiner) parts.push(`Promise: ${fwData.promiseOneLiner}`);
      else parts.push(`Promise: ${fwData.promiseStatement}`);
      if (fwData.promiseOneLiner && fwData.promiseStatement) parts.push(fwData.promiseStatement);
      if (fwData.functionalValue) parts.push(`Functional value: ${fwData.functionalValue}`);
      if (fwData.emotionalValue) parts.push(`Emotional value: ${fwData.emotionalValue}`);
      if (fwData.selfExpressiveValue) parts.push(`Self-expressive value: ${fwData.selfExpressiveValue}`);
      if (fwData.targetAudience) parts.push(`Target audience: ${fwData.targetAudience}`);
      if (fwData.coreCustomerNeed) parts.push(`Core customer need: ${fwData.coreCustomerNeed}`);
      if (fwData.differentiator) parts.push(`Differentiator: ${fwData.differentiator}`);
      if (fwData.onlynessStatement) parts.push(`Onlyness: ${fwData.onlynessStatement}`);
      if (Array.isArray(fwData.proofPoints) && fwData.proofPoints.length > 0) {
        parts.push(`Proof points: ${fwData.proofPoints.filter(Boolean).join('; ')}`);
      }
      if (Array.isArray(fwData.measurableOutcomes) && fwData.measurableOutcomes.length > 0) {
        parts.push(`Measurable outcomes: ${fwData.measurableOutcomes.filter(Boolean).join('; ')}`);
      }
      ctx.brandPromise = parts.join('. ');
    } else {
      ctx.brandPromise = extractContentText(promise.content) || promise.description || undefined;
    }
  }

  // Mission Statement
  const mission = assetBySlug.get('mission-statement');
  if (mission) {
    ctx.brandMission = extractContentText(mission.content) || mission.description || undefined;
  }

  // Vision Statement
  const vision = assetBySlug.get('vision-statement');
  if (vision) {
    ctx.brandVision = extractContentText(vision.content) || vision.description || undefined;
  }

  // Brand Archetype (rich formatting from frameworkData)
  const archetype = assetBySlug.get('brand-archetype');
  if (archetype) {
    const fwData = archetype.frameworkData as BrandArchetypeData | null;
    if (fwData?.primaryArchetype) {
      const formatted = formatBrandArchetype(fwData);
      if (formatted) ctx.brandArchetype = formatted;
    } else {
      ctx.brandArchetype = extractContentText(archetype.content) || archetype.description || undefined;
    }
  }

  // Brand Personality
  const personality = assetBySlug.get('brand-personality');
  if (personality) {
    ctx.brandPersonality = extractContentText(personality.content) || personality.description || undefined;
  }

  // Brand Story
  const story = assetBySlug.get('brand-story');
  if (story) {
    ctx.brandStory = extractContentText(story.content) || story.description || undefined;
  }

  // Core Values (BRANDHOUSE_VALUES)
  const values = assetBySlug.get('core-values');
  if (values) {
    const extracted = extractCoreValues(values.frameworkData);
    if (extracted?.length) {
      ctx.brandValues = extracted;
    } else {
      const contentText = extractContentText(values.content);
      if (contentText) ctx.brandValues = [contentText];
    }
  }

  // Transformative Goals (rich formatting from frameworkData)
  const goals = assetBySlug.get('transformative-goals');
  if (goals) {
    const fwData = goals.frameworkData as TransformativeGoalsData | null;
    if (fwData?.massiveTransformativePurpose) {
      const formatted = formatTransformativeGoals(fwData);
      if (formatted) ctx.transformativeGoals = formatted;
    } else {
      ctx.transformativeGoals = extractContentText(goals.content) || goals.description || undefined;
    }
  }

  // Social Relevancy (ESG)
  const social = assetBySlug.get('social-relevancy');
  if (social) {
    ctx.socialRelevancy = extractContentText(social.content) || social.description || undefined;
  }

  // Target audience from personas
  if (personas.length > 0) {
    const descriptions = personas.map((p) => {
      const parts = [p.name];
      if (p.occupation) parts.push(`(${p.occupation})`);
      return parts.join(' ');
    });
    ctx.targetAudience = descriptions.join('; ');
  }

  // Products overview
  if (products.length > 0) {
    const summaries = products.map((p) => {
      const parts = [p.name];
      if (p.category) parts.push(`[${p.category}]`);
      return parts.join(' ');
    });
    ctx.productsOverview = summaries.join(', ');
  }

  // Competitive landscape from activated trends
  if (activatedTrends.length > 0) {
    const highImpact = activatedTrends.filter((t) => t.impactLevel === 'HIGH');
    const relevant = highImpact.length > 0 ? highImpact : activatedTrends.slice(0, 3);
    ctx.competitiveLandscape = relevant.map((t) => `${t.title} (${t.category})`).join('; ');
  }

  // Cache and return
  setCache(workspaceId, ctx);
  return ctx;
}
