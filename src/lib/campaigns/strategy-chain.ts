// =============================================================================
// Campaign Strategy Blueprint — Multi-Step Prompt Chain Orchestrator
// Runs 7 AI calls (1a+1b+1c parallel full variants with deep thinking,
// 2 persona validation, 3 synthesis with deep thinking,
// 4 channel plan, 5 asset plan) to produce a CampaignBlueprint
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { buildSelectedPersonasContext } from '@/lib/ai/persona-context';
import { createClaudeStructuredCompletion, createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { calculateBlueprintConfidence } from './confidence-calculator';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { getGoalTypeGuidance } from '@/features/campaigns/lib/goal-types';
import {
  buildFullVariantAPrompt,
  buildFullVariantBPrompt,
  buildFullVariantCPrompt,
  buildPersonaValidatorPrompt,
  buildStrategySynthesizerPrompt,
  buildChannelPlannerPrompt,
  buildAssetPlannerPrompt,
} from '@/lib/ai/prompts/campaign-strategy';
import { buildArenaQueries } from '@/lib/arena/arena-queries';
import { fetchArenaContext } from '@/lib/arena/arena-client';
import { buildExaQueries } from '@/lib/exa/exa-queries';
import { fetchExaContext } from '@/lib/exa/exa-client';
import { buildScholarQueries } from '@/lib/semantic-scholar/scholar-queries';
import { fetchScholarContext } from '@/lib/semantic-scholar/scholar-client';
import { getBctContext, getGoalBctMapping } from '@/lib/bct/goal-bct-mapping';
import { getTopAnglesForGoal } from '@/lib/campaigns/creative-angles';
import { getLlmProfile } from '@/lib/campaigns/llm-creative-profiles';
import type { CreativeAngleDefinition } from '@/lib/campaigns/creative-angles';
import type { AiProvider } from '@/lib/ai/feature-models';
import {
  strategyLayerSchema,
  architectureLayerSchema,
  fullVariantSchema,
  channelPlanLayerSchema,
  assetPlanLayerSchema,
  personaValidationArraySchema,
  channelPlanResponseSchema,
  assetPlanResponseSchema,
} from './strategy-blueprint.types';
import type {
  CampaignBlueprint,
  CampaignBriefing,
  StrategyLayer,
  ArchitectureLayer,
  FullVariant,
  ChannelPlanLayer,
  AssetPlanLayer,
  PersonaValidationResult,
  StrategicIntent,
  TouchpointPersonaRelevance,
  PersonaRelevance,
  VariantPhaseResult,
  SynthesisPhaseResult,
  JourneyPhaseResult,
} from './strategy-blueprint.types';
import type { PipelineEvent } from '@/features/campaigns/types/campaign-wizard.types';

// ─── Constants ──────────────────────────────────────────────

const CLAUDE_OPUS = 'claude-opus-4-6';
const GPT_54 = 'gpt-5.4';
const GEMINI_31_PRO = 'gemini-3.1-pro-preview';
const GEMINI_FLASH = 'gemini-2.5-flash';

/** Deep thinking configuration for strategy variant generation */
const THINKING_CONFIG = {
  anthropic: { budgetTokens: 16_000 },
  openai: { reasoningEffort: 'high' as const },
  google: { thinkingBudget: 16_000 },
  /** Persona validation uses moderate thinking budget */
  anthropicValidation: { budgetTokens: 10_000 },
  /** Synthesis uses the most thinking budget (Effie-level elevation) */
  anthropicSynthesis: { budgetTokens: 20_000 },
};

/** Wraps an AI call with step-specific error context for better debugging */
async function withStepContext<T>(stepLabel: string, timeoutSec: number, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // Detect abort/timeout errors from Anthropic SDK or AbortSignal
    if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')) {
      throw new Error(`${stepLabel} timed out after ${timeoutSec}s — the AI model took too long to respond. Please try again.`);
    }
    throw new Error(`${stepLabel} failed: ${msg}`);
  }
}

// ─── Types ──────────────────────────────────────────────────

export type ProgressCallback = (event: PipelineEvent) => void;

interface WizardContext {
  campaignName: string;
  campaignDescription?: string;
  campaignGoalType?: string;
  briefing?: CampaignBriefing;
}

interface GenerateOptions {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  /** When provided, the pipeline runs without a DB campaign lookup */
  wizardContext?: WizardContext;
}

interface SynthesizedResult {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
}

// ─── Context Builders ───────────────────────────────────────

async function buildProductContext(workspaceId: string, productIds?: string[]): Promise<string> {
  const where: Record<string, unknown> = { workspaceId };
  if (productIds && productIds.length > 0) {
    where.id = { in: productIds };
  }
  const products = await prisma.product.findMany({
    where,
    select: { name: true, description: true, category: true, pricingDetails: true, features: true },
    take: 10,
  });
  if (products.length === 0) return '';
  return products.map(p => {
    const features = (p.features as string[] | null)?.join(', ') || '';
    return `- **${p.name}** (${p.category}): ${p.description || 'No description'}${features ? `\n  Features: ${features}` : ''}${p.pricingDetails ? `\n  Pricing: ${p.pricingDetails}` : ''}`;
  }).join('\n');
}

async function buildCompetitorContext(workspaceId: string, competitorIds?: string[]): Promise<string> {
  const where: Record<string, unknown> = { workspaceId };
  if (competitorIds && competitorIds.length > 0) {
    where.id = { in: competitorIds };
  }
  const competitors = await prisma.competitor.findMany({
    where,
    select: { name: true, description: true, tier: true, valueProposition: true, differentiators: true },
    take: 10,
  });
  if (competitors.length === 0) return '';
  return competitors.map(c => {
    const diffs = (c.differentiators as string[] | null)?.join(', ') || '';
    return `- **${c.name}** (${c.tier}): ${c.description || c.valueProposition || 'No description'}${diffs ? `\n  Differentiators: ${diffs}` : ''}`;
  }).join('\n');
}

async function buildTrendContext(workspaceId: string, trendIds?: string[]): Promise<string> {
  const where: Record<string, unknown> = { workspaceId };
  if (trendIds && trendIds.length > 0) {
    where.id = { in: trendIds };
  } else {
    // When no specific trends selected, load nothing (user must explicitly select trends)
    return '';
  }
  const trends = await prisma.detectedTrend.findMany({
    where,
    select: { title: true, description: true, category: true, relevanceScore: true },
    take: 10,
  });
  if (trends.length === 0) return '';
  return trends.map(t =>
    `- **${t.title}** (${t.category}, relevance: ${t.relevanceScore}%): ${t.description || 'No description'}`
  ).join('\n');
}

async function buildStyleguideContext(workspaceId: string): Promise<string> {
  const sg = await prisma.brandStyleguide.findFirst({
    where: { workspaceId },
    select: { writingGuidelines: true, contentGuidelines: true, examplePhrases: true },
  });
  if (!sg) return '';
  const parts: string[] = [];
  if (sg.contentGuidelines?.length) parts.push(`Content guidelines: ${sg.contentGuidelines.join('; ')}`);
  if (sg.writingGuidelines?.length) parts.push(`Writing guidelines: ${sg.writingGuidelines.join('; ')}`);
  if (sg.examplePhrases) parts.push(`Example phrases: ${JSON.stringify(sg.examplePhrases)}`);
  return parts.join('\n');
}

async function buildPersonaProfiles(personaIds: string[], workspaceId: string): Promise<Array<{ id: string; name: string; profile: string }>> {
  if (personaIds.length === 0) return [];
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds }, workspaceId },
    select: {
      id: true, name: true, age: true, gender: true, occupation: true, location: true,
      goals: true, frustrations: true, motivations: true, personalityType: true, coreValues: true,
      preferredChannels: true, buyingTriggers: true, decisionCriteria: true,
      tagline: true, bio: true,
    },
  });
  return personas.map(p => ({
    id: p.id,
    name: p.name,
    profile: [
      p.tagline ? `"${p.tagline}"` : '',
      `${p.age ? `Age ${p.age}, ` : ''}${p.gender || ''}${p.occupation ? `, ${p.occupation}` : ''}${p.location ? ` in ${p.location}` : ''}`,
      p.bio || '',
      p.goals.length > 0 ? `Goals: ${p.goals.join('; ')}` : '',
      p.frustrations.length > 0 ? `Frustrations: ${p.frustrations.join('; ')}` : '',
      p.motivations.length > 0 ? `Motivations: ${p.motivations.join('; ')}` : '',
      p.personalityType ? `Personality: ${p.personalityType}${p.coreValues?.length ? `, values: ${p.coreValues.join(', ')}` : ''}` : '',
      p.preferredChannels ? `Channels: ${(p.preferredChannels as string[]).join(', ')}` : '',
      p.buyingTriggers ? `Buying triggers: ${(p.buyingTriggers as string[]).join('; ')}` : '',
      p.decisionCriteria ? `Decision criteria: ${(p.decisionCriteria as string[]).join('; ')}` : '',
    ].filter(Boolean).join('\n'),
  }));
}

