// =============================================================
// Data Mapper — Maps AI analysis results to Prisma model shapes
// =============================================================

import type { MappedResults, MappedBrandAsset, MappedPersona, MappedProduct, MappedCompetitor } from './types';
import type { AnalysisResults } from './ai-analyzer';

// Prisma-safe field whitelists — only these fields are passed to create()
const PERSONA_FIELDS = new Set([
  'age', 'gender', 'location', 'occupation', 'education', 'income', 'familyStatus',
  'personalityType', 'coreValues', 'interests', 'goals', 'motivations',
  'frustrations', 'behaviors', 'strategicImplications', 'tagline',
  'preferredChannels', 'techStack', 'quote', 'bio', 'buyingTriggers', 'decisionCriteria',
]);

// AI prompt uses different names than the Prisma model
const PERSONA_FIELD_RENAMES: Record<string, string> = {
  personality: 'personalityType',
  values: 'coreValues',
};

const PRODUCT_FIELDS = new Set([
  'description', 'category', 'pricingModel', 'pricingDetails',
  'features', 'benefits', 'useCases', 'categoryIcon',
]);

const COMPETITOR_FIELDS = new Set([
  'description', 'tagline', 'websiteUrl', 'foundingYear', 'headquarters', 'employeeRange',
  'logoUrl', 'valueProposition', 'targetAudience', 'differentiators', 'mainOfferings',
  'pricingModel', 'pricingDetails', 'toneOfVoice', 'messagingThemes', 'visualStyleNotes',
  'strengths', 'weaknesses', 'competitiveScore', 'tier',
]);

const COMPETITOR_FIELD_RENAMES: Record<string, string> = {
  visualStyle: 'visualStyleNotes',
};

const VALID_COMPETITOR_TIERS = new Set(['DIRECT', 'INDIRECT', 'ASPIRATIONAL']);

/**
 * Pick only whitelisted fields from an AI-generated record.
 * Optionally renames keys to match the Prisma model.
 */
function sanitizeFields(
  raw: Record<string, unknown>,
  allowed: Set<string>,
  renames?: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    const mappedKey = renames?.[key] ?? key;
    if (allowed.has(mappedKey)) {
      result[mappedKey] = value;
    }
  }
  return result;
}

/**
 * Map AI analysis results to Prisma-ready data structures.
 * Deterministic transformation — no AI calls.
 */
export function mapResultsToModels(
  analysis: AnalysisResults,
  websiteUrl: string,
  industry?: string,
): MappedResults {
  const brandAssets: MappedBrandAsset[] = [];
  const personas: MappedPersona[] = [];
  const products: MappedProduct[] = [];
  const competitors: MappedCompetitor[] = [];
  const strategyHints = { objectives: [] as string[], focusAreas: [] as string[] };
  const trendSignals: Array<{ title: string; description: string; category: string }> = [];

  // Map Brand Foundation A
  if (analysis.brandFoundationA) {
    const a = analysis.brandFoundationA;
    if (a.purposeWheel) {
      brandAssets.push({
        slug: 'purpose-statement',
        frameworkData: a.purposeWheel.frameworkData,
        confidence: a.purposeWheel.confidence,
      });
    }
    if (a.goldenCircle) {
      brandAssets.push({
        slug: 'golden-circle',
        frameworkData: a.goldenCircle.frameworkData,
        confidence: a.goldenCircle.confidence,
      });
    }
    if (a.brandEssence) {
      brandAssets.push({
        slug: 'brand-essence',
        frameworkData: a.brandEssence.frameworkData,
        confidence: a.brandEssence.confidence,
      });
    }
    if (a.brandPromise) {
      brandAssets.push({
        slug: 'brand-promise',
        frameworkData: a.brandPromise.frameworkData,
        confidence: a.brandPromise.confidence,
      });
    }
    if (a.missionVision) {
      brandAssets.push({
        slug: 'mission-statement',
        frameworkData: a.missionVision.frameworkData,
        confidence: a.missionVision.confidence,
      });
    }
  }

  // Map Brand Foundation B
  if (analysis.brandFoundationB) {
    const b = analysis.brandFoundationB;
    if (b.brandArchetype) {
      brandAssets.push({
        slug: 'brand-archetype',
        frameworkData: b.brandArchetype.frameworkData,
        confidence: b.brandArchetype.confidence,
      });
    }
    if (b.brandPersonality) {
      brandAssets.push({
        slug: 'brand-personality',
        frameworkData: b.brandPersonality.frameworkData,
        confidence: b.brandPersonality.confidence,
      });
    }
    if (b.brandStory) {
      brandAssets.push({
        slug: 'brand-story',
        frameworkData: b.brandStory.frameworkData,
        confidence: b.brandStory.confidence,
      });
    }
    if (b.brandHouseValues) {
      brandAssets.push({
        slug: 'core-values',
        frameworkData: b.brandHouseValues.frameworkData,
        confidence: b.brandHouseValues.confidence,
      });
    }
    if (b.socialRelevancy) {
      brandAssets.push({
        slug: 'social-relevancy',
        frameworkData: b.socialRelevancy.frameworkData,
        confidence: b.socialRelevancy.confidence,
      });
    }
    if (b.transformativeGoals) {
      brandAssets.push({
        slug: 'transformative-goals',
        frameworkData: b.transformativeGoals.frameworkData,
        confidence: b.transformativeGoals.confidence,
      });
    }
  }

  // Map Audience & Products
  if (analysis.audienceProducts) {
    for (const p of analysis.audienceProducts.personas ?? []) {
      personas.push({
        name: p.name,
        fields: sanitizeFields(p.fields, PERSONA_FIELDS, PERSONA_FIELD_RENAMES),
        confidence: p.confidence,
      });
    }
    for (const pr of analysis.audienceProducts.products ?? []) {
      products.push({
        name: pr.name,
        fields: sanitizeFields(pr.fields, PRODUCT_FIELDS),
        images: pr.images ?? [],
        confidence: pr.confidence,
      });
    }
  }

  // Map Strategy & Competition
  if (analysis.strategyCompetition) {
    for (const c of analysis.strategyCompetition.competitors ?? []) {
      const sanitized = sanitizeFields(c.fields, COMPETITOR_FIELDS, COMPETITOR_FIELD_RENAMES);
      // Validate tier enum value
      if (sanitized.tier && !VALID_COMPETITOR_TIERS.has(sanitized.tier as string)) {
        delete sanitized.tier;
      }
      competitors.push({
        name: c.name,
        fields: sanitized,
        confidence: c.confidence,
      });
    }
    strategyHints.objectives = analysis.strategyCompetition.strategyHints?.objectives ?? [];
    strategyHints.focusAreas = analysis.strategyCompetition.strategyHints?.focusAreas ?? [];
    trendSignals.push(...(analysis.strategyCompetition.trendSignals ?? []));
  }

  return {
    brandAssets,
    personas,
    products,
    competitors,
    strategyHints,
    trendSignals,
    workspaceUpdates: {
      websiteUrl,
      industry: industry ?? analysis.brandFoundationA?.purposeWheel?.frameworkData?.industry as string | undefined,
    },
  };
}

/**
 * Compute confidence thresholds for display.
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}
