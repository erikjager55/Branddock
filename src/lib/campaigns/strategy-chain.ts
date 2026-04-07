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
  buildCriticPrompt,
  buildDefensePrompt,
  buildPersonaPanelPrompt,
} from '@/lib/ai/prompts/campaign-strategy-agents';
import {
  buildFullVariantAPrompt,
  buildFullVariantBPrompt,
  buildFullVariantCPrompt,
  buildPersonaValidatorPrompt,
  buildStrategySynthesizerPrompt,
  buildChannelPlannerPrompt,
  buildAssetPlannerPrompt,
  buildBriefingValidationPrompt,
  buildStrategyFoundationPrompt,
  buildCreativeHookPrompt,
  buildHookPersonaValidatorPrompt,
  buildHookRefinementPrompt,
} from '@/lib/ai/prompts/campaign-strategy';
import { buildArenaQueries } from '@/lib/arena/arena-queries';
import { fetchArenaContext } from '@/lib/arena/arena-client';
import { buildExaQueries } from '@/lib/exa/exa-queries';
import { fetchExaContext } from '@/lib/exa/exa-client';
import { buildScholarQueries } from '@/lib/semantic-scholar/scholar-queries';
import { fetchScholarContext } from '@/lib/semantic-scholar/scholar-client';
import { getBctContext, getGoalBctMapping } from '@/lib/bct/goal-bct-mapping';
import { formatCasiDeterminantsForPrompt } from '@/lib/bct/casi-determinants';
import { formatMindspaceForPrompt } from '@/lib/bct/mindspace-checklist';
import { formatEastForPrompt } from '@/lib/bct/east-checklist';
import { getCialdiniContext } from '@/lib/cialdini/goal-cialdini-mapping';
import { getEffectivenessContext } from '@/lib/effectiveness/goal-effectiveness-mapping';
import { getGrowthContext } from '@/lib/brand-growth/goal-growth-mapping';
import { getFramingContext } from '@/lib/framing/goal-framing-mapping';
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
  briefingValidationSchema,
  strategyFoundationSchema,
  hookConceptSchema,
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
  BriefingValidation,
  ImprovedBriefing,
  StrategyFoundation,
  CreativeHook,
  HookConcept,
  HookPhaseResult,
  ProposalPhaseResult,
  EnrichmentContext,
  CuratorSelection,
  CreativeAngleSelection,
  CreativeEnrichmentBrief,
  AgentCritique,
  AgentDefense,
  PersonaDebateResult,
  ConceptVisual,
  ConceptVisualsResult,
} from './strategy-blueprint.types';
import { agentCritiqueSchema, personaDebateResultSchema } from './strategy-blueprint.types';
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
  campaignType?: string;
  briefing?: CampaignBriefing;
  useExternalEnrichment?: boolean;
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
  const clampScore = (raw: unknown, fallback: number | undefined): number | undefined => {
    const n = Number(raw);
    return (!isNaN(n) && n >= 1) ? Math.max(1, Math.min(n, 10)) : fallback;
  };

  return results.map((p) => {
    const cleanName = (typeof p.personaName === 'string' && p.personaName.trim().length > 0)
      ? p.personaName
      : 'Unknown Persona';

    return {
      ...p,
      personaId: (typeof p.personaId === 'string' && p.personaId.trim().length > 0)
        ? p.personaId
        : `unknown-${Math.random().toString(36).slice(2, 8)}`,
      personaName: cleanName,
      overallScore: clampScore(p.overallScore, 5) as number,
      originalityScore: clampScore(p.originalityScore, undefined),
      memorabilityScore: clampScore(p.memorabilityScore, undefined),
      culturalRelevanceScore: clampScore(p.culturalRelevanceScore, undefined),
      talkabilityScore: clampScore(p.talkabilityScore, undefined),
      preferredVariant: (
        typeof p.preferredVariant === 'string' && ['A', 'B', 'C'].includes(p.preferredVariant.trim().toUpperCase())
          ? p.preferredVariant.trim().toUpperCase() as 'A' | 'B' | 'C'
          : 'A'
      ),
      feedback: (typeof p.feedback === 'string' && p.feedback.trim().length >= 10)
        ? p.feedback
        : `${cleanName} found the strategy moderately relevant but could not provide detailed feedback at this time.`,
      resonates: Array.isArray(p.resonates) ? p.resonates.filter(Boolean) : [],
      concerns: Array.isArray(p.concerns) ? p.concerns.filter(Boolean) : [],
      suggestions: Array.isArray(p.suggestions) ? p.suggestions.filter(Boolean) : [],
      creativeVerdict: (typeof p.creativeVerdict === 'string') ? p.creativeVerdict : undefined,
      hookAScore: clampScore(p.hookAScore, undefined),
      hookBScore: clampScore(p.hookBScore, undefined),
      hookCScore: clampScore(p.hookCScore, undefined),
    };
  });
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
  const campaignType = wizardContext.campaignType;

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

  // Local marketing frameworks (synchronous, no API calls)
  const cialdiniContext = getCialdiniContext(campaignGoalType);
  const effectivenessContext = getEffectivenessContext(campaignGoalType);
  const growthContext = getGrowthContext(campaignGoalType);
  const framingContext = getFramingContext(campaignGoalType);
  const eastChecklist = formatEastForPrompt();

  // Always fetch external enrichments automatically — individual clients handle missing API keys gracefully
  const useExternal = true;
  onProgress?.({ type: 'enrichment', status: 'running' });

  const [arenaResult, exaResult, scholarResult] = await Promise.all([
    fetchArenaContext(arenaQueries),
    fetchExaContext(exaQueries),
    fetchScholarContext(scholarQueries),
  ]);

  const externalBlocks = (arenaResult.meta?.totalBlocks ?? 0) + (exaResult.meta?.totalResults ?? 0) + (scholarResult.meta?.totalPapers ?? 0);
  const localSourceCount = [bctContext, cialdiniContext, effectivenessContext, growthContext, framingContext, eastChecklist].filter(Boolean).length;
  const totalEnrichmentBlocks = externalBlocks + localSourceCount;
  const hasAnyEnrichment = totalEnrichmentBlocks > 0;
  if (hasAnyEnrichment) {
    onProgress?.({ type: 'enrichment', status: 'complete', totalBlocks: totalEnrichmentBlocks, queries: [
      ...(arenaResult.meta?.queries ?? []),
      ...(exaResult.meta?.queries ?? []),
      ...(scholarResult.meta?.queries ?? []),
    ], sources: {
      arena: arenaResult.meta?.totalBlocks ?? 0,
      exa: exaResult.meta?.totalResults ?? 0,
      scholar: scholarResult.meta?.totalPapers ?? 0,
      bct: !!bctContext,
      cialdini: !!cialdiniContext,
      effectiveness: !!effectivenessContext,
      growth: !!growthContext,
      framing: !!framingContext,
      east: !!eastChecklist,
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
    campaignType,
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
    cialdiniContext: cialdiniContext || undefined,
    effectivenessContext: effectivenessContext || undefined,
    growthContext: growthContext || undefined,
    framingContext: framingContext || undefined,
    eastChecklist: eastChecklist || undefined,
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
    campaignType,
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
    /** Multi-agent debate context — formatted markdown string with critique, defense and persona panel results */
    agentDebateContext?: string;
  },
  onProgress?: ProgressCallback,
): Promise<SynthesisPhaseResult> {
  const campaignGoalType = data.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = data.wizardContext.campaignType;
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
    campaignType,
    goalGuidance,
    agentDebateContext: data.agentDebateContext,
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
  const campaignType = data.wizardContext.campaignType;
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);
  const personaIds = data.personaIds ?? [];
  const productIds = data.productIds ?? [];

  const [productContext, styleguideContext, personaChannelPrefs] = await Promise.all([
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaChannelPrefs(personaIds, workspaceId),
  ]);

  // Local marketing frameworks (synchronous, no API calls)
  const journeyCialdiniContext = getCialdiniContext(campaignGoalType) || undefined;
  const journeyFramingContext = getFramingContext(campaignGoalType) || undefined;
  const journeyGrowthContext = getGrowthContext(campaignGoalType) || undefined;
  const journeyEastChecklist = formatEastForPrompt() || undefined;

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
    campaignType,
    goalGuidance,
    cialdiniContext: journeyCialdiniContext,
    framingContext: journeyFramingContext,
    eastChecklist: journeyEastChecklist,
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

  const phaseNames = (data.synthesizedArchitecture?.journeyPhases ?? []).map((p: { name: string }) => p.name);

  const step6Prompt = buildAssetPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    channelPlan: JSON.stringify(channelPlan),
    productContext,
    styleguideContext,
    goalType: campaignGoalType,
    campaignType,
    goalGuidance,
    journeyPhaseNames: phaseNames,
    cialdiniContext: journeyCialdiniContext,
    framingContext: journeyFramingContext,
    growthContext: journeyGrowthContext,
    eastChecklist: journeyEastChecklist,
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
  let campaignType: string | undefined;
  let knowledgeAssetCount: number;

  if (isWizardMode) {
    campaignName = options.wizardContext!.campaignName;
    campaignDescription = options.wizardContext!.campaignDescription ?? '';
    campaignGoalType = options.wizardContext!.campaignGoalType ?? 'BRAND_AWARENESS';
    campaignType = options.wizardContext!.campaignType;
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

  // Local marketing frameworks (synchronous, no API calls)
  const bpCialdiniContext = getCialdiniContext(campaignGoalType);
  const bpEffectivenessContext = getEffectivenessContext(campaignGoalType);
  const bpGrowthContext = getGrowthContext(campaignGoalType);
  const bpFramingContext = getFramingContext(campaignGoalType);
  const bpEastChecklist = formatEastForPrompt();

  // Always fetch external enrichments automatically — individual clients handle missing API keys gracefully
  const useExternal = true;
  onProgress?.({ type: 'enrichment', status: 'running' });

  const [arenaResult, exaResult, scholarResult] = await Promise.all([
    fetchArenaContext(arenaQueries),
    fetchExaContext(exaQueries),
    fetchScholarContext(scholarQueries),
  ]);

  const externalBlueprintBlocks = (arenaResult.meta?.totalBlocks ?? 0) + (exaResult.meta?.totalResults ?? 0) + (scholarResult.meta?.totalPapers ?? 0);
  const localBlueprintSourceCount = [bctContext, bpCialdiniContext, bpEffectivenessContext, bpGrowthContext, bpFramingContext, bpEastChecklist].filter(Boolean).length;
  const totalBlueprintEnrichmentBlocks = externalBlueprintBlocks + localBlueprintSourceCount;
  const hasAnyBlueprintEnrichment = totalBlueprintEnrichmentBlocks > 0;
  if (hasAnyBlueprintEnrichment) {
    onProgress?.({ type: 'enrichment', status: 'complete', totalBlocks: totalBlueprintEnrichmentBlocks, queries: [
      ...(arenaResult.meta?.queries ?? []),
      ...(exaResult.meta?.queries ?? []),
      ...(scholarResult.meta?.queries ?? []),
    ], sources: {
      arena: arenaResult.meta?.totalBlocks ?? 0,
      exa: exaResult.meta?.totalResults ?? 0,
      scholar: scholarResult.meta?.totalPapers ?? 0,
      bct: !!bctContext,
      cialdini: !!bpCialdiniContext,
      effectiveness: !!bpEffectivenessContext,
      growth: !!bpGrowthContext,
      framing: !!bpFramingContext,
      east: !!bpEastChecklist,
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
    campaignType,
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
    cialdiniContext: bpCialdiniContext || undefined,
    effectivenessContext: bpEffectivenessContext || undefined,
    growthContext: bpGrowthContext || undefined,
    framingContext: bpFramingContext || undefined,
    eastChecklist: bpEastChecklist || undefined,
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
    campaignType,
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
    campaignType,
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
    campaignType,
    goalGuidance,
    cialdiniContext: bpCialdiniContext || undefined,
    framingContext: bpFramingContext || undefined,
    eastChecklist: bpEastChecklist || undefined,
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

  const bpPhaseNames = (synthesizedArchitecture.journeyPhases ?? []).map((p: { name: string }) => p.name);

  const step5Prompt = buildAssetPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    channelPlan: JSON.stringify(channelPlan),
    productContext,
    styleguideContext,
    goalType: campaignGoalType,
    campaignType,
    goalGuidance,
    journeyPhaseNames: bpPhaseNames,
    cialdiniContext: bpCialdiniContext || undefined,
    framingContext: bpFramingContext || undefined,
    growthContext: bpGrowthContext || undefined,
    eastChecklist: bpEastChecklist || undefined,
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
      useExternalEnrichment: useExternal,
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
        journeyPhase: d.phase ?? null,
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

  // Local marketing frameworks (always available, no API calls)
  const regenCialdiniContext = getCialdiniContext(regenCampaignGoalType) || undefined;
  const regenEffectivenessContext = getEffectivenessContext(regenCampaignGoalType) || undefined;
  const regenGrowthContext = getGrowthContext(regenCampaignGoalType) || undefined;
  const regenFramingContext = getFramingContext(regenCampaignGoalType) || undefined;
  const regenEastChecklist = formatEastForPrompt() || undefined;

  // Build + fetch all enrichments in parallel (only for strategy/architecture regen)
  let regenArenaContext: string | undefined;
  let regenExaContext: string | undefined;
  let regenScholarContext: string | undefined;
  let regenBctContext: string | undefined;
  let regenArenaResult: Pick<Awaited<ReturnType<typeof fetchArenaContext>>, 'meta'> = { meta: null };
  let regenExaResult: Pick<Awaited<ReturnType<typeof fetchExaContext>>, 'meta'> = { meta: null };
  let regenScholarResult: Pick<Awaited<ReturnType<typeof fetchScholarContext>>, 'meta'> = { meta: null };

  if (needsEnrichment) {
    // Always use external enrichment — individual clients handle missing API keys gracefully
    const useExternal = true;

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

    const [arenaRes, exaRes, scholarRes] = useExternal
      ? await Promise.all([
          fetchArenaContext(regenArenaQueries),
          fetchExaContext(exaQueries),
          fetchScholarContext(scholarQueries),
        ])
      : [
          { contextText: '', meta: null } as Awaited<ReturnType<typeof fetchArenaContext>>,
          { contextText: '', meta: null } as Awaited<ReturnType<typeof fetchExaContext>>,
          { contextText: '', meta: null } as Awaited<ReturnType<typeof fetchScholarContext>>,
        ];

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
      cialdiniContext: regenCialdiniContext,
      effectivenessContext: regenEffectivenessContext,
      growthContext: regenGrowthContext,
      framingContext: regenFramingContext,
      eastChecklist: regenEastChecklist,
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
      cialdiniContext: regenCialdiniContext,
      framingContext: regenFramingContext,
      eastChecklist: regenEastChecklist,
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
  const regenPhaseNames = (blueprint.architecture?.journeyPhases ?? []).map((p: { name: string }) => p.name);
  const assetPrompt = buildAssetPlannerPrompt({
    synthesizedStrategy: JSON.stringify(blueprint.strategy) + assetFeedback,
    synthesizedArchitecture: JSON.stringify(blueprint.architecture),
    channelPlan: JSON.stringify(blueprint.channelPlan),
    productContext,
    styleguideContext,
    goalType: assetRegenGoalType,
    goalGuidance: getGoalTypeGuidance(assetRegenGoalType),
    journeyPhaseNames: regenPhaseNames,
    cialdiniContext: regenCialdiniContext,
    framingContext: regenFramingContext,
    growthContext: regenGrowthContext,
    eastChecklist: regenEastChecklist,
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

// =============================================================================
// 9-Phase Pipeline Functions (New Interactive Architecture)
// =============================================================================

// ─── Helper: Derive Creative Enrichment Brief ────────────────

/**
 * Extract creative enrichment data from the strategy foundation for hook generation.
 * Maps behavioral & enrichment analysis into creative prompts for the hook generators.
 */
function deriveCreativeEnrichmentBrief(foundation: StrategyFoundation): CreativeEnrichmentBrief {
  const enrichmentSynthesis = foundation.enrichmentSynthesis;
  const mindspaceAssessment = foundation.mindspaceAssessment ?? [];
  const elmRoute = foundation.elmRouteRecommendation;
  const audienceInsights = foundation.audienceInsights ?? [];
  const behavioralStrategy = foundation.behavioralStrategy;

  return {
    culturalTensions: enrichmentSynthesis?.crossSourcePatterns ?? [],
    behavioralReframes: [
      behavioralStrategy?.desiredBehavior ?? '',
      ...(behavioralStrategy?.selectedBCTs ?? []).map(bct => `${bct.techniqueName}: ${bct.applicationHint}`),
    ].filter(Boolean),
    crossIndustryAnalogies: (enrichmentSynthesis?.sourceAttributedInsights ?? [])
      .filter(i => i.source === 'exa')
      .map(i => i.insight),
    mindspaceOpportunities: mindspaceAssessment
      .filter(m => m.applicable && m.opportunity)
      .map(m => `${m.factor}: ${m.opportunity}`),
    elmCreativeImplications: `Primary route: ${elmRoute?.primaryRoute ?? 'unknown'}. ${elmRoute?.rationale ?? ''}`,
    audienceEmotionalLandscape: audienceInsights
      .map(a => `${a.personaName}: ${a.insight} (TTM: ${a.ttmStage}, ELM: ${a.elmRoute})`)
      .join(' | '),
  };
}

// ─── Phase 1: Validate Briefing ──────────────────────────────

/**
 * Phase 1: Evaluate briefing completeness using a fast model (Gemini Flash).
 * Returns a BriefingValidation with score, gaps, and suggestions.
 */
export async function validateBriefing(
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<BriefingValidation> {
  const { workspaceId, wizardContext, strategicIntent: intentOpt } = ctx;
  const strategicIntent = intentOpt ?? 'hybrid';
  const campaignGoalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = wizardContext.campaignType;

  // Step 1: Gather brand context
  onProgress?.({ step: 1, name: 'Gathering Context', status: 'running', label: 'Gathering brand context...' });

  // Resolve persona IDs
  let personaIds = ctx.personaIds ?? [];
  if (personaIds.length === 0) {
    const all = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
    personaIds = all.map(p => p.id);
  }
  const productIds = ctx.productIds ?? [];

  // Build context (lightweight — no enrichment for validation)
  const [brandContext, personaContext, productContext] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
  ]);

  onProgress?.({ step: 1, name: 'Gathering Context', status: 'complete', label: 'Brand context gathered' });

  // Step 2: Analyze briefing
  onProgress?.({ step: 2, name: 'Analyzing Briefing', status: 'running', label: 'Analyzing briefing completeness...' });

  const prompt = buildBriefingValidationPrompt({
    campaignName: wizardContext.campaignName,
    campaignDescription: wizardContext.campaignDescription ?? '',
    goalType: campaignGoalType,
    campaignType,
    strategicIntent,
    briefing: wizardContext.briefing,
    brandContext: formatBrandContext(brandContext),
    personaContext,
    productContext,
  });

  // Use Gemini Flash for speed
  const raw = await withStepContext('Phase 1 (Briefing Validation)', 60, () =>
    createStructuredCompletion<BriefingValidation>(
      'google', GEMINI_FLASH,
      prompt.system, prompt.user,
      { temperature: 0.3, maxTokens: 8192, timeoutMs: 45_000 },
    ),
  );

  onProgress?.({ step: 2, name: 'Analyzing Briefing', status: 'complete', label: 'Analysis complete' });

  // Step 3: Score results
  onProgress?.({ step: 3, name: 'Scoring Results', status: 'running', label: 'Scoring results...' });

  const result = validateOrWarn(briefingValidationSchema, raw, 'Phase 1 Briefing Validation');

  onProgress?.({ step: 3, name: 'Scoring Results', status: 'complete', label: `Score: ${result.overallScore}/100 — ${result.isComplete ? 'Ready' : 'Gaps found'}` });

  return result;
}

// ─── Phase 1c: Improve Briefing ──────────────────────────────

/**
 * Phase 1c: AI rewrites briefing fields based on validation gaps and suggestions.
 * Uses Gemini Flash for speed. Returns improved briefing field values.
 */
export async function improveBriefing(
  wizardContext: { campaignName: string; campaignDescription?: string; campaignGoalType?: string; briefing?: CampaignBriefing },
  validation: BriefingValidation,
  strategicIntent: StrategicIntent,
): Promise<ImprovedBriefing> {
  const goalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';

  const systemPrompt = `You are a senior campaign strategist. Your task is to improve a campaign briefing based on AI validation feedback. Rewrite each field to address the identified gaps and apply the suggestions while preserving the user's original intent.

Return a JSON object with exactly these 5 fields:
- occasion: string (why this campaign exists, what triggers it)
- audienceObjective: string (what the audience should think, feel, or do)
- coreMessage: string (the single most important message)
- tonePreference: string (desired tone and communication style)
- constraints: string (limitations, budget, timeline, requirements)

Each field must be a substantive, well-written paragraph. Do NOT leave any field empty.`;

  const gapsText = validation.gaps.map(g => `- [${g.severity}] ${g.field}: ${g.suggestion}`).join('\n');
  const suggestionsText = validation.suggestions.map(s => `- ${s}`).join('\n');

  const userPrompt = `Campaign: ${wizardContext.campaignName}
Description: ${wizardContext.campaignDescription ?? 'Not provided'}
Goal Type: ${goalType}
Strategic Intent: ${strategicIntent}

Current Briefing:
- Occasion: ${wizardContext.briefing?.occasion || '(empty)'}
- Audience Objective: ${wizardContext.briefing?.audienceObjective || '(empty)'}
- Core Message: ${wizardContext.briefing?.coreMessage || '(empty)'}
- Tone Preference: ${wizardContext.briefing?.tonePreference || '(empty)'}
- Constraints: ${wizardContext.briefing?.constraints || '(empty)'}

Validation Score: ${validation.overallScore}/100

Gaps found:
${gapsText || 'None'}

Improvement Suggestions:
${suggestionsText || 'None'}

Strengths (preserve these):
${validation.strengths.map(s => `- ${s}`).join('\n') || 'None'}

Rewrite all 5 briefing fields, addressing every gap and applying the suggestions. Preserve what's already strong. Make the briefing score-worthy of 90+/100.`;

  const result = await withStepContext('Phase 1c (Improve Briefing)', 30, () =>
    createStructuredCompletion<ImprovedBriefing>(
      'google', GEMINI_FLASH,
      systemPrompt, userPrompt,
      { temperature: 0.5, maxTokens: 4096, timeoutMs: 30_000 },
    ),
  );

  // Use || (not ??) so empty strings from the LLM also fall back to originals
  return {
    occasion: result.occasion || wizardContext.briefing?.occasion || '',
    audienceObjective: result.audienceObjective || wizardContext.briefing?.audienceObjective || '',
    coreMessage: result.coreMessage || wizardContext.briefing?.coreMessage || '',
    tonePreference: result.tonePreference || wizardContext.briefing?.tonePreference || '',
    constraints: result.constraints || wizardContext.briefing?.constraints || '',
  };
}

// ─── Phase 2: Build Strategy Foundation ──────────────────────

/**
 * Phase 2: Build the analytical strategy foundation using Claude Opus with deep thinking.
 * Runs full enrichment pipeline (Arena, Exa, Scholar, BCT, CASI, MINDSPACE) and
 * synthesizes everything into a StrategyFoundation for creative teams.
 */
export async function buildStrategyFoundation(
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<{ foundation: StrategyFoundation; enrichmentContext: EnrichmentContext }> {
  const { workspaceId, wizardContext, strategicIntent: intentOpt } = ctx;
  const strategicIntent = intentOpt ?? 'hybrid';
  const campaignGoalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = wizardContext.campaignType;

  // Resolve persona IDs
  let personaIds = ctx.personaIds ?? [];
  if (personaIds.length === 0) {
    const all = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
    personaIds = all.map(p => p.id);
  }
  const productIds = ctx.productIds ?? [];
  const competitorIds = ctx.competitorIds ?? [];
  const trendIds = ctx.trendIds ?? [];

  // Step 1: Gather all context
  onProgress?.({ step: 1, name: 'Gathering Context', status: 'running', label: 'Gathering brand & audience context...' });

  // Build enrichment queries (non-blocking)
  const arenaQueriesPromise = buildArenaQueries({ workspaceId, campaignGoalType, personaIds }).catch(() => []);

  const [brandContext, personaContext, productContext, competitorContext, trendContext, styleguideContext, arenaQueries] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    arenaQueriesPromise,
  ]);

  onProgress?.({ step: 1, name: 'Gathering Context', status: 'complete', label: 'Context gathered' });

  // Build Exa + Scholar + BCT queries
  const bctMapping = getGoalBctMapping(campaignGoalType);
  const exaQueries = buildExaQueries({
    campaignGoalType,
    brandName: brandContext.brandName,
    brandValues: brandContext.brandValues,
  });
  const scholarQueries = buildScholarQueries({ campaignGoalType, comBTarget: bctMapping?.comBTarget });
  const bctContext = getBctContext(campaignGoalType);
  const casiDeterminants = formatCasiDeterminantsForPrompt();
  const mindspaceChecklist = formatMindspaceForPrompt();

  // Local marketing frameworks (synchronous, no API calls)
  const sfCialdiniContext = getCialdiniContext(campaignGoalType) || undefined;
  const sfEffectivenessContext = getEffectivenessContext(campaignGoalType) || undefined;
  const sfGrowthContext = getGrowthContext(campaignGoalType) || undefined;
  const sfFramingContext = getFramingContext(campaignGoalType) || undefined;
  const sfEastChecklist = formatEastForPrompt() || undefined;

  // Always fetch external enrichments automatically — individual clients handle missing API keys gracefully
  const useExternal = true;
  onProgress?.({ type: 'enrichment', status: 'running' });

  const [arenaResult, exaResult, scholarResult] = await Promise.all([
    fetchArenaContext(arenaQueries),
    fetchExaContext(exaQueries),
    fetchScholarContext(scholarQueries),
  ]);

  const externalBlocks = (arenaResult.meta?.totalBlocks ?? 0) + (exaResult.meta?.totalResults ?? 0) + (scholarResult.meta?.totalPapers ?? 0);
  const localSourceCount = [bctContext, sfCialdiniContext, sfEffectivenessContext, sfGrowthContext, sfFramingContext, sfEastChecklist].filter(Boolean).length;
  const totalEnrichmentBlocks = externalBlocks + localSourceCount;
  const hasAnyEnrichment = totalEnrichmentBlocks > 0;
  if (hasAnyEnrichment) {
    onProgress?.({ type: 'enrichment', status: 'complete', totalBlocks: totalEnrichmentBlocks, queries: [
      ...(arenaResult.meta?.queries ?? []),
      ...(exaResult.meta?.queries ?? []),
      ...(scholarResult.meta?.queries ?? []),
    ], sources: {
      arena: arenaResult.meta?.totalBlocks ?? 0,
      exa: exaResult.meta?.totalResults ?? 0,
      scholar: scholarResult.meta?.totalPapers ?? 0,
      bct: !!bctContext,
      cialdini: !!sfCialdiniContext,
      effectiveness: !!sfEffectivenessContext,
      growth: !!sfGrowthContext,
      framing: !!sfFramingContext,
      east: !!sfEastChecklist,
    } });
  } else {
    onProgress?.({ type: 'enrichment', status: 'skipped' });
  }

  onProgress?.({ step: 2, name: 'Enriching Strategy', status: 'complete', label: 'Enrichment complete' });

  const brandContextText = formatBrandContext(brandContext);

  // Resolve Claude Opus for strategy foundation
  const { model: resolvedModel, provider: resolvedProvider } = await resolveFeatureModel(workspaceId, 'campaign-strategy');

  // Step 3: Deep AI analysis (the long one)
  onProgress?.({ step: 3, name: 'Deep Analysis', status: 'running', label: 'Building behavioral analysis...' });

  const prompt = buildStrategyFoundationPrompt({
    campaignName: wizardContext.campaignName,
    campaignDescription: wizardContext.campaignDescription ?? '',
    goalType: campaignGoalType,
    campaignType,
    strategicIntent,
    briefing: wizardContext.briefing,
    brandContext: brandContextText,
    personaContext,
    personaIds,
    productContext,
    competitorContext,
    trendContext,
    arenaContext: arenaResult.contextText || undefined,
    exaContext: exaResult.contextText || undefined,
    scholarContext: scholarResult.contextText || undefined,
    bctContext: bctContext || undefined,
    casiDeterminants,
    mindspaceChecklist,
    cialdiniContext: sfCialdiniContext,
    effectivenessContext: sfEffectivenessContext,
    growthContext: sfGrowthContext,
    framingContext: sfFramingContext,
    eastChecklist: sfEastChecklist,
  });

  const raw = await withStepContext('Phase 2 (Strategy Foundation)', 600, () =>
    createStructuredCompletion<StrategyFoundation>(
      resolvedProvider, resolvedModel,
      prompt.system, prompt.user,
      { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
    ),
  );

  onProgress?.({ step: 3, name: 'Deep Analysis', status: 'complete', label: 'Analysis complete' });

  // Step 4: Finalize foundation
  onProgress?.({ step: 4, name: 'Finalizing Foundation', status: 'running', label: 'Synthesizing foundation insights...' });

  const foundation = validateOrWarn(strategyFoundationSchema, raw, 'Phase 2 Strategy Foundation');

  onProgress?.({ step: 4, name: 'Finalizing Foundation', status: 'complete', label: `Foundation built — ${foundation.keyInsights?.length ?? 0} insights synthesized` });

  // Package all enrichment context for reuse in later phases
  const enrichmentContext: EnrichmentContext = {
    arenaText: arenaResult.contextText ?? '',
    exaText: exaResult.contextText ?? '',
    scholarText: scholarResult.contextText ?? '',
    bctContext: bctContext ?? '',
    casiDeterminants,
    mindspaceChecklist,
    goalInsights: '',
    brandContext: brandContextText,
    personaProfiles: personaContext,
    productContext,
    competitorContext,
    trendContext,
    styleguideContext,
  };

  return { foundation, enrichmentContext };
}

// ─── Phase 4: Generate Creative Hooks ────────────────────────

interface GenerateCreativeHooksInput extends PhaseContext {
  foundation: StrategyFoundation;
  enrichmentContext: EnrichmentContext;
  strategyFeedback?: string;
}

/**
 * Phase 4: Generate 3 creative hooks in parallel, each using a different AI model
 * and creative angle. Then validate all hooks with persona evaluation.
 */
export async function generateCreativeHooks(
  ctx: GenerateCreativeHooksInput,
  onProgress?: ProgressCallback,
): Promise<HookPhaseResult> {
  const { workspaceId, wizardContext, foundation, enrichmentContext, strategyFeedback } = ctx;
  const strategicIntent = ctx.strategicIntent ?? 'hybrid';
  const campaignGoalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = wizardContext.campaignType;

  // Resolve persona IDs
  let personaIds = ctx.personaIds ?? [];
  if (personaIds.length === 0) {
    const all = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
    personaIds = all.map(p => p.id);
  }

  // Resolve 3 provider models
  const [
    { model: modelA, provider: providerA },
    { model: modelB, provider: providerB },
    { model: modelC, provider: providerC },
  ] = await Promise.all([
    resolveFeatureModel(workspaceId, 'campaign-strategy'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-b'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-c'),
  ]);

  // Select creative angles for each variant
  const creativeAngles = selectCreativeAngles(
    campaignGoalType,
    providerA as AiProvider,
    providerB as AiProvider,
    providerC as AiProvider,
  );

  // Build curator selection from angle assignments
  const curatorSelection: CuratorSelection = {
    selectedAngles: creativeAngles.map(a => {
      const profile = getLlmProfile(a.provider);
      return {
        angleId: a.angle.id,
        angleName: a.angle.name,
        assignedProvider: a.provider,
        assignedModel: a.label === 'A' ? modelA : a.label === 'B' ? modelB : modelC,
        featureKey: a.label === 'A' ? 'campaign-strategy' : a.label === 'B' ? 'campaign-strategy-b' : 'campaign-strategy-c',
        selectionRationale: `Top angle for ${campaignGoalType} goal type, matched to ${a.provider}`,
        llmMatchRationale: profile ? `${profile.moniker} (creative score: ${profile.creativeScore})` : 'Default assignment',
        insightFamily: a.angle.insightFamily,
      };
    }),
    rationale: `Selected 3 divergent creative angles for ${campaignGoalType} goal, each matched to the provider best suited for its creative requirements.`,
    diversificationCheck: `Angles span ${new Set(creativeAngles.map(a => a.angle.insightFamily)).size} insight families: ${creativeAngles.map(a => `${a.label}=${a.angle.insightFamily}`).join(', ')}`,
  };

  // Derive creative enrichment brief from strategy foundation
  const creativeEnrichmentBrief = deriveCreativeEnrichmentBrief(foundation);

  // Generate local marketing framework contexts (synchronous, no API calls)
  const hookCialdiniContext = getCialdiniContext(campaignGoalType) || undefined;
  const hookFramingContext = getFramingContext(campaignGoalType) || undefined;
  const hookGrowthContext = getGrowthContext(campaignGoalType) || undefined;
  const hookEastChecklist = formatEastForPrompt() || undefined;

  // Build shared prompt params
  const sharedParams = {
    campaignName: wizardContext.campaignName,
    campaignDescription: wizardContext.campaignDescription ?? '',
    goalType: campaignGoalType,
    campaignType,
    strategicIntent,
    briefing: wizardContext.briefing,
    brandContext: enrichmentContext.brandContext,
    personaContext: enrichmentContext.personaProfiles,
    personaIds,
    productContext: enrichmentContext.productContext,
    competitorContext: enrichmentContext.competitorContext,
    trendContext: enrichmentContext.trendContext,
    strategyFoundation: foundation,
    creativeEnrichmentBrief,
    strategyFeedback,
    cialdiniContext: hookCialdiniContext,
    framingContext: hookFramingContext,
    growthContext: hookGrowthContext,
    eastChecklist: hookEastChecklist,
  };

  const angleA = creativeAngles.find(a => a.label === 'A');
  const angleB = creativeAngles.find(a => a.label === 'B');
  const angleC = creativeAngles.find(a => a.label === 'C');

  const anglePreview = creativeAngles.map(a => `${a.label}: ${a.angle.name}`).join(' | ');
  onProgress?.({ step: 1, name: 'Creative Hook Generation', status: 'running', label: `Three AI models generating hooks: ${anglePreview}` });

  // Generate 3 hooks in parallel — each with a different creative angle and model
  const promptA = buildCreativeHookPrompt({ ...sharedParams, creativeAngle: angleA!.angle });
  const promptB = buildCreativeHookPrompt({ ...sharedParams, creativeAngle: angleB!.angle });
  const promptC = buildCreativeHookPrompt({ ...sharedParams, creativeAngle: angleC!.angle });

  const [hookARaw, hookBRaw, hookCRaw] = await Promise.all([
    withStepContext('Phase 4a (Hook A)', 600, () =>
      createStructuredCompletion<{ strategy: StrategyLayer; architecture: ArchitectureLayer; hookConcept: HookConcept }>(
        providerA, modelA,
        promptA.system, promptA.user,
        { temperature: 0.6, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Phase 4b (Hook B)', 600, () =>
      createStructuredCompletion<{ strategy: StrategyLayer; architecture: ArchitectureLayer; hookConcept: HookConcept }>(
        providerB, modelB,
        promptB.system, promptB.user,
        { temperature: 0.6, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Phase 4c (Hook C)', 600, () =>
      createStructuredCompletion<{ strategy: StrategyLayer; architecture: ArchitectureLayer; hookConcept: HookConcept }>(
        providerC, modelC,
        promptC.system, promptC.user,
        { temperature: 0.6, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
  ]);

  // Validate and assemble CreativeHook objects
  const hooks: CreativeHook[] = [
    { label: 'A', raw: hookARaw, angle: angleA!, model: modelA, provider: providerA },
    { label: 'B', raw: hookBRaw, angle: angleB!, model: modelB, provider: providerB },
    { label: 'C', raw: hookCRaw, angle: angleC!, model: modelC, provider: providerC },
  ].map(({ raw, angle, model, provider }) => {
    const hookConcept = validateOrWarn(hookConceptSchema, raw.hookConcept, `Hook ${angle.label} HookConcept`);
    return {
      strategy: raw.strategy,
      architecture: normalizeArchitectureLayer(raw.architecture),
      hookConcept,
      creativeAngleId: angle.angle.id,
      creativeAngleName: angle.angle.name,
      curatorSelection: curatorSelection.selectedAngles.find(s => s.angleId === angle.angle.id)!,
      modelUsed: model,
      providerUsed: provider,
    };
  });

  onProgress?.({ step: 1, name: 'Creative Hook Generation', status: 'complete', label: `Three hooks generated: ${hooks.map((h, i) => `${String.fromCharCode(65 + i)}: "${h.hookConcept.hookTitle}"`).join(' | ')}` });

  // Phase 5: Persona validation of all 3 hooks
  onProgress?.({ step: 2, name: 'Hook Persona Validation', status: 'running', label: 'Personas evaluating hooks...' });

  const personaProfiles = await buildPersonaProfiles(personaIds, workspaceId);
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);

  let personaValidation: PersonaValidationResult[] = [];
  const hookScores = [0, 0, 0];

  if (personaProfiles.length > 0) {
    const { model: validationModel, provider: validationProvider } = await resolveFeatureModel(workspaceId, 'campaign-strategy');

    const validationPrompt = buildHookPersonaValidatorPrompt({
      hooks: hooks.map(h => ({
        hookConcept: h.hookConcept,
        strategy: JSON.stringify(h.strategy),
        architecture: JSON.stringify(h.architecture),
        creativeAngleName: h.creativeAngleName,
      })),
      personas: personaProfiles,
      goalType: campaignGoalType,
    campaignType,
      goalGuidance,
    });

    const validationRaw = await withStepContext('Phase 5 (Hook Persona Validation)', 300, () =>
      createStructuredCompletion<PersonaValidationResult[]>(
        validationProvider, validationModel,
        validationPrompt.system, validationPrompt.user,
        { temperature: 0.7, maxTokens: 16384, timeoutMs: 300_000, thinking: { anthropic: THINKING_CONFIG.anthropicValidation } },
      ),
    );

    personaValidation = normalizePersonaValidation(
      validateOrWarn(personaValidationArraySchema, validationRaw, 'Phase 5 Hook Validation'),
    );

    // Calculate per-hook scores from per-hook persona scores (hookAScore/B/C)
    if (personaValidation.length > 0) {
      const hookScoreKeys = ['hookAScore', 'hookBScore', 'hookCScore'] as const;

      for (let i = 0; i < 3; i++) {
        const key = hookScoreKeys[i];
        const scores = personaValidation
          .map(p => p[key])
          .filter((s): s is number => typeof s === 'number' && !isNaN(s));

        if (scores.length > 0) {
          hookScores[i] = scores.reduce((a, b) => a + b, 0) / scores.length;
        } else {
          // Fallback: average of overallScores when per-hook scores are missing
          const allScores = personaValidation.map(p => p.overallScore);
          hookScores[i] = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        }
      }
    }
  }

  onProgress?.({ step: 2, name: 'Hook Persona Validation', status: 'complete', label: `Validation complete — scores: A=${hookScores[0].toFixed(1)}, B=${hookScores[1].toFixed(1)}, C=${hookScores[2].toFixed(1)}` });

  return { hooks, curatorSelection, personaValidation, hookScores };
}

// ─── Phase 6: Refine Selected Hook ──────────────────────────

interface RefineSelectedHookInput extends PhaseContext {
  selectedHook: CreativeHook;
  foundation: StrategyFoundation;
  personaValidation: PersonaValidationResult[];
  hookFeedback?: string;
}

/**
 * Phase 6: Refine the user-selected hook into a production-ready proposal.
 * Uses Claude Opus with deep thinking to elevate the hook based on persona feedback.
 */
export async function refineSelectedHook(
  ctx: RefineSelectedHookInput,
  onProgress?: ProgressCallback,
): Promise<ProposalPhaseResult> {
  const { workspaceId, wizardContext, selectedHook, foundation, personaValidation, hookFeedback } = ctx;
  const strategicIntent = ctx.strategicIntent ?? 'hybrid';
  const campaignGoalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = wizardContext.campaignType;

  // Resolve persona IDs
  let personaIds = ctx.personaIds ?? [];
  if (personaIds.length === 0) {
    const all = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
    personaIds = all.map(p => p.id);
  }
  const productIds = ctx.productIds ?? [];

  // Step 1: Gather all context
  onProgress?.({ step: 1, name: 'Gathering Context', status: 'running', label: 'Gathering brand & audience context...' });

  const [brandContext, personaContext, productContext] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
  ]);

  const { model: resolvedModel, provider: resolvedProvider } = await resolveFeatureModel(workspaceId, 'campaign-strategy');

  onProgress?.({ step: 1, name: 'Gathering Context', status: 'complete', label: 'Context gathered' });

  // Step 2: Apply marketing frameworks
  onProgress?.({ step: 2, name: 'Applying Frameworks', status: 'running', label: 'Applying marketing frameworks...' });

  const refineCialdiniContext = getCialdiniContext(campaignGoalType) || undefined;
  const refineFramingContext = getFramingContext(campaignGoalType) || undefined;
  const refineGrowthContext = getGrowthContext(campaignGoalType) || undefined;
  const refineEastChecklist = formatEastForPrompt() || undefined;

  const prompt = buildHookRefinementPrompt({
    campaignName: wizardContext.campaignName,
    campaignDescription: wizardContext.campaignDescription ?? '',
    goalType: campaignGoalType,
    campaignType,
    strategicIntent,
    briefing: wizardContext.briefing,
    brandContext: formatBrandContext(brandContext),
    personaContext,
    personaIds,
    productContext,
    selectedHook,
    strategyFoundation: foundation,
    personaValidation,
    hookFeedback,
    cialdiniContext: refineCialdiniContext,
    framingContext: refineFramingContext,
    growthContext: refineGrowthContext,
    eastChecklist: refineEastChecklist,
  });

  onProgress?.({ step: 2, name: 'Applying Frameworks', status: 'complete', label: 'Marketing frameworks applied',
    preview: [refineCialdiniContext && 'Cialdini', refineFramingContext && 'Kahneman', refineGrowthContext && 'Byron Sharp', refineEastChecklist && 'EAST'].filter(Boolean).join(', '),
  });

  // Step 3: Deep AI hook refinement (the long one)
  onProgress?.({ step: 3, name: 'Deep Hook Refinement', status: 'running', label: `Refining "${selectedHook.hookConcept.hookTitle}" with deep thinking...` });

  const raw = await withStepContext('Phase 6 (Hook Refinement)', 600, () =>
    createStructuredCompletion<ProposalPhaseResult>(
      resolvedProvider, resolvedModel,
      prompt.system, prompt.user,
      { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: { anthropic: THINKING_CONFIG.anthropicSynthesis, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
    ),
  );

  onProgress?.({ step: 3, name: 'Deep Hook Refinement', status: 'complete', label: 'Hook refinement complete' });

  // Step 4: Finalize proposal
  onProgress?.({ step: 4, name: 'Finalizing Proposal', status: 'running', label: 'Packaging proposal...' });

  const result: ProposalPhaseResult = {
    strategy: raw.strategy,
    architecture: normalizeArchitectureLayer(raw.architecture),
    hookConcept: validateOrWarn(hookConceptSchema, raw.hookConcept, 'Phase 6 Refined HookConcept'),
  };

  onProgress?.({ step: 4, name: 'Finalizing Proposal', status: 'complete', label: `Proposal ready — "${result.hookConcept.hookTitle}"` });

  return result;
}

// =============================================================================
// Multi-Agent Strategy Debate — Critic, Defense & Persona Panel Rounds
// =============================================================================

/**
 * Round 2: Critic Agent reviews both variants and identifies weaknesses.
 * Uses Gemini 3.1 Pro (the model that would otherwise generate Variant C).
 */
export async function runCriticRound(
  strategyA: StrategyLayer,
  architectureA: ArchitectureLayer,
  strategyB: StrategyLayer,
  architectureB: ArchitectureLayer,
  brandContext: string,
  personaContext: string,
  goalType: string,
  workspaceId: string,
  onProgress?: ProgressCallback,
): Promise<{ critiqueOfA: AgentCritique; critiqueOfB: AgentCritique }> {
  onProgress?.({ type: 'agent_round', round: 'critique', agent: 'critic', status: 'running', label: 'Critic Agent analyzing both variants...' });

  const goalGuidance = getGoalTypeGuidance(goalType);
  const prompt = buildCriticPrompt({
    strategyA: JSON.stringify(strategyA),
    architectureA: JSON.stringify(architectureA),
    strategyB: JSON.stringify(strategyB),
    architectureB: JSON.stringify(architectureB),
    brandContext,
    personaContext,
    goalType,
    goalGuidance,
  });

  // Resolve critic model — defaults to Gemini 3.1 Pro (campaign-strategy-c feature key)
  const { model, provider } = await resolveFeatureModel(workspaceId, 'campaign-strategy-c');

  const raw = await withStepContext('Critic Round', 180, () =>
    createStructuredCompletion<{ critiqueOfA: AgentCritique; critiqueOfB: AgentCritique }>(
      provider, model,
      prompt.system, prompt.user,
      { temperature: 0.4, maxTokens: 16000, timeoutMs: 180_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
    ),
  );

  const critiqueOfA = validateOrWarn(agentCritiqueSchema, raw.critiqueOfA, 'Critic Round — Critique A') as AgentCritique;
  const critiqueOfB = validateOrWarn(agentCritiqueSchema, raw.critiqueOfB, 'Critic Round — Critique B') as AgentCritique;

  const weaknessCountA = critiqueOfA?.weaknesses?.length ?? 0;
  const weaknessCountB = critiqueOfB?.weaknesses?.length ?? 0;
  onProgress?.({
    type: 'agent_round', round: 'critique', agent: 'critic', status: 'complete',
    label: `Found ${weaknessCountA + weaknessCountB} weaknesses across both variants`,
    preview: `A: ${weaknessCountA} weaknesses, B: ${weaknessCountB} weaknesses`,
  });

  return { critiqueOfA, critiqueOfB };
}

/**
 * Round 3: Strategist and Creative defend/revise their work based on critique.
 * Runs two defense calls in parallel (one per variant).
 */
export async function runDefenseRound(
  strategyA: StrategyLayer,
  architectureA: ArchitectureLayer,
  critiqueOfA: AgentCritique,
  strategyB: StrategyLayer,
  architectureB: ArchitectureLayer,
  critiqueOfB: AgentCritique,
  brandContext: string,
  personaContext: string,
  goalType: string,
  workspaceId: string,
  onProgress?: ProgressCallback,
): Promise<{ defenseA: AgentDefense; defenseB: AgentDefense }> {
  onProgress?.({ type: 'agent_round', round: 'defense', agent: 'strategist', status: 'running', label: 'Strategist and Creative revising their work...' });

  // Resolve models for each defender — A uses campaign-strategy (Claude), B uses campaign-strategy-b (GPT)
  const [modelA, modelB] = await Promise.all([
    resolveFeatureModel(workspaceId, 'campaign-strategy'),
    resolveFeatureModel(workspaceId, 'campaign-strategy-b'),
  ]);

  const promptA = buildDefensePrompt({
    originalStrategy: JSON.stringify(strategyA),
    originalArchitecture: JSON.stringify(architectureA),
    critique: JSON.stringify(critiqueOfA),
    brandContext,
    personaContext,
    agentRole: 'strategist',
    variant: 'A',
    goalType,
  });

  const promptB = buildDefensePrompt({
    originalStrategy: JSON.stringify(strategyB),
    originalArchitecture: JSON.stringify(architectureB),
    critique: JSON.stringify(critiqueOfB),
    brandContext,
    personaContext,
    agentRole: 'creative',
    variant: 'B',
    goalType,
  });

  const [defenseARaw, defenseBRaw] = await Promise.all([
    withStepContext('Defense Round — Variant A', 180, () =>
      createStructuredCompletion<AgentDefense>(
        modelA.provider, modelA.model,
        promptA.system, promptA.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 180_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
    withStepContext('Defense Round — Variant B', 180, () =>
      createStructuredCompletion<AgentDefense>(
        modelB.provider, modelB.model,
        promptB.system, promptB.user,
        { temperature: 0.4, maxTokens: 24000, timeoutMs: 180_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
      ),
    ),
  ]);

  // Normalize revised architectures
  const defenseA: AgentDefense = {
    ...defenseARaw,
    revisedArchitecture: normalizeArchitectureLayer(defenseARaw.revisedArchitecture),
    revisedStrategy: validateOrWarn(strategyLayerSchema, defenseARaw.revisedStrategy, 'Defense A — Revised Strategy') as StrategyLayer,
  };
  const defenseB: AgentDefense = {
    ...defenseBRaw,
    revisedArchitecture: normalizeArchitectureLayer(defenseBRaw.revisedArchitecture),
    revisedStrategy: validateOrWarn(strategyLayerSchema, defenseBRaw.revisedStrategy, 'Defense B — Revised Strategy') as StrategyLayer,
  };

  const changesA = defenseA.changeLog?.length ?? 0;
  const changesB = defenseB.changeLog?.length ?? 0;
  onProgress?.({
    type: 'agent_round', round: 'defense', agent: 'strategist', status: 'complete',
    label: `Variants revised — ${changesA + changesB} changes made`,
    preview: `A: ${changesA} changes, B: ${changesB} changes`,
  });

  return { defenseA, defenseB };
}

/**
 * Round 4: Persona Panel evaluates the revised variants with deep persona simulation.
 * Uses Claude Sonnet for nuanced persona roleplay.
 */
export async function runPersonaPanelRound(
  defenseA: AgentDefense,
  defenseB: AgentDefense,
  critiqueOfA: AgentCritique,
  critiqueOfB: AgentCritique,
  personaProfiles: Array<{ id: string; name: string; profile: string }>,
  brandContext: string,
  goalType: string,
  workspaceId: string,
  onProgress?: ProgressCallback,
): Promise<PersonaDebateResult[]> {
  if (personaProfiles.length === 0) return [];

  onProgress?.({ type: 'agent_round', round: 'persona_panel', agent: 'persona_panel', status: 'running', label: `Simulating ${personaProfiles.length} persona reactions...` });

  const personasText = personaProfiles.map(p => `### ${p.name} (ID: ${p.id})\n${p.profile}`).join('\n\n');

  const prompt = buildPersonaPanelPrompt({
    revisedStrategyA: JSON.stringify(defenseA.revisedStrategy),
    revisedArchitectureA: JSON.stringify(defenseA.revisedArchitecture),
    revisedStrategyB: JSON.stringify(defenseB.revisedStrategy),
    revisedArchitectureB: JSON.stringify(defenseB.revisedArchitecture),
    critiqueOfA: JSON.stringify(critiqueOfA),
    critiqueOfB: JSON.stringify(critiqueOfB),
    defenseA: JSON.stringify({ addressedWeaknesses: defenseA.addressedWeaknesses, changeLog: defenseA.changeLog }),
    defenseB: JSON.stringify({ addressedWeaknesses: defenseB.addressedWeaknesses, changeLog: defenseB.changeLog }),
    personas: personasText,
    brandContext,
    goalType,
  });

  // Use Claude Sonnet for nuanced persona simulation
  const raw = await withStepContext('Persona Panel Round', 120, () =>
    createClaudeStructuredCompletion<{ personaDebate: PersonaDebateResult[] }>(
      prompt.system, prompt.user,
      { model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 16000, timeoutMs: 120_000, thinking: { budgetTokens: THINKING_CONFIG.anthropicValidation.budgetTokens } },
    ),
  );

  const results = (raw.personaDebate ?? []).map(pd =>
    validateOrWarn(personaDebateResultSchema, pd, `Persona Panel — ${pd?.personaName ?? 'unknown'}`) as PersonaDebateResult,
  );

  const preferA = results.filter(r => r.preferredVariant === 'A').length;
  const preferB = results.filter(r => r.preferredVariant === 'B').length;
  const dealbreakers = results.filter(r => r.dealbreaker).length;

  onProgress?.({
    type: 'agent_round', round: 'persona_panel', agent: 'persona_panel', status: 'complete',
    label: `Personas voted: ${preferA} prefer A, ${preferB} prefer B${dealbreakers > 0 ? `, ${dealbreakers} dealbreaker(s)` : ''}`,
    preview: results.map(r => `${r.personaName}: ${r.preferredVariant}`).join(', '),
  });

  return results;
}

/**
 * Orchestrates the full multi-agent debate flow: Critic → Defense → Persona Panel.
 * Called after initial variant generation (Round 1) when multiAgent is enabled.
 * Returns enriched context for the Synthesizer.
 */
export async function runMultiAgentDebate(
  strategyA: StrategyLayer,
  architectureA: ArchitectureLayer,
  strategyB: StrategyLayer,
  architectureB: ArchitectureLayer,
  ctx: PhaseContext,
  brandContext: string,
  personaContext: string,
  personaProfiles: Array<{ id: string; name: string; profile: string }>,
  onProgress?: ProgressCallback,
): Promise<{
  critiqueOfA: AgentCritique;
  critiqueOfB: AgentCritique;
  defenseA: AgentDefense;
  defenseB: AgentDefense;
  personaDebate: PersonaDebateResult[];
}> {
  const goalType = ctx.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';

  // Round 2: Critic reviews both variants
  const { critiqueOfA, critiqueOfB } = await runCriticRound(
    strategyA, architectureA, strategyB, architectureB,
    brandContext, personaContext, goalType, ctx.workspaceId, onProgress,
  );

  // Round 3: Strategist and Creative defend/revise
  const { defenseA, defenseB } = await runDefenseRound(
    strategyA, architectureA, critiqueOfA,
    strategyB, architectureB, critiqueOfB,
    brandContext, personaContext, goalType, ctx.workspaceId, onProgress,
  );

  // Round 4: Persona Panel evaluates revised variants
  const personaDebate = await runPersonaPanelRound(
    defenseA, defenseB, critiqueOfA, critiqueOfB,
    personaProfiles, brandContext, goalType, ctx.workspaceId, onProgress,
  );

  return { critiqueOfA, critiqueOfB, defenseA, defenseB, personaDebate };
}

// =============================================================================
// NEW CREATIVE QUALITY PIPELINE — Insight Mining → Creative Leap → Strategy Build
// =============================================================================

import {
  buildInsightMiningPrompt,
  buildCreativeLeapPrompt,
  buildStrategyBuildPrompt,
} from '@/lib/ai/prompts/campaign-strategy';
import {
  buildCreativeCriticPrompt,
  buildCreativeDefensePrompt,
} from '@/lib/ai/prompts/campaign-strategy-agents';
import { selectTemplatesForGoal } from '@/lib/goldenberg/goldenberg-templates';
import { selectDomainsForBrand } from '@/lib/goldenberg/bisociation-domains';
import type { HumanInsight, CreativeConcept, InsightMiningResult, CreativeLeapResult } from './strategy-blueprint.types';

/** Build provider-keyed thinking config from a provider string and budget */
function thinkingFor(provider: string, budget: number): { anthropic?: { budgetTokens: number }; openai?: { reasoningEffort: 'high' }; google?: { thinkingBudget: number } } | undefined {
  if (provider === 'anthropic') return { anthropic: { budgetTokens: budget } };
  if (provider === 'openai') return { openai: { reasoningEffort: 'high' } };
  if (provider === 'google') return { google: { thinkingBudget: budget } };
  return undefined;
}

/** Shared context needed across new pipeline phases */
interface CreativePipelineContext {
  workspaceId: string;
  brandContext: string;
  personaContext: string;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  goalType: string;
  briefing?: CampaignBriefing;
  strategicIntent: StrategicIntent;
  personaIds: string[];
  arenaContext?: string;
  exaContext?: string;
}

/**
 * Build the shared context object needed by all creative pipeline phases.
 * Reuses existing context builders (brand, persona, product, competitor, trend).
 */
export async function buildCreativePipelineContext(
  workspaceId: string,
  opts: GenerateOptions,
  onProgress?: ProgressCallback,
): Promise<CreativePipelineContext> {
  const wc = opts.wizardContext!;
  const goalType = wc.campaignGoalType ?? 'BRAND_AWARENESS';

  // Parallel context fetching
  const [brandContextData, personaContext, productContext, competitorContext, trendContext] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(opts.personaIds ?? [], workspaceId),
    buildProductContext(workspaceId, opts.productIds),
    buildCompetitorContext(workspaceId, opts.competitorIds),
    buildTrendContext(workspaceId, opts.trendIds),
  ]);
  const brandContext = formatBrandContext(brandContextData);

  // Optional external enrichment (Are.na + Exa only — Scholar/BCT used in strategy build phase)
  let arenaContext: string | undefined;
  let exaContext: string | undefined;

  if (wc.useExternalEnrichment) {
    onProgress?.({ type: 'enrichment', status: 'running' } as PipelineEvent);

    try {
      const [arenaQueries, exaQueries] = await Promise.all([
        buildArenaQueries({ workspaceId, campaignGoalType: goalType, personaIds: opts.personaIds ?? [] }).catch(() => []),
        Promise.resolve(buildExaQueries({ campaignGoalType: goalType, brandName: brandContextData.brandName, brandValues: brandContextData.brandValues })),
      ]);

      const [arenaResult, exaResult] = await Promise.all([
        fetchArenaContext(arenaQueries).catch(() => ({ contextText: '', meta: null })),
        fetchExaContext(exaQueries).catch(() => ({ contextText: '', meta: null })),
      ]);

      if (arenaResult?.contextText) arenaContext = arenaResult.contextText;
      if (exaResult?.contextText) exaContext = exaResult.contextText;
    } catch { /* graceful failure — enrichment is optional */ }

    onProgress?.({ type: 'enrichment', status: 'complete' } as PipelineEvent);
  }

  return {
    workspaceId,
    brandContext,
    personaContext,
    productContext,
    competitorContext,
    trendContext,
    goalType,
    briefing: wc.briefing,
    strategicIntent: opts.strategicIntent ?? 'hybrid',
    personaIds: opts.personaIds ?? [],
    arenaContext,
    exaContext,
  };
}

// ─── Phase 1: Insight Mining ─────────────────────────────────

/**
 * Generates 3 human insights in parallel using 3 different LLMs,
 * each with a different insight lens (empathy, tension, behavior).
 */
export async function generateInsights(
  ctx: CreativePipelineContext,
  onProgress?: ProgressCallback,
): Promise<InsightMiningResult> {
  onProgress?.({ type: 'step', step: 1, name: 'Insight Mining', status: 'running', label: 'Mining 3 human insights...' } as PipelineEvent);

  const lenses: Array<{ role: 'empathy' | 'tension' | 'behavior'; provider: string; model: string }> = [
    { role: 'empathy', provider: 'anthropic', model: CLAUDE_OPUS },
    { role: 'tension', provider: 'openai', model: GPT_54 },
    { role: 'behavior', provider: 'google', model: GEMINI_31_PRO },
  ];

  // Resolve workspace-level model overrides
  const [modelA, modelB, modelC] = await Promise.all([
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy'),
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy-b'),
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy-c'),
  ]);

  lenses[0].provider = modelA.provider;
  lenses[0].model = modelA.model;
  lenses[1].provider = modelB.provider;
  lenses[1].model = modelB.model;
  lenses[2].provider = modelC.provider;
  lenses[2].model = modelC.model;

  const insightPromises = lenses.map(async (lens) => {
    const prompt = buildInsightMiningPrompt({
      brandContext: ctx.brandContext,
      personaContext: ctx.personaContext,
      productContext: ctx.productContext,
      competitorContext: ctx.competitorContext,
      trendContext: ctx.trendContext,
      goalType: ctx.goalType,
      briefing: ctx.briefing,
      providerRole: lens.role,
    });

    const result = await withStepContext(`Insight Mining (${lens.role})`, 120, () =>
      createStructuredCompletion(
        lens.provider as AiProvider,
        lens.model,
        prompt.system,
        prompt.user,
        { maxTokens: 16000, thinking: thinkingFor(lens.provider, 8000) },
      ),
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      ...parsed,
      providerUsed: lens.provider,
      modelUsed: lens.model,
    } as HumanInsight;
  });

  const insights = await Promise.all(insightPromises);

  onProgress?.({ type: 'step', step: 1, name: 'Insight Mining', status: 'complete', label: '3 insights generated' } as PipelineEvent);

  return { insights, selectedInsightIndex: null };
}

// ─── Phase 2a: Creative Leap ────────────────────────────────

/**
 * Generates 3 creative concepts in parallel, each forced into a different
 * Goldenberg template + bisociation domain, all building on the selected insight.
 */
export async function generateCreativeConcepts(
  ctx: CreativePipelineContext,
  selectedInsight: HumanInsight,
  onProgress?: ProgressCallback,
): Promise<CreativeLeapResult> {
  onProgress?.({ type: 'step', step: 1, name: 'Creative Leap', status: 'running', label: 'Generating 3 creative concepts...' } as PipelineEvent);

  // Select 3 diverse Goldenberg templates for this goal type
  const templates = selectTemplatesForGoal(ctx.goalType);

  // Extract brand industry from brand context (first line often has industry info)
  const industryLine = ctx.brandContext.split('\n').find(l => l.toLowerCase().includes('industry') || l.toLowerCase().includes('sector'));
  const brandIndustry = industryLine?.split(':').pop()?.trim() ?? 'general';

  // Select 3 diverse bisociation domains avoiding the brand's own industry
  const domains = selectDomainsForBrand(brandIndustry);

  const insightText = `Insight: "${selectedInsight.insightStatement}"
Underlying tension: ${selectedInsight.underlyingTension}
Emotional territory: ${selectedInsight.emotionalTerritory}
Category convention: ${selectedInsight.categoryConvention}
Human truth: ${selectedInsight.humanTruth}`;

  // Resolve models
  const [modelA, modelB, modelC] = await Promise.all([
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy'),
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy-b'),
    resolveFeatureModel(ctx.workspaceId, 'campaign-strategy-c'),
  ]);

  const assignments = [
    { template: templates[0], domain: domains[0], provider: modelA.provider, model: modelA.model },
    { template: templates[1], domain: domains[1], provider: modelB.provider, model: modelB.model },
    { template: templates[2], domain: domains[2], provider: modelC.provider, model: modelC.model },
  ];

  const conceptPromises = assignments.map(async (a) => {
    const prompt = buildCreativeLeapPrompt({
      selectedInsight: insightText,
      brandContext: ctx.brandContext,
      personaContext: ctx.personaContext,
      goalType: ctx.goalType,
      goldenbergTemplate: {
        name: a.template.name,
        mechanism: a.template.mechanism,
        examples: a.template.examples.map(e => `${e.brand}: ${e.howItApplied}`).join('; '),
      },
      bisociationDomain: {
        name: a.domain.name,
        visualMetaphors: a.domain.visualMetaphors.join(', '),
        emotionalTerritories: a.domain.emotionalTerritories.join(', '),
      },
      briefing: ctx.briefing,
      arenaContext: ctx.arenaContext,
      exaContext: ctx.exaContext,
    });

    const result = await withStepContext(`Creative Leap (${a.template.name} × ${a.domain.name})`, 120, () =>
      createStructuredCompletion(
        a.provider as AiProvider,
        a.model,
        prompt.system,
        prompt.user,
        { maxTokens: 16000, thinking: thinkingFor(a.provider, 12_000) },
      ),
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      ...parsed,
      providerUsed: a.provider,
      modelUsed: a.model,
    } as CreativeConcept;
  });

  const concepts = await Promise.all(conceptPromises);

  onProgress?.({ type: 'step', step: 1, name: 'Creative Leap', status: 'complete', label: '3 concepts generated' } as PipelineEvent);

  return { concepts, selectedConceptIndex: null, selectedInsight };
}

// ─── Phase 2b: Creative Debate ──────────────────────────────

/**
 * Runs the creative quality debate on a selected concept:
 * 1. Creative Critic evaluates stickiness, bisociation, campaign line
 * 2. Creative Director defends/improves the concept
 * Returns the improved concept + critique data.
 */
export async function runCreativeDebate(
  ctx: CreativePipelineContext,
  selectedConcept: CreativeConcept,
  selectedInsight: HumanInsight,
  onProgress?: ProgressCallback,
): Promise<{ critique: unknown; defense: unknown; improvedConcept: CreativeConcept }> {
  const goalType = ctx.goalType;
  const conceptJson = JSON.stringify(selectedConcept, null, 2);
  const insightJson = JSON.stringify(selectedInsight, null, 2);

  // Round 1: Creative Critic
  onProgress?.({ type: 'step', step: 1, name: 'Creative Critic', status: 'running', label: 'Evaluating creative quality...' } as PipelineEvent);

  const criticPrompt = buildCreativeCriticPrompt({
    conceptJson,
    insightJson,
    brandContext: ctx.brandContext,
    personaContext: ctx.personaContext,
    goalType,
  });

  const { model: criticModel, provider: criticProvider } = await resolveFeatureModel(ctx.workspaceId, 'campaign-strategy');
  const critiqueRaw = await withStepContext('Creative Critic', 120, () =>
    createStructuredCompletion(
      criticProvider as AiProvider,
      criticModel,
      criticPrompt.system,
      criticPrompt.user,
      { maxTokens: 16000, thinking: thinkingFor(criticProvider, 10_000) },
    ),
  );
  const critique = typeof critiqueRaw === 'string' ? JSON.parse(critiqueRaw) : critiqueRaw;

  onProgress?.({ type: 'step', step: 1, name: 'Creative Critic', status: 'complete', label: 'Creative audit complete' } as PipelineEvent);

  // Round 2: Creative Defense
  onProgress?.({ type: 'step', step: 2, name: 'Creative Defense', status: 'running', label: 'Creative Director improving concept...' } as PipelineEvent);

  const defensePrompt = buildCreativeDefensePrompt({
    conceptJson,
    insightJson,
    critiqueJson: JSON.stringify(critique, null, 2),
    brandContext: ctx.brandContext,
    personaContext: ctx.personaContext,
    goalType,
  });

  const { model: defenseModel, provider: defenseProvider } = await resolveFeatureModel(ctx.workspaceId, 'campaign-strategy-b');
  const defenseRaw = await withStepContext('Creative Defense', 120, () =>
    createStructuredCompletion(
      defenseProvider as AiProvider,
      defenseModel,
      defensePrompt.system,
      defensePrompt.user,
      { maxTokens: 16000, thinking: thinkingFor(defenseProvider, 12_000) },
    ),
  );
  const defense = typeof defenseRaw === 'string' ? JSON.parse(defenseRaw) : defenseRaw;

  onProgress?.({ type: 'step', step: 2, name: 'Creative Defense', status: 'complete', label: 'Concept improved' } as PipelineEvent);

  // Extract the improved concept from the defense response
  const improvedConcept: CreativeConcept = {
    ...selectedConcept,
    ...(defense.revisedConcept ?? {}),
    providerUsed: defenseProvider,
    modelUsed: defenseModel,
  };

  return { critique, defense, improvedConcept };
}

// ─── Phase 3: Strategy Build (concept-first) ────────────────

/**
 * Builds the full strategy + architecture ON TOP of an approved creative concept.
 * Frameworks serve the concept, not the other way around.
 */
export async function buildConceptDrivenStrategy(
  ctx: CreativePipelineContext,
  approvedConcept: CreativeConcept,
  approvedInsight: HumanInsight,
  debateContext?: string,
  onProgress?: ProgressCallback,
): Promise<{ strategy: StrategyLayer; architecture: ArchitectureLayer }> {
  onProgress?.({ type: 'step', step: 1, name: 'Strategy Build', status: 'running', label: 'Building strategy from approved concept...' } as PipelineEvent);

  const goalType = ctx.goalType;

  // Gather local marketing frameworks (synchronous, no API calls)
  const bctContext = getBctContext(goalType);
  const cialdiniContext = getCialdiniContext(goalType);
  const effectivenessContext = getEffectivenessContext(goalType);
  const growthContext = getGrowthContext(goalType);
  const framingContext = getFramingContext(goalType);
  const eastChecklist = formatEastForPrompt();

  const insightText = `Insight: "${approvedInsight.insightStatement}"
Underlying tension: ${approvedInsight.underlyingTension}
Human truth: ${approvedInsight.humanTruth}`;

  const conceptText = `Campaign Line: "${approvedConcept.campaignLine}"
Big Idea: ${approvedConcept.bigIdea}
Creative Territory: ${approvedConcept.creativeTerritory}
Visual World: ${approvedConcept.visualWorld}
Memorable Device: ${approvedConcept.memorableDevice}
Goldenberg Template: ${approvedConcept.goldenbergTemplate} — ${approvedConcept.goldenbergApplication}
Bisociation: ${approvedConcept.bisociationDomain.domain} — ${approvedConcept.bisociationDomain.connectionToInsight}`;

  const prompt = buildStrategyBuildPrompt({
    selectedInsight: insightText,
    selectedConcept: conceptText,
    brandContext: ctx.brandContext,
    personaContext: ctx.personaContext,
    productContext: ctx.productContext,
    competitorContext: ctx.competitorContext,
    trendContext: ctx.trendContext,
    goalType,
    strategicIntent: ctx.strategicIntent,
    personaIds: ctx.personaIds,
    briefing: ctx.briefing,
    debateContext,
    effectivenessContext,
    growthContext,
    framingContext,
    eastChecklist,
    cialdiniContext,
    bctContext,
  });

  const { model, provider } = await resolveFeatureModel(ctx.workspaceId, 'campaign-strategy');

  const result = await withStepContext('Strategy Build', 180, () =>
    createStructuredCompletion(
      provider as AiProvider,
      model,
      prompt.system,
      prompt.user,
      { maxTokens: 32000, thinking: thinkingFor(provider, 20_000) },
    ),
  );

  const parsed = typeof result === 'string' ? JSON.parse(result) : result;

  // Ensure the concept fields are preserved on the strategy layer
  const strategy: StrategyLayer = {
    ...parsed.strategy,
    humanInsight: approvedInsight.insightStatement,
    creativePlatform: approvedConcept.bigIdea,
    creativeTerritory: approvedConcept.creativeTerritory,
    memorableDevice: approvedConcept.memorableDevice,
    campaignTheme: approvedConcept.campaignLine,
  };

  const architecture: ArchitectureLayer = parsed.architecture ?? { campaignType: 'strategic', journeyPhases: [] };

  onProgress?.({ type: 'step', step: 1, name: 'Strategy Build', status: 'complete', label: 'Strategy built on approved concept' } as PipelineEvent);

  return { strategy, architecture };
}

// ─── Phase: Concept Visuals ─────────────────────────────────

/** Words that indicate product-related content in a visual description */
const PRODUCT_KEYWORDS = ['product', 'item', 'package', 'bottle', 'device', 'object', 'merchandise', 'goods', 'unboxing'];
/** Words that indicate people-related content in a visual description */
const PERSON_KEYWORDS = ['person', 'people', 'human', 'face', 'portrait', 'model', 'crowd', 'team', 'customer', 'audience', 'man', 'woman'];

/**
 * Generates 3 campaign mockup visuals (hero/square/story) for a selected creative concept.
 * Automatically applies trained brand LoRA models when available.
 */
export async function generateConceptVisuals(
  ctx: CreativePipelineContext,
  concept: CreativeConcept,
  onProgress?: ProgressCallback,
): Promise<ConceptVisualsResult> {
  onProgress?.({ type: 'step', step: 1, name: 'Concept Visuals', status: 'running', label: 'Generating campaign mockup visuals...' } as PipelineEvent);

  // 1. Query workspace's READY ConsistentModel records with LoRA URLs (trainable types only)
  const consistentModels = await prisma.consistentModel.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      status: 'READY',
      falLoraUrl: { not: null },
      type: { in: ['STYLE', 'PHOTOGRAPHY', 'PRODUCT', 'PERSON'] },
    },
    select: { id: true, name: true, type: true, falLoraUrl: true },
  });

  // 2. Determine which models are relevant based on concept content
  const visualText = `${concept.visualWorld} ${concept.creativeTerritory}`.toLowerCase();

  const relevantModels: Array<{ name: string; type: string; scale: number; loraUrl: string }> = [];
  for (const model of consistentModels) {
    const modelType = model.type as string;
    if (modelType === 'STYLE') {
      relevantModels.push({ name: model.name, type: modelType, scale: 0.8, loraUrl: model.falLoraUrl! });
    } else if (modelType === 'PHOTOGRAPHY') {
      relevantModels.push({ name: model.name, type: modelType, scale: 0.7, loraUrl: model.falLoraUrl! });
    } else if (modelType === 'PRODUCT' && PRODUCT_KEYWORDS.some(kw => visualText.includes(kw))) {
      relevantModels.push({ name: model.name, type: modelType, scale: 0.6, loraUrl: model.falLoraUrl! });
    } else if (modelType === 'PERSON' && PERSON_KEYWORDS.some(kw => visualText.includes(kw))) {
      relevantModels.push({ name: model.name, type: modelType, scale: 0.5, loraUrl: model.falLoraUrl! });
    }
  }

  const hasLoras = relevantModels.length > 0;
  const loraArray = relevantModels.map(m => ({ path: m.loraUrl, scale: m.scale }));
  const appliedModelsInfo = relevantModels.map(m => ({ name: m.name, type: m.type, scale: m.scale }));

  // 3. Build prompts for 3 formats
  const noTextSuffix = ' --no text, no words, no letters, no typography';

  const baseContext = `${concept.visualWorld}. Creative territory: ${concept.creativeTerritory}`;

  const formats: Array<{
    format: 'hero' | 'square' | 'story';
    imageSize: string;
    width: number;
    height: number;
    promptPrefix: string;
  }> = [
    {
      format: 'hero',
      imageSize: 'landscape_16_9',
      width: 1344,
      height: 768,
      promptPrefix: 'Wide cinematic establishing shot,',
    },
    {
      format: 'square',
      imageSize: 'square_hd',
      width: 1024,
      height: 1024,
      promptPrefix: 'Close-up detail shot for social media,',
    },
    {
      format: 'story',
      imageSize: 'portrait_9_16',
      width: 768,
      height: 1344,
      promptPrefix: 'Vertical portrait action shot for stories/reels,',
    },
  ];

  // Import fal client and storage dynamically to keep top-level imports clean
  const { runFalGeneration, generateFalImage } = await import('@/lib/integrations/fal/fal-client');
  const { getStorageProvider } = await import('@/lib/storage');

  const storage = getStorageProvider();

  // 4. Generate images in parallel
  const visualPromises = formats.map(async (f) => {
    const prompt = `${f.promptPrefix} ${baseContext}${noTextSuffix}`;

    let imageUrl: string;

    if (hasLoras) {
      const result = await runFalGeneration('fal-ai/flux-lora', {
        prompt,
        loras: loraArray,
        image_size: { width: f.width, height: f.height },
        num_images: 1,
      });
      imageUrl = result.images[0]?.url ?? '';
    } else {
      const result = await runFalGeneration('fal-ai/flux-2-pro', {
        prompt,
        image_size: { width: f.width, height: f.height },
        num_images: 1,
      });
      imageUrl = result.images[0]?.url ?? '';
    }

    if (!imageUrl) {
      throw new Error(`Failed to generate ${f.format} image — no URL returned from fal.ai`);
    }

    // 5. Download from fal URL and upload to storage
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to download ${f.format} image from fal.ai`);
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

    const timestamp = Date.now();
    const uploaded = await storage.upload(imgBuffer, {
      workspaceId: ctx.workspaceId,
      fileName: `concept-visual-${f.format}-${timestamp}.png`,
      contentType: 'image/png',
    });

    return {
      format: f.format,
      imageUrl: uploaded.url,
      prompt,
      width: f.width,
      height: f.height,
      appliedModels: appliedModelsInfo,
    } satisfies ConceptVisual;
  });

  const visuals = await Promise.all(visualPromises);

  onProgress?.({ type: 'step', step: 1, name: 'Concept Visuals', status: 'complete', label: `${visuals.length} campaign visuals generated` } as PipelineEvent);

  return { visuals, concept };
}