async function buildPersonaChannelPrefs(personaIds: string[], workspaceId: string): Promise<string> {
  if (personaIds.length === 0) return '';
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds }, workspaceId },
    select: { name: true, preferredChannels: true, techStack: true },
  });
  return personas.map(p => {
    const channels = (p.preferredChannels as string[] | null) || [];
    const tech = (p.techStack as string[] | null) || [];
    return `- **${p.name}**: Channels: ${channels.join(', ') || 'unknown'}, Tech: ${tech.join(', ') || 'unknown'}`;
  }).join('\n');
}

// ─── Counting helpers ───────────────────────────────────────

async function countNonEmptyAssets(workspaceId: string): Promise<number> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId },
    select: { content: true, frameworkData: true },
  });
  return assets.filter(a => (a.content && String(a.content).trim().length > 0) || a.frameworkData).length;
}

async function countCompetitorsAndTrends(workspaceId: string): Promise<number> {
  const [competitors, trends] = await Promise.all([
    prisma.competitor.count({ where: { workspaceId } }),
    prisma.detectedTrend.count({ where: { workspaceId, isActivated: true } }),
  ]);
  return competitors + trends;
}

// ─── Creative Angle Selection ────────────────────────────────

interface CreativeAngleAssignment {
  angle: CreativeAngleDefinition;
  provider: AiProvider;
  label: string;
}

/**
 * Format a single creative angle as a prompt section for injection into a variant prompt.
 */
function formatAngleForPrompt(angle: CreativeAngleDefinition): string {
  const parts = [
    `**${angle.name}** (${angle.insightFamily})`,
    `Starting insight type: ${angle.startingInsightType}`,
    angle.description,
    `Output signature: ${angle.outputSignature}`,
    `Famous examples: ${angle.famousExamples.join('; ')}`,
    `Risk level: ${angle.riskLevel} | Effie/Cannes potential: ${angle.effieCannesPotential}`,
  ];
  if (angle.subMethodologies?.length) {
    parts.push(`Sub-methodologies: ${angle.subMethodologies.join(', ')}`);
  }
  return parts.join('\n');
}

/**
 * Select the 3 best creative angles for the campaign goal and assign each to a provider.
 * Each variant gets a DIFFERENT angle to force creative divergence.
 * Provider matching: prioritize angles that are in the provider's bestAngleIds.
 */
function selectCreativeAngles(
  goalType: string,
  providerA: AiProvider,
  providerB: AiProvider,
  providerC: AiProvider,
): CreativeAngleAssignment[] {
  const topAngles = getTopAnglesForGoal(goalType, 8);
  if (topAngles.length === 0) return [];

  const providers = [
    { provider: providerA, label: 'A' },
    { provider: providerB, label: 'B' },
    { provider: providerC, label: 'C' },
  ];

  const usedAngleIds = new Set<string>();
  const assignments: CreativeAngleAssignment[] = [];

  // For each provider, find the best-fitting angle that hasn't been used yet
  for (const { provider, label } of providers) {
    const profile = getLlmProfile(provider);
    const bestIds = profile?.bestAngleIds ?? [];

    // Try to find an angle from the provider's best list first
    let selectedAngle = topAngles.find(a => bestIds.includes(a.id) && !usedAngleIds.has(a.id));
    // Fallback: take the highest-ranked unused angle
    if (!selectedAngle) {
      selectedAngle = topAngles.find(a => !usedAngleIds.has(a.id));
    }
    // Last resort: just take the first angle (all used)
    if (!selectedAngle) {
      selectedAngle = topAngles[0];
    }

    usedAngleIds.add(selectedAngle.id);
    assignments.push({ angle: selectedAngle, provider, label });
  }

  return assignments;
}

// ─── Zod validation helper ──────────────────────────────────

/**
 * Validate AI output against a Zod schema. If validation fails, we log a warning
 * but return the raw data as-is (never throws). Rationale: AI-generated JSON may
 * have minor schema deviations (extra fields, slightly different enum values) that
 * don't break the UI. Crashing the entire 7-step pipeline for a cosmetic schema
 * mismatch is worse than proceeding with best-effort data.
 */
