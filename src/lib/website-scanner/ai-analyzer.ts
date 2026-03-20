// =============================================================
// AI Analyzer — 4 parallel Claude Sonnet calls for strategic analysis
// =============================================================

import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import {
  BRAND_FOUNDATION_A_SYSTEM_PROMPT,
  BRAND_FOUNDATION_B_SYSTEM_PROMPT,
  AUDIENCE_PRODUCTS_SYSTEM_PROMPT,
  STRATEGY_COMPETITION_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from '@/lib/ai/prompts/website-scanner';
import type { WebsiteExtraction, ScanProgress } from './types';

/** Matches AI prompt output: keys are purposeWheel/goldenCircle/etc., inner shape is { confidence, frameworkData } */
export interface BrandFoundationAResult {
  purposeWheel: { frameworkData: Record<string, unknown>; confidence: number } | null;
  goldenCircle: { frameworkData: Record<string, unknown>; confidence: number } | null;
  brandEssence: { frameworkData: Record<string, unknown>; confidence: number } | null;
  brandPromise: { frameworkData: Record<string, unknown>; confidence: number } | null;
  missionVision: { frameworkData: Record<string, unknown>; confidence: number } | null;
}

/** Matches AI prompt output: keys are brandArchetype/.../brandHouseValues/socialRelevancy/transformativeGoals */
export interface BrandFoundationBResult {
  brandArchetype: { frameworkData: Record<string, unknown>; confidence: number } | null;
  brandPersonality: { frameworkData: Record<string, unknown>; confidence: number } | null;
  brandStory: { frameworkData: Record<string, unknown>; confidence: number } | null;
  brandHouseValues: { frameworkData: Record<string, unknown>; confidence: number } | null;
  socialRelevancy: { frameworkData: Record<string, unknown>; confidence: number } | null;
  transformativeGoals: { frameworkData: Record<string, unknown>; confidence: number } | null;
}

export interface AudienceProductsResult {
  personas: Array<{
    name: string;
    fields: Record<string, unknown>;
    confidence: number;
  }>;
  products: Array<{
    name: string;
    fields: Record<string, unknown>;
    images: Array<{ url: string; category: string }>;
    confidence: number;
  }>;
}

export interface StrategyCompetitionResult {
  competitors: Array<{
    name: string;
    fields: Record<string, unknown>;
    confidence: number;
  }>;
  strategyHints: {
    objectives: string[];
    focusAreas: string[];
  };
  trendSignals: Array<{
    title: string;
    description: string;
    category: string;
  }>;
}

export interface AnalysisResults {
  brandFoundationA: BrandFoundationAResult | null;
  brandFoundationB: BrandFoundationBResult | null;
  audienceProducts: AudienceProductsResult | null;
  strategyCompetition: StrategyCompetitionResult | null;
}

const CLAUDE_OPTIONS = {
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.3,
  maxTokens: 16000,
  timeoutMs: 120_000,
};

/**
 * Run 4 parallel Claude analysis calls.
 * Each call analyzes a different knowledge area.
 * If one call fails, the others continue.
 */
export async function analyzeWebsiteData(
  extraction: WebsiteExtraction,
  progress: ScanProgress,
): Promise<AnalysisResults> {
  const companyName = extraction.companyProfile?.name || 'the company';
  const userPrompt = buildAnalysisUserPrompt(extraction, companyName);

  const results: AnalysisResults = {
    brandFoundationA: null,
    brandFoundationB: null,
    audienceProducts: null,
    strategyCompetition: null,
  };

  // Run all 4 analysis calls in parallel
  const [foundationA, foundationB, audienceProducts, strategyCompetition] = await Promise.allSettled([
    // Call 1: Brand Foundation A
    (async () => {
      progress.currentCategory = 'Brand Foundation (Part A)';
      const result = await createClaudeStructuredCompletion<BrandFoundationAResult>(
        BRAND_FOUNDATION_A_SYSTEM_PROMPT,
        userPrompt,
        CLAUDE_OPTIONS,
      );
      progress.categoriesDone++;
      return result;
    })(),
    // Call 2: Brand Foundation B
    (async () => {
      const result = await createClaudeStructuredCompletion<BrandFoundationBResult>(
        BRAND_FOUNDATION_B_SYSTEM_PROMPT,
        userPrompt,
        CLAUDE_OPTIONS,
      );
      progress.categoriesDone++;
      return result;
    })(),
    // Call 3: Audience & Products
    (async () => {
      const result = await createClaudeStructuredCompletion<AudienceProductsResult>(
        AUDIENCE_PRODUCTS_SYSTEM_PROMPT,
        userPrompt,
        CLAUDE_OPTIONS,
      );
      progress.categoriesDone++;
      return result;
    })(),
    // Call 4: Strategy & Competition
    (async () => {
      const result = await createClaudeStructuredCompletion<StrategyCompetitionResult>(
        STRATEGY_COMPETITION_SYSTEM_PROMPT,
        userPrompt,
        CLAUDE_OPTIONS,
      );
      progress.categoriesDone++;
      return result;
    })(),
  ]);

  if (foundationA.status === 'fulfilled') {
    results.brandFoundationA = foundationA.value;
  } else {
    progress.errors.push(`Brand Foundation A analysis failed: ${foundationA.reason?.message ?? 'Unknown error'}`);
  }

  if (foundationB.status === 'fulfilled') {
    results.brandFoundationB = foundationB.value;
  } else {
    progress.errors.push(`Brand Foundation B analysis failed: ${foundationB.reason?.message ?? 'Unknown error'}`);
  }

  if (audienceProducts.status === 'fulfilled') {
    results.audienceProducts = audienceProducts.value;
  } else {
    progress.errors.push(`Audience & Products analysis failed: ${audienceProducts.reason?.message ?? 'Unknown error'}`);
  }

  if (strategyCompetition.status === 'fulfilled') {
    results.strategyCompetition = strategyCompetition.value;
  } else {
    progress.errors.push(`Strategy & Competition analysis failed: ${strategyCompetition.reason?.message ?? 'Unknown error'}`);
  }

  progress.currentCategory = null;
  return results;
}