function validateOrWarn<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { message: string } } }, data: unknown, stepName: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[strategy-chain] Zod validation warning for ${stepName} — proceeding with raw data:`, result.error);
    return data as T;
  }
  return result.data as T;
}

/**
 * Normalize persona validation results to fix common AI output issues:
 * - Clamp overallScore to 1-10 (non-number → 5)
 * - Ensure personaId and personaName are non-empty strings
 * - Normalize preferredVariant to uppercase "A", "B", or "C"
 * - Filter falsy values from resonates/concerns/suggestions arrays
 * - Ensure feedback is a non-empty string
 */
function normalizePersonaValidation(results: PersonaValidationResult[]): PersonaValidationResult[] {
  return results.map((p) => ({
    ...p,
    personaId: (typeof p.personaId === 'string' && p.personaId.trim().length > 0)
      ? p.personaId
      : `unknown-${Math.random().toString(36).slice(2, 8)}`,
    personaName: (typeof p.personaName === 'string' && p.personaName.trim().length > 0)
      ? p.personaName
      : 'Unknown Persona',
    overallScore: (typeof p.overallScore === 'number' && !isNaN(p.overallScore))
      ? Math.max(1, Math.min(p.overallScore, 10))
      : 5,
    originalityScore: (typeof p.originalityScore === 'number' && !isNaN(p.originalityScore))
      ? Math.max(1, Math.min(p.originalityScore, 10))
      : undefined,
    memorabilityScore: (typeof p.memorabilityScore === 'number' && !isNaN(p.memorabilityScore))
      ? Math.max(1, Math.min(p.memorabilityScore, 10))
      : undefined,
    culturalRelevanceScore: (typeof p.culturalRelevanceScore === 'number' && !isNaN(p.culturalRelevanceScore))
      ? Math.max(1, Math.min(p.culturalRelevanceScore, 10))
      : undefined,
    talkabilityScore: (typeof p.talkabilityScore === 'number' && !isNaN(p.talkabilityScore))
      ? Math.max(1, Math.min(p.talkabilityScore, 10))
      : undefined,
    preferredVariant: (
      typeof p.preferredVariant === 'string' && ['A', 'B', 'C'].includes(p.preferredVariant.trim().toUpperCase())
        ? p.preferredVariant.trim().toUpperCase() as 'A' | 'B' | 'C'
        : 'A'
    ),
    feedback: (typeof p.feedback === 'string' && p.feedback.trim().length >= 10)
      ? p.feedback
      : `${p.personaName || 'This persona'} found the strategy moderately relevant but could not provide detailed feedback at this time.`,
    resonates: Array.isArray(p.resonates) ? p.resonates.filter(Boolean) : [],
    concerns: Array.isArray(p.concerns) ? p.concerns.filter(Boolean) : [],
    suggestions: Array.isArray(p.suggestions) ? p.suggestions.filter(Boolean) : [],
  }));
}

// ─── Architecture Normalization ─────────────────────────────

/**
 * Normalize personaRelevance from various AI output formats to the expected array format.
 * Handles: already-correct arrays, flat objects {personaId: "level"}, and missing values.
 */
function normalizePersonaRelevance(raw: unknown): TouchpointPersonaRelevance[] {
  // Case 1: Already correct array format [{personaId, relevance, messagingAngle}]
  if (Array.isArray(raw)) {
    return raw.map((item: Record<string, unknown>) => ({
      personaId: String(item.personaId ?? ''),
      relevance: (['high', 'medium', 'low'].includes(String(item.relevance)) ? item.relevance : 'medium') as PersonaRelevance,
      messagingAngle: String(item.messagingAngle ?? ''),
    }));
  }
  // Case 2: Flat object format {personaId: "level"} — convert to array
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, string>).map(([personaId, relevance]) => ({
      personaId,
      relevance: (['high', 'medium', 'low'].includes(relevance) ? relevance : 'medium') as PersonaRelevance,
      messagingAngle: '',
    }));
  }
  return [];
}

/**
 * Normalize AI-generated architecture data to match the expected ArchitectureLayer schema.
 * Handles common AI deviations: `phase` instead of `name`, missing `id`/`description`/`orderIndex`,
 * missing `personaPhaseData`, flat object `personaRelevance` on touchpoints.
 */
function normalizeArchitectureLayer(raw: ArchitectureLayer): ArchitectureLayer {
  return {
    campaignType: raw.campaignType ?? 'hybrid',
    journeyPhases: (raw.journeyPhases ?? []).map((rawPhase, index) => {
      // Cast to access potential non-schema fields (e.g. `phase` instead of `name`)
      const p = rawPhase as unknown as Record<string, unknown>;
      return {
        // Map `phase` → `name`, fallback to `id`, then to generated slug
        name: String(p.name || p.phase || p.id || `phase-${index}`),
        id: String(p.id || p.name || p.phase || `phase-${index}`),
        description: String(p.description || p.goal || ''),
        orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : index,
        goal: String(p.goal || ''),
        kpis: Array.isArray(p.kpis) ? p.kpis : [],
        // personaPhaseData is often missing — default to empty array
        personaPhaseData: Array.isArray(p.personaPhaseData) ? p.personaPhaseData : [],
        // Normalize touchpoints — especially personaRelevance format
        touchpoints: (Array.isArray(p.touchpoints) ? p.touchpoints : []).map((tp: Record<string, unknown>) => ({
          channel: String(tp.channel ?? ''),
          contentType: String(tp.contentType ?? ''),
          message: String(tp.message ?? ''),
          role: tp.role === 'primary' ? 'primary' as const : 'supporting' as const,
          personaRelevance: normalizePersonaRelevance(tp.personaRelevance),
        })),
      };
    }),
  };
}

// ─── Phase Functions (Interactive Wizard) ───────────────────

interface PhaseContext {
  workspaceId: string;
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  wizardContext: WizardContext;
}

/**
 * Phase A: Generate 3 full variants (strategy + architecture each) + persona validation.
 * Runs Steps 1-2 of the pipeline and returns variant data for user review.
 * Each variant uses a different AI model with deep thinking enabled.
 */
export async function generateStrategyVariants(
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<VariantPhaseResult> {
  const {
    workspaceId,
    wizardContext,
    strategicIntent: intentOpt,
    personaIds: personaIdsOpt,
    productIds: productIdsOpt,
    competitorIds: competitorIdsOpt,
    trendIds: trendIdsOpt,
  } = ctx;
  const strategicIntent = intentOpt ?? 'hybrid';
  const campaignName = wizardContext.campaignName;

  // Resolve configurable models for campaign-strategy features (Variant A + B + C)
  const [{ model: resolvedModel, provider: resolvedProvider }, { model: resolvedModelB, provider: resolvedProviderB }, { model: resolvedModelC, provider: resolvedProviderC }] = await Promise.all([
    resolveFeatureModel(workspaceId, 'campaign-strategy'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-b'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-c'),
  ]);
  const campaignDescription = wizardContext.campaignDescription ?? '';
  const campaignGoalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';

  // Resolve persona IDs
  let personaIds = personaIdsOpt ?? [];
  if (personaIds.length === 0) {
    const all = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
    personaIds = all.map(p => p.id);
  }
  const productIds = productIdsOpt ?? [];
  const competitorIds = competitorIdsOpt ?? [];
  const trendIds = trendIdsOpt ?? [];

  // Build enrichment queries (non-blocking)
  const arenaQueriesPromise = buildArenaQueries({
    workspaceId,
    campaignGoalType,
    personaIds,
  }).catch(() => []);

  const [brandContext, personaContext, productContext, competitorContext, trendContext, personaProfiles, arenaQueries] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildPersonaProfiles(personaIds, workspaceId),
    arenaQueriesPromise,
  ]);

  // Build Exa + Scholar + BCT queries from context (all sync, non-blocking)
  const bctMapping = getGoalBctMapping(campaignGoalType);
  const exaQueries = buildExaQueries({
    campaignGoalType,
    brandName: brandContext.brandName,
    brandValues: brandContext.brandValues,
  });
  const scholarQueries = buildScholarQueries({
    campaignGoalType,
    comBTarget: bctMapping?.comBTarget,
  });
  const bctContext = getBctContext(campaignGoalType);

  // Fetch all enrichments in parallel — emit SSE events for real-time feedback
  onProgress?.({ type: 'enrichment', status: 'running' });
  const [arenaResult, exaResult, scholarResult] = await Promise.all([
    fetchArenaContext(arenaQueries),
    fetchExaContext(exaQueries),
    fetchScholarContext(scholarQueries),
  ]);

  const totalEnrichmentBlocks = (arenaResult.meta?.totalBlocks ?? 0) + (exaResult.meta?.totalResults ?? 0) + (scholarResult.meta?.totalPapers ?? 0);
  if (totalEnrichmentBlocks > 0 || bctContext) {
    onProgress?.({ type: 'enrichment', status: 'complete', totalBlocks: totalEnrichmentBlocks, queries: [
      ...(arenaResult.meta?.queries ?? []),
      ...(exaResult.meta?.queries ?? []),
      ...(scholarResult.meta?.queries ?? []),
    ], sources: {
      arena: arenaResult.meta?.totalBlocks ?? 0,
      exa: exaResult.meta?.totalResults ?? 0,
      scholar: scholarResult.meta?.totalPapers ?? 0,
      bct: !!bctContext,
    } });
  } else {
    onProgress?.({ type: 'enrichment', status: 'skipped' });
  }

  const brandContextText = formatBrandContext(brandContext);
  const briefing = wizardContext.briefing;

  const sharedPromptParams = {
    brandContext: brandContextText,
    personaContext,
    campaignName,
    campaignDescription,
    goalType: campaignGoalType,
    strategicIntent,
    productContext,
    competitorContext,
    trendContext,
    personaIds,
    briefing,
    arenaContext: arenaResult.contextText || undefined,
    exaContext: exaResult.contextText || undefined,
    scholarContext: scholarResult.contextText || undefined,
    bctContext: bctContext || undefined,
  };

  // Select creative angles for each variant (forces creative divergence)
  const creativeAngles = selectCreativeAngles(
    campaignGoalType,
    resolvedProvider as AiProvider,
    resolvedProviderB as AiProvider,
    resolvedProviderC as AiProvider,
  );
  const angleA = creativeAngles.find(a => a.label === 'A');
  const angleB = creativeAngles.find(a => a.label === 'B');
  const angleC = creativeAngles.find(a => a.label === 'C');

  // Step 1: Triple Full Variants (parallel — each model generates its own strategy + architecture with deep thinking)
  const anglePreview = creativeAngles.map(a => `${a.label}: ${a.angle.name}`).join(' | ');
  onProgress?.({ step: 1, name: 'Triple Full Variants', status: 'running', label: `Three AI models generating strategy variants with creative angles: ${anglePreview}` });

  const step1aPrompt = buildFullVariantAPrompt({ ...sharedPromptParams, creativeAngleContext: angleA ? formatAngleForPrompt(angleA.angle) : undefined });
  const step1bPrompt = buildFullVariantBPrompt({ ...sharedPromptParams, creativeAngleContext: angleB ? formatAngleForPrompt(angleB.angle) : undefined });
  const step1cPrompt = buildFullVariantCPrompt({ ...sharedPromptParams, creativeAngleContext: angleC ? formatAngleForPrompt(angleC.angle) : undefined });

  const [fullVariantARaw, fullVariantBRaw, fullVariantCRaw] = await Promise.all([
    withStepContext('Step 1a (Full Variant A — Opus)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProvider, resolvedModel,
        step1aPrompt.system, step1aPrompt.user,
        { temperature: 0.5, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Step 1b (Full Variant B — GPT-5.4)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProviderB, resolvedModelB,
        step1bPrompt.system, step1bPrompt.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Step 1c (Full Variant C — Gemini Pro)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProviderC, resolvedModelC,
        step1cPrompt.system, step1cPrompt.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
  ]);

  const fullVariantA = validateOrWarn(fullVariantSchema, fullVariantARaw, 'Step 1a Full Variant A');
  const fullVariantB = validateOrWarn(fullVariantSchema, fullVariantBRaw, 'Step 1b Full Variant B');
  const fullVariantC = validateOrWarn(fullVariantSchema, fullVariantCRaw, 'Step 1c Full Variant C');
  const strategyLayerA = fullVariantA.strategy;
  const strategyLayerB = fullVariantB.strategy;
  const strategyLayerC = fullVariantC.strategy;
  const variantA = normalizeArchitectureLayer(fullVariantA.architecture);
  const variantB = normalizeArchitectureLayer(fullVariantB.architecture);
  const variantC = normalizeArchitectureLayer(fullVariantC.architecture);

  onProgress?.({ step: 1, name: 'Triple Full Variants', status: 'complete', label: 'All three variants generated', preview: `A: "${strategyLayerA.campaignTheme}" | B: "${strategyLayerB.campaignTheme}" | C: "${strategyLayerC.campaignTheme}"` });

  // Step 2: Persona Validation
  onProgress?.({ step: 2, name: 'Persona Validation', status: 'running', label: 'Validating with personas...' });

  const goalGuidance = getGoalTypeGuidance(campaignGoalType);
  let personaValidation: PersonaValidationResult[] = [];
  let variantAScore = 0;
  let variantBScore = 0;
  let variantCScore = 0;

  if (personaProfiles.length > 0) {
    const step2Prompt = buildPersonaValidatorPrompt({
      strategyLayerA: JSON.stringify(strategyLayerA),
      strategyLayerB: JSON.stringify(strategyLayerB),
      strategyLayerC: JSON.stringify(strategyLayerC),
      variantA: JSON.stringify(variantA),
      variantB: JSON.stringify(variantB),
      variantC: JSON.stringify(variantC),
      personas: personaProfiles,
      goalType: campaignGoalType,
      goalGuidance,
    });

    const validationRaw = await withStepContext('Step 2 (Persona Validation)', 300, () =>
      createStructuredCompletion<PersonaValidationResult[]>(
        resolvedProvider, resolvedModel,
        step2Prompt.system, step2Prompt.user,
        { temperature: 0.7, maxTokens: 16384, timeoutMs: 300_000, thinking: { anthropic: THINKING_CONFIG.anthropicValidation } },
      ),
    );
    personaValidation = normalizePersonaValidation(
      validateOrWarn(personaValidationArraySchema, validationRaw, 'Step 2 Validation'),
    );

    if (personaValidation.length > 0) {
      const allScores = personaValidation.map(p => p.overallScore);
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const aVoters = personaValidation.filter(p => p.preferredVariant === 'A');
      const bVoters = personaValidation.filter(p => p.preferredVariant === 'B');
      const cVoters = personaValidation.filter(p => p.preferredVariant === 'C');
      variantAScore = aVoters.length > 0 ? aVoters.reduce((s, p) => s + p.overallScore, 0) / aVoters.length : avgScore;
      variantBScore = bVoters.length > 0 ? bVoters.reduce((s, p) => s + p.overallScore, 0) / bVoters.length : avgScore;
      variantCScore = cVoters.length > 0 ? cVoters.reduce((s, p) => s + p.overallScore, 0) / cVoters.length : avgScore;
    }
  } else {
    variantAScore = 7;
    variantBScore = 7;
    variantCScore = 7;
  }

  onProgress?.({ step: 2, name: 'Persona Validation', status: 'complete', label: 'Personas evaluated', preview: personaValidation.length > 0 ? `${personaValidation.length} personas scored` : 'Skipped (no personas)' });

  return {
    strategyLayerA, strategyLayerB, strategyLayerC, variantA, variantB, variantC, personaValidation, variantAScore, variantBScore, variantCScore,
    arenaEnrichment: arenaResult.meta ?? null,
  };
}

/**
 * Phase B: Synthesize a definitive strategy from user-reviewed variants.
 * Runs Step 4 of the pipeline, injecting user feedback into the synthesis prompt.
 */
export async function synthesizeStrategy(
  data: {
    variantFeedback: string;
    strategyLayerA: StrategyLayer;
    strategyLayerB: StrategyLayer;
    strategyLayerC: StrategyLayer;
    variantA: ArchitectureLayer;
    variantB: ArchitectureLayer;
    variantC: ArchitectureLayer;
    personaValidation: PersonaValidationResult[];
    variantAScore: number;
    variantBScore: number;
    variantCScore: number;
    wizardContext: WizardContext;
    strategicIntent?: StrategicIntent;
  },
  onProgress?: ProgressCallback,
): Promise<SynthesisPhaseResult> {
  const campaignGoalType = data.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);

  onProgress?.({ step: 4, name: 'Strategy Synthesis', status: 'running', label: 'Synthesizing optimal strategy with deep thinking...' });

  // Inject user feedback into the persona validation context so the synthesizer weighs it
  const personaValidationWithFeedback = data.variantFeedback
    ? JSON.stringify(data.personaValidation) + `\n\n--- USER FEEDBACK ON VARIANTS ---\n${data.variantFeedback}`
    : JSON.stringify(data.personaValidation);

  const step4Prompt = buildStrategySynthesizerPrompt({
    strategyLayerA: JSON.stringify(data.strategyLayerA),
    strategyLayerB: JSON.stringify(data.strategyLayerB),
    strategyLayerC: JSON.stringify(data.strategyLayerC),
    variantA: JSON.stringify(data.variantA),
    variantB: JSON.stringify(data.variantB),
    variantC: JSON.stringify(data.variantC),
    personaValidation: personaValidationWithFeedback,
    variantAScore: data.variantAScore,
    variantBScore: data.variantBScore,
    variantCScore: data.variantCScore,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const synthesizedRaw = await withStepContext('Step 4 (Strategy Synthesis — Opus)', 600, () =>
    createClaudeStructuredCompletion<SynthesizedResult>(
      step4Prompt.system,
      step4Prompt.user,
      { model: CLAUDE_OPUS, temperature: 0.3, maxTokens: 32000, timeoutMs: 600_000, thinking: { budgetTokens: THINKING_CONFIG.anthropicSynthesis.budgetTokens } },
    ),
  );

  if (!synthesizedRaw || typeof synthesizedRaw !== 'object' || !('strategy' in synthesizedRaw) || !('architecture' in synthesizedRaw)) {
    throw new Error('Synthesis returned unexpected structure — expected {strategy, architecture}');
  }
  const strategy = validateOrWarn(strategyLayerSchema, synthesizedRaw.strategy, 'Synthesis Strategy');
  const architecture = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, synthesizedRaw.architecture, 'Synthesis Architecture'));

  onProgress?.({ step: 4, name: 'Strategy Synthesis', status: 'complete', label: 'Optimal strategy synthesized', preview: `${architecture.journeyPhases.length} phases, ${architecture.campaignType}` });

  return { strategy, architecture };
}

/**
 * Phase C: Elaborate the customer journey — channel plan + asset plan.
 * Runs Steps 5-6 of the pipeline, with optional user feedback on the synthesized strategy.
 */
export async function elaborateJourney(
  data: {
    synthesisFeedback: string;
    synthesizedStrategy: StrategyLayer;
    synthesizedArchitecture: ArchitectureLayer;
    personaValidation: PersonaValidationResult[];
    wizardContext: WizardContext;
    personaIds?: string[];
    productIds?: string[];
    competitorIds?: string[];
    trendIds?: string[];
    strategicIntent?: StrategicIntent;
  },
  workspaceId: string,
  onProgress?: ProgressCallback,
): Promise<JourneyPhaseResult> {
  const campaignGoalType = data.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);
  const personaIds = data.personaIds ?? [];
  const productIds = data.productIds ?? [];

  const [productContext, styleguideContext, personaChannelPrefs] = await Promise.all([
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaChannelPrefs(personaIds, workspaceId),
  ]);

  // Inject user feedback into the synthesized strategy JSON so the channel planner considers it
  const synthesizedStrategyJson = data.synthesisFeedback
    ? JSON.stringify(data.synthesizedStrategy) + `\n\n--- USER FEEDBACK ON STRATEGY ---\n${data.synthesisFeedback}`
    : JSON.stringify(data.synthesizedStrategy);
  const synthesizedArchitectureJson = JSON.stringify(data.synthesizedArchitecture);

  // Step 5: Channel Planner
  onProgress?.({ step: 5, name: 'Channel Planner', status: 'running', label: 'Planning channel strategy...' });

  const step5Prompt = buildChannelPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    personaChannelPrefs,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const channelPlanRaw = await withStepContext('Step 5 (Channel Planner — Gemini)', 180, () =>
    createGeminiStructuredCompletion<ChannelPlanLayer>(
      step5Prompt.system, step5Prompt.user,
      { model: GEMINI_FLASH, temperature: 0.2, maxOutputTokens: 12000, timeoutMs: 180_000, responseSchema: channelPlanResponseSchema },
    ),
  );
  const channelPlan = validateOrWarn(channelPlanLayerSchema, channelPlanRaw, 'Step 5 Channel Plan');
  onProgress?.({ step: 5, name: 'Channel Planner', status: 'complete', label: 'Channel plan complete', preview: `${channelPlan.channels.length} channels` });

  // Step 6: Asset Planner
  onProgress?.({ step: 6, name: 'Asset Planner', status: 'running', label: 'Creating asset plan...' });

  const step6Prompt = buildAssetPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    channelPlan: JSON.stringify(channelPlan),
    productContext,
    styleguideContext,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const assetPlanRaw = await withStepContext('Step 6 (Asset Planner — Gemini)', 120, () =>
    createGeminiStructuredCompletion<AssetPlanLayer>(
      step6Prompt.system, step6Prompt.user,
      { model: GEMINI_FLASH, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 120_000, responseSchema: assetPlanResponseSchema },
    ),
  );
  const assetPlan = validateOrWarn(assetPlanLayerSchema, assetPlanRaw, 'Step 6 Asset Plan');
  onProgress?.({ step: 6, name: 'Asset Planner', status: 'complete', label: 'Asset plan complete', preview: `${assetPlan.totalDeliverables} deliverables` });

  return { channelPlan, assetPlan };
}

// ─── Main Pipeline ──────────────────────────────────────────

/**
 * Generate a complete CampaignBlueprint via the 7-step prompt chain.
 * Calls onProgress for each step transition (useful for SSE streaming).
 */
export async function generateCampaignBlueprint(
  workspaceId: string,
  campaignId: string,
  options: GenerateOptions,
  onProgress?: ProgressCallback,
): Promise<CampaignBlueprint> {
  const startTime = Date.now();
  const strategicIntent = options.strategicIntent ?? 'hybrid';
  const isWizardMode = !!options.wizardContext;

  // Resolve configurable models for campaign-strategy features (Variant A + B + C)
  const [{ model: resolvedModel, provider: resolvedProvider }, { model: resolvedModelB, provider: resolvedProviderB }, { model: resolvedModelC, provider: resolvedProviderC }] = await Promise.all([
    resolveFeatureModel(workspaceId, 'campaign-strategy'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-b'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-c'),
  ]);

  // ─── Gather context ──────────────────────────────────────
  // In wizard mode, we don't have a campaign in the DB yet
  let campaignName: string;
  let campaignDescription: string;
  let campaignGoalType: string;
  let knowledgeAssetCount: number;

  if (isWizardMode) {
    campaignName = options.wizardContext!.campaignName;
    campaignDescription = options.wizardContext!.campaignDescription ?? '';
    campaignGoalType = options.wizardContext!.campaignGoalType ?? 'BRAND_AWARENESS';
    // Count all explicitly selected knowledge items (personas + products + competitors + trends)
    // Brand assets are counted separately via brandAssetCount in the confidence calculator
    knowledgeAssetCount = (options.personaIds?.length ?? 0) + (options.productIds?.length ?? 0) + (options.competitorIds?.length ?? 0) + (options.trendIds?.length ?? 0);
  } else {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      include: { knowledgeAssets: true },
    });
    if (!campaign) throw new Error('Campaign not found');
    campaignName = campaign.title;
    campaignDescription = campaign.description || '';
    campaignGoalType = campaign.campaignGoalType || 'BRAND_AWARENESS';
    knowledgeAssetCount = campaign.knowledgeAssets.length;
  }

  // Resolve persona IDs: use provided or fall back to all workspace personas
  let personaIds = options.personaIds ?? [];
  if (personaIds.length === 0) {
    const allPersonas = await prisma.persona.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    personaIds = allPersonas.map(p => p.id);
  }

  // Resolve optional context IDs — empty arrays mean "not selected"
  const productIds = options.productIds ?? [];
  const competitorIds = options.competitorIds ?? [];
  const trendIds = options.trendIds ?? [];

  // Build enrichment queries (non-blocking)
  const arenaQueriesPromise = buildArenaQueries({
    workspaceId,
    campaignGoalType,
    personaIds,
  }).catch(() => []);

  // Fetch all context in parallel
  // Brand assets + styleguide are always loaded (brand identity, always relevant)
  // Products, competitors, trends, and personas are only loaded when explicitly selected
  const [brandContext, personaContext, productContext, competitorContext, trendContext, styleguideContext, personaProfiles, personaChannelPrefs, arenaQueries] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaProfiles(personaIds, workspaceId),
    buildPersonaChannelPrefs(personaIds, workspaceId),
    arenaQueriesPromise,
  ]);

  // Build Exa + Scholar + BCT queries from context (all sync, non-blocking)
  const bctMapping = getGoalBctMapping(campaignGoalType);
  const exaQueries = buildExaQueries({
    campaignGoalType,
    brandName: brandContext.brandName,
    brandValues: brandContext.brandValues,
  });
  const scholarQueries = buildScholarQueries({
    campaignGoalType,
    comBTarget: bctMapping?.comBTarget,
  });
  const bctContext = getBctContext(campaignGoalType);

  // Fetch all enrichments in parallel (non-blocking)
  onProgress?.({ type: 'enrichment', status: 'running' });
  const [arenaResult, exaResult, scholarResult] = await Promise.all([
    fetchArenaContext(arenaQueries),
    fetchExaContext(exaQueries),
    fetchScholarContext(scholarQueries),
  ]);

  const totalBlueprintEnrichmentBlocks = (arenaResult.meta?.totalBlocks ?? 0) + (exaResult.meta?.totalResults ?? 0) + (scholarResult.meta?.totalPapers ?? 0);
  if (totalBlueprintEnrichmentBlocks > 0 || bctContext) {
    onProgress?.({ type: 'enrichment', status: 'complete', totalBlocks: totalBlueprintEnrichmentBlocks, queries: [
      ...(arenaResult.meta?.queries ?? []),
      ...(exaResult.meta?.queries ?? []),
      ...(scholarResult.meta?.queries ?? []),
    ], sources: {
      arena: arenaResult.meta?.totalBlocks ?? 0,
      exa: exaResult.meta?.totalResults ?? 0,
      scholar: scholarResult.meta?.totalPapers ?? 0,
      bct: !!bctContext,
    } });
  } else {
    onProgress?.({ type: 'enrichment', status: 'skipped' });
  }

  const brandContextText = formatBrandContext(brandContext);

  // ─── Step 1: Triple Full Variants (parallel — each model generates its own strategy + architecture with deep thinking) ──────────
  const briefing = isWizardMode ? options.wizardContext!.briefing : undefined;
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);

  // Select creative angles for each variant (forces creative divergence)
  const blueprintAngles = selectCreativeAngles(
    campaignGoalType,
    resolvedProvider as AiProvider,
    resolvedProviderB as AiProvider,
    resolvedProviderC as AiProvider,
  );
  const bpAngleA = blueprintAngles.find(a => a.label === 'A');
  const bpAngleB = blueprintAngles.find(a => a.label === 'B');
  const bpAngleC = blueprintAngles.find(a => a.label === 'C');

  const bpAnglePreview = blueprintAngles.map(a => `${a.label}: ${a.angle.name}`).join(' | ');
  onProgress?.({ step: 1, name: 'Triple Full Variants', status: 'running', label: `Three AI models generating strategy variants with creative angles: ${bpAnglePreview}` });

  const fullVariantParams = {
    brandContext: brandContextText,
    personaContext,
    campaignName,
    campaignDescription,
    goalType: campaignGoalType,
    strategicIntent,
    productContext,
    competitorContext,
    trendContext,
    personaIds,
    briefing,
    arenaContext: arenaResult.contextText || undefined,
    exaContext: exaResult.contextText || undefined,
    scholarContext: scholarResult.contextText || undefined,
    bctContext: bctContext || undefined,
  };

  const step1aPrompt = buildFullVariantAPrompt({ ...fullVariantParams, creativeAngleContext: bpAngleA ? formatAngleForPrompt(bpAngleA.angle) : undefined });
  const step1bPrompt = buildFullVariantBPrompt({ ...fullVariantParams, creativeAngleContext: bpAngleB ? formatAngleForPrompt(bpAngleB.angle) : undefined });
  const step1cPrompt = buildFullVariantCPrompt({ ...fullVariantParams, creativeAngleContext: bpAngleC ? formatAngleForPrompt(bpAngleC.angle) : undefined });

  const [fullVariantARaw, fullVariantBRaw, fullVariantCRaw] = await Promise.all([
    withStepContext('Step 1a (Full Variant A — Opus)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProvider, resolvedModel,
        step1aPrompt.system, step1aPrompt.user,
        { temperature: 0.5, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Step 1b (Full Variant B — GPT-5.4)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProviderB, resolvedModelB,
        step1bPrompt.system, step1bPrompt.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Step 1c (Full Variant C — Gemini Pro)', 600, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProviderC, resolvedModelC,
        step1cPrompt.system, step1cPrompt.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
  ]);

  const fullVariantA = validateOrWarn(fullVariantSchema, fullVariantARaw, 'Step 1a Full Variant A');
  const fullVariantB = validateOrWarn(fullVariantSchema, fullVariantBRaw, 'Step 1b Full Variant B');
  const fullVariantC = validateOrWarn(fullVariantSchema, fullVariantCRaw, 'Step 1c Full Variant C');
  const strategyLayerA = fullVariantA.strategy;
  const strategyLayerB = fullVariantB.strategy;
  const strategyLayerC = fullVariantC.strategy;
  const variantA = normalizeArchitectureLayer(fullVariantA.architecture);
  const variantB = normalizeArchitectureLayer(fullVariantB.architecture);
  const variantC = normalizeArchitectureLayer(fullVariantC.architecture);

  onProgress?.({ step: 1, name: 'Triple Full Variants', status: 'complete', label: 'All three variants generated', preview: `A: "${strategyLayerA.campaignTheme}" | B: "${strategyLayerB.campaignTheme}" | C: "${strategyLayerC.campaignTheme}"` });

  // ─── Step 2: Persona Validator (Claude Sonnet) ───────────
  onProgress?.({ step: 2, name: 'Persona Validation', status: 'running', label: 'Validating with personas...' });

  let personaValidation: PersonaValidationResult[] = [];
  let variantAScore = 0;
  let variantBScore = 0;
  let variantCScore = 0;

  if (personaProfiles.length > 0) {
    const step2Prompt = buildPersonaValidatorPrompt({
      strategyLayerA: JSON.stringify(strategyLayerA),
      strategyLayerB: JSON.stringify(strategyLayerB),
      strategyLayerC: JSON.stringify(strategyLayerC),
      variantA: JSON.stringify(variantA),
      variantB: JSON.stringify(variantB),
      variantC: JSON.stringify(variantC),
      personas: personaProfiles,
      goalType: campaignGoalType,
      goalGuidance,
    });

    const validationRaw = await withStepContext('Step 2 (Persona Validation)', 300, () =>
      createStructuredCompletion<PersonaValidationResult[]>(
        resolvedProvider, resolvedModel,
        step2Prompt.system, step2Prompt.user,
        { temperature: 0.7, maxTokens: 16384, timeoutMs: 300_000, thinking: { anthropic: THINKING_CONFIG.anthropicValidation } },
      ),
    );
    personaValidation = normalizePersonaValidation(
      validateOrWarn(personaValidationArraySchema, validationRaw, 'Step 2 Validation'),
    );

    // Calculate average scores per variant, falling back to overall average
    if (personaValidation.length > 0) {
      const allScores = personaValidation.map(p => p.overallScore);
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const aVoters = personaValidation.filter(p => p.preferredVariant === 'A');
      const bVoters = personaValidation.filter(p => p.preferredVariant === 'B');
      const cVoters = personaValidation.filter(p => p.preferredVariant === 'C');
      variantAScore = aVoters.length > 0 ? aVoters.reduce((s, p) => s + p.overallScore, 0) / aVoters.length : avgScore;
      variantBScore = bVoters.length > 0 ? bVoters.reduce((s, p) => s + p.overallScore, 0) / bVoters.length : avgScore;
      variantCScore = cVoters.length > 0 ? cVoters.reduce((s, p) => s + p.overallScore, 0) / cVoters.length : avgScore;
    }
  } else {
    // No personas — skip validation, use balanced scores
    variantAScore = 7;
    variantBScore = 7;
    variantCScore = 7;
  }

  onProgress?.({ step: 2, name: 'Persona Validation', status: 'complete', label: 'Personas evaluated', preview: personaValidation.length > 0 ? `${personaValidation.length} personas, avg score ${(personaValidation.reduce((s, p) => s + p.overallScore, 0) / personaValidation.length).toFixed(1)}/10` : 'Skipped (no personas)' });

  // ─── Step 3: Strategy Synthesizer (Claude Opus with deep thinking) ──────────
  onProgress?.({ step: 3, name: 'Strategy Synthesis', status: 'running', label: 'Synthesizing optimal strategy with deep thinking...' });

  const step3Prompt = buildStrategySynthesizerPrompt({
    strategyLayerA: JSON.stringify(strategyLayerA),
    strategyLayerB: JSON.stringify(strategyLayerB),
    strategyLayerC: JSON.stringify(strategyLayerC),
    variantA: JSON.stringify(variantA),
    variantB: JSON.stringify(variantB),
    variantC: JSON.stringify(variantC),
    personaValidation: JSON.stringify(personaValidation),
    variantAScore,
    variantBScore,
    variantCScore,
    goalType: campaignGoalType,
    goalGuidance,
  });

  // Step 3 returns BOTH strategy + architecture in a single response — needs high token limit
  const synthesizedRaw = await withStepContext('Step 3 (Strategy Synthesis — Opus)', 600, () =>
    createClaudeStructuredCompletion<SynthesizedResult>(
      step3Prompt.system,
      step3Prompt.user,
      { model: CLAUDE_OPUS, temperature: 0.3, maxTokens: 32000, timeoutMs: 600_000, thinking: { budgetTokens: THINKING_CONFIG.anthropicSynthesis.budgetTokens } },
    ),
  );

  // Validate both sub-outputs — guard against unexpected structure
  if (!synthesizedRaw || typeof synthesizedRaw !== 'object' || !('strategy' in synthesizedRaw) || !('architecture' in synthesizedRaw)) {
    throw new Error('Step 3 Synthesis returned unexpected structure — expected {strategy, architecture} object');
  }
  const synthesizedStrategy = validateOrWarn(strategyLayerSchema, synthesizedRaw.strategy, 'Step 3 Strategy');
  const synthesizedArchitecture = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, synthesizedRaw.architecture, 'Step 3 Architecture'));

  onProgress?.({ step: 3, name: 'Strategy Synthesis', status: 'complete', label: 'Optimal strategy synthesized', preview: `${synthesizedArchitecture.journeyPhases.length} phases, ${synthesizedArchitecture.campaignType}` });

  // ─── Step 4: Channel Planner (Gemini Flash) ────────────
  onProgress?.({ step: 4, name: 'Channel Planner', status: 'running', label: 'Planning channel strategy...' });

  const synthesizedStrategyJson = JSON.stringify(synthesizedStrategy);
  const synthesizedArchitectureJson = JSON.stringify(synthesizedArchitecture);

  const step4Prompt = buildChannelPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    personaChannelPrefs,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const channelPlanRaw = await withStepContext('Step 4 (Channel Planner — Gemini)', 180, () =>
    createGeminiStructuredCompletion<ChannelPlanLayer>(
      step4Prompt.system,
      step4Prompt.user,
      { model: GEMINI_FLASH, temperature: 0.2, maxOutputTokens: 12000, timeoutMs: 180_000, responseSchema: channelPlanResponseSchema },
    ),
  );

  const channelPlan = validateOrWarn(channelPlanLayerSchema, channelPlanRaw, 'Step 4 Channel Plan');

  onProgress?.({ step: 4, name: 'Channel Planner', status: 'complete', label: 'Channel plan complete', preview: `${channelPlan.channels.length} channels` });

  // ─── Step 5: Asset Planner (Gemini Flash) — sequential so it receives channelPlan
  onProgress?.({ step: 5, name: 'Asset Planner', status: 'running', label: 'Creating asset plan...' });

  const step5Prompt = buildAssetPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    channelPlan: JSON.stringify(channelPlan),
    productContext,
    styleguideContext,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const assetPlanRaw = await withStepContext('Step 5 (Asset Planner — Gemini)', 120, () =>
    createGeminiStructuredCompletion<AssetPlanLayer>(
      step5Prompt.system,
      step5Prompt.user,
      { model: GEMINI_FLASH, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 120_000, responseSchema: assetPlanResponseSchema },
    ),
  );

  const assetPlan = validateOrWarn(assetPlanLayerSchema, assetPlanRaw, 'Step 5 Asset Plan');

  onProgress?.({ step: 5, name: 'Asset Planner', status: 'complete', label: 'Asset plan complete', preview: `${assetPlan.totalDeliverables} deliverables` });

  // ─── Calculate confidence ────────────────────────────────
  const [brandAssetCount, workspacePersonaCount, productCount, ctCount] = await Promise.all([
    countNonEmptyAssets(workspaceId),
    prisma.persona.count({ where: { workspaceId } }),
    prisma.product.count({ where: { workspaceId } }),
    countCompetitorsAndTrends(workspaceId),
  ]);

  const { confidence, breakdown } = calculateBlueprintConfidence({
    brandAssetCount,
    personaCount: workspacePersonaCount,
    personaValidation,
    productCount,
    competitorAndTrendCount: ctCount,
    knowledgeAssetCount,
  });

  // ─── Assemble blueprint ──────────────────────────────────
  const blueprint: CampaignBlueprint = {
    strategy: synthesizedStrategy,
    architecture: synthesizedArchitecture,
    channelPlan,
    assetPlan,
    personaValidation,
    confidence,
    confidenceBreakdown: breakdown,
    generatedAt: new Date().toISOString(),
    variantAScore,
    variantBScore,
    variantCScore,
    pipelineDuration: Date.now() - startTime,
    modelsUsed: [resolvedModel, resolvedModelB, resolvedModelC, CLAUDE_OPUS, GEMINI_FLASH],
    contextSelection: {
      personaIds,
      productIds,
      competitorIds,
      trendIds,
      arenaChannels: arenaResult.meta?.channels,
      exaQueries: exaResult.meta?.queries,
      scholarPaperCount: scholarResult.meta?.totalPapers,
      bctGoalType: campaignGoalType,
    },
  };

  return blueprint;
}

// ─── Deliverable Creation from Blueprint ────────────────────

/**
 * Create Deliverable DB records from the asset plan's deliverable list.
 * Safely replaces NOT_STARTED deliverables that have no generated content,
 * preserving any IN_PROGRESS or COMPLETED work.
 */
export async function createDeliverablesFromBlueprint(
  campaignId: string,
  assetPlanDeliverables: import('./strategy-blueprint.types').AssetPlanDeliverable[],
): Promise<number> {
  // 1. Delete existing NOT_STARTED deliverables without generated content
  await prisma.deliverable.deleteMany({
    where: {
      campaignId,
      status: 'NOT_STARTED',
      generatedText: null,
      generatedVideoUrl: null,
      generatedImageUrls: { isEmpty: true },
    },
  });

  // 2. Create new deliverables from blueprint
  for (const d of assetPlanDeliverables) {
    await prisma.deliverable.create({
      data: {
        campaignId,
        title: d.title,
        contentType: d.contentType,
        status: 'NOT_STARTED',
        progress: 0,
        settings: JSON.parse(JSON.stringify({
          channel: d.channel,
          phase: d.phase,
          targetPersonas: d.targetPersonas,
          brief: d.brief,
          productionPriority: d.productionPriority,
          estimatedEffort: d.estimatedEffort,
          suggestedOrder: d.suggestedOrder,
        })),
      },
    });
  }

  return assetPlanDeliverables.length;
}

// ─── Per-Layer Regeneration ─────────────────────────────────

/**
 * Regenerate a specific layer and all downstream layers.
 * Accepts user feedback to guide the regeneration.
 */
export async function regenerateBlueprintLayer(
  workspaceId: string,
  campaignId: string,
  existingBlueprint: CampaignBlueprint,
  layer: 'strategy' | 'architecture' | 'channelPlan' | 'assetPlan',
  feedback: string,
  onProgress?: ProgressCallback,
): Promise<CampaignBlueprint> {
  const startTime = Date.now();
  const blueprint = structuredClone(existingBlueprint);

  // Resolve configurable model for campaign-strategy feature
  const { model: resolvedModel, provider: resolvedProvider } = await resolveFeatureModel(workspaceId, 'campaign-strategy');

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { knowledgeAssets: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  // Use the context selection stored in the blueprint (from initial generation)
  // Falls back to empty arrays (= no context loaded) for items not explicitly selected
  const personaIds = existingBlueprint.contextSelection?.personaIds ?? [];
  const productIds = existingBlueprint.contextSelection?.productIds ?? [];
  const competitorIds = existingBlueprint.contextSelection?.competitorIds ?? [];
  const trendIds = existingBlueprint.contextSelection?.trendIds ?? [];

  // If no personas were stored in contextSelection, fall back to all workspace personas
  const resolvedPersonaIds = personaIds.length > 0 ? personaIds : await prisma.persona.findMany({
    where: { workspaceId },
    select: { id: true },
  }).then(ps => ps.map(p => p.id));

  // Build enrichment queries — only needed when regenerating strategy/architecture layers
  const needsEnrichment = layer === 'strategy' || layer === 'architecture';
  const regenCampaignGoalType = campaign.campaignGoalType || 'BRAND_AWARENESS';

  const regenArenaQueriesPromise = needsEnrichment
    ? buildArenaQueries({
        workspaceId,
        campaignGoalType: regenCampaignGoalType,
        personaIds: resolvedPersonaIds,
      }).catch(() => [])
    : Promise.resolve([]);

  const [brandContext, personaContext, productContext, competitorContext, trendContext, styleguideContext, personaProfiles, personaChannelPrefs, regenArenaQueries] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(resolvedPersonaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaProfiles(resolvedPersonaIds, workspaceId),
    buildPersonaChannelPrefs(resolvedPersonaIds, workspaceId),
    regenArenaQueriesPromise,
  ]);

  // Build + fetch all enrichments in parallel (only for strategy/architecture regen)
  let regenArenaContext: string | undefined;
  let regenExaContext: string | undefined;
  let regenScholarContext: string | undefined;
  let regenBctContext: string | undefined;
  let regenArenaResult: Pick<Awaited<ReturnType<typeof fetchArenaContext>>, 'meta'> = { meta: null };
  let regenExaResult: Pick<Awaited<ReturnType<typeof fetchExaContext>>, 'meta'> = { meta: null };
  let regenScholarResult: Pick<Awaited<ReturnType<typeof fetchScholarContext>>, 'meta'> = { meta: null };

  if (needsEnrichment) {
    const bctMapping = getGoalBctMapping(regenCampaignGoalType);
    const exaQueries = buildExaQueries({
      campaignGoalType: regenCampaignGoalType,
      brandName: brandContext.brandName,
      brandValues: brandContext.brandValues,
    });
    const scholarQueries = buildScholarQueries({
      campaignGoalType: regenCampaignGoalType,
      comBTarget: bctMapping?.comBTarget,
    });

    const [arenaRes, exaRes, scholarRes] = await Promise.all([
      fetchArenaContext(regenArenaQueries),
      fetchExaContext(exaQueries),
      fetchScholarContext(scholarQueries),
    ]);

    regenArenaContext = arenaRes.contextText || undefined;
    regenExaContext = exaRes.contextText || undefined;
    regenScholarContext = scholarRes.contextText || undefined;
    regenBctContext = getBctContext(regenCampaignGoalType) || undefined;
    regenArenaResult = arenaRes;
    regenExaResult = exaRes;
    regenScholarResult = scholarRes;
  }
  // When needsEnrichment is false (channelPlan/assetPlan), all regen* variables
  // keep their default undefined values — no enrichment context needed.

  const brandContextText = formatBrandContext(brandContext);

  // Regenerate from the requested layer downward
  // Strategy and architecture are now coupled — regeneration produces both via a full variant.
  if (layer === 'strategy' || layer === 'architecture') {
    onProgress?.({ step: 1, name: 'Full Variant Regeneration', status: 'running', label: 'Regenerating strategy & architecture...' });

    const regenDescription = `${campaign.description || ''}${feedback ? `\n\nUser feedback for regeneration: ${feedback}` : ''}`;

    // Select a single creative angle for regeneration
    const regenAngles = selectCreativeAngles(regenCampaignGoalType, resolvedProvider as AiProvider, resolvedProvider as AiProvider, resolvedProvider as AiProvider);
    const regenAngle = regenAngles[0]; // Best-fit angle for the provider

    const prompt = buildFullVariantAPrompt({
      brandContext: brandContextText,
      personaContext,
      campaignName: campaign.title,
      campaignDescription: regenDescription,
      goalType: regenCampaignGoalType,
      strategicIntent: blueprint.strategy.strategicIntent,
      productContext,
      competitorContext,
      trendContext,
      personaIds: resolvedPersonaIds,
      arenaContext: regenArenaContext,
      scholarContext: regenScholarContext,
      bctContext: regenBctContext,
      creativeAngleContext: regenAngle ? formatAngleForPrompt(regenAngle.angle) : undefined,
    });

    const fullVariantRaw = await withStepContext('Regenerate Full Variant (Step 1)', 300, () =>
      createStructuredCompletion<FullVariant>(
        resolvedProvider, resolvedModel,
        prompt.system, prompt.user,
        { temperature: 0.5, maxTokens: 24000, timeoutMs: 300_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    );
    const fullVariant = fullVariantSchema.parse(fullVariantRaw);
    blueprint.strategy = validateOrWarn(strategyLayerSchema, fullVariant.strategy, 'Regenerate Strategy');
    blueprint.architecture = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, fullVariant.architecture, 'Regenerate Architecture'));

    // Clear stale persona validation — it was scored against the previous strategy.
    blueprint.personaValidation = [];
    blueprint.variantAScore = 0;
    blueprint.variantBScore = 0;
    blueprint.variantCScore = 0;

    onProgress?.({ step: 1, name: 'Full Variant Regeneration', status: 'complete', label: 'Strategy & architecture regenerated' });
    // Fall through to regenerate channel plan
  }

  if (layer === 'strategy' || layer === 'architecture' || layer === 'channelPlan') {
    onProgress?.({ step: 4, name: 'Channel Planner', status: 'running', label: 'Regenerating channel plan...' });

    const channelFeedback = layer === 'channelPlan' && feedback ? `\n\nUser feedback: ${feedback}` : '';
    const regenGoalType = campaign.campaignGoalType || 'BRAND_AWARENESS';
    const prompt = buildChannelPlannerPrompt({
      synthesizedStrategy: JSON.stringify(blueprint.strategy) + channelFeedback,
      synthesizedArchitecture: JSON.stringify(blueprint.architecture),
      personaChannelPrefs,
      goalType: regenGoalType,
      goalGuidance: getGoalTypeGuidance(regenGoalType),
    });

    const channelRaw = await withStepContext('Regenerate Channel Plan (Step 4)', 180, () =>
      createGeminiStructuredCompletion<ChannelPlanLayer>(
        prompt.system, prompt.user,
        { model: GEMINI_FLASH, temperature: 0.2, maxOutputTokens: 12000, timeoutMs: 180_000, responseSchema: channelPlanResponseSchema },
      ),
    );
    blueprint.channelPlan = validateOrWarn(channelPlanLayerSchema, channelRaw, 'Regenerate Channel Plan');

    onProgress?.({ step: 4, name: 'Channel Planner', status: 'complete', label: 'Channel plan regenerated' });
    // Fall through to regenerate asset plan
  }

  // Asset plan is always regenerated
  onProgress?.({ step: 5, name: 'Asset Planner', status: 'running', label: 'Regenerating asset plan...' });

  const assetFeedback = layer === 'assetPlan' && feedback ? `\n\nUser feedback: ${feedback}` : '';
  const assetRegenGoalType = campaign.campaignGoalType || 'BRAND_AWARENESS';
  const assetPrompt = buildAssetPlannerPrompt({
    synthesizedStrategy: JSON.stringify(blueprint.strategy) + assetFeedback,
    synthesizedArchitecture: JSON.stringify(blueprint.architecture),
    channelPlan: JSON.stringify(blueprint.channelPlan),
    productContext,
    styleguideContext,
    goalType: assetRegenGoalType,
    goalGuidance: getGoalTypeGuidance(assetRegenGoalType),
  });

  const assetRaw = await withStepContext('Regenerate Asset Plan (Step 5)', 180, () =>
    createGeminiStructuredCompletion<AssetPlanLayer>(
      assetPrompt.system, assetPrompt.user,
      { model: GEMINI_FLASH, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 180_000, responseSchema: assetPlanResponseSchema },
    ),
  );
  blueprint.assetPlan = validateOrWarn(assetPlanLayerSchema, assetRaw, 'Regenerate Asset Plan');

  onProgress?.({ step: 5, name: 'Asset Planner', status: 'complete', label: 'Asset plan regenerated' });

  // Recalculate confidence
  const [brandAssetCount, productCount, ctCount] = await Promise.all([
    countNonEmptyAssets(workspaceId),
    prisma.product.count({ where: { workspaceId } }),
    countCompetitorsAndTrends(workspaceId),
  ]);

  const { confidence, breakdown } = calculateBlueprintConfidence({
    brandAssetCount,
    personaCount: resolvedPersonaIds.length,
    personaValidation: blueprint.personaValidation,
    productCount,
    competitorAndTrendCount: ctCount,
    knowledgeAssetCount: campaign.knowledgeAssets.length,
  });

  blueprint.confidence = confidence;
  blueprint.confidenceBreakdown = breakdown;
  blueprint.pipelineDuration = Date.now() - startTime;
  blueprint.generatedAt = new Date().toISOString();
  // Preserve context selection for future regenerations, updating enrichment metadata
  blueprint.contextSelection = existingBlueprint.contextSelection
    ? {
        ...existingBlueprint.contextSelection,
        arenaChannels: regenArenaResult.meta?.channels ?? existingBlueprint.contextSelection.arenaChannels,
        exaQueries: regenExaResult?.meta?.queries ?? existingBlueprint.contextSelection.exaQueries,
        scholarPaperCount: regenScholarResult?.meta?.totalPapers ?? existingBlueprint.contextSelection.scholarPaperCount,
        bctGoalType: regenCampaignGoalType ?? existingBlueprint.contextSelection.bctGoalType,
      }
    : {
        personaIds: resolvedPersonaIds,
        productIds,
        competitorIds,
        trendIds,
        arenaChannels: regenArenaResult.meta?.channels,
        exaQueries: regenExaResult?.meta?.queries,
        scholarPaperCount: regenScholarResult?.meta?.totalPapers,
        bctGoalType: regenCampaignGoalType,
      };

  return blueprint;
}
