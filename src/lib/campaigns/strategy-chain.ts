// =============================================================================
// Campaign Strategy Blueprint — Prompt Chain Orchestrator
// Contains: briefing validation, strategy foundation, elaborateJourney (channel+asset plans),
// regenerateBlueprintLayer, CQP creative quality pipeline (insights → concepts → debate → strategy → visuals)
// Legacy 3-variant pipeline functions removed — see CQP pipeline below
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
  buildChannelPlannerPrompt,
  buildAssetPlannerPrompt,
  buildBriefingValidationPrompt,
  buildStrategyFoundationPrompt,
  buildJourneyPhasesPrompt,
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
  channelPlanResponseSchema,
  assetPlanResponseSchema,
  journeyPhasesResponseSchema,
  briefingValidationSchema,
  strategyFoundationSchema,
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
  JourneyPhaseResult,
  BriefingValidation,
  ImprovedBriefing,
  StrategyFoundation,
  EnrichmentContext,
} from './strategy-blueprint.types';
import type { PipelineEvent } from '@/features/campaigns/types/campaign-wizard.types';
import type { PipelineConfig, ModelRigor } from '@/features/campaigns/lib/pipeline-config';

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

// ─── Model Rigor helpers ─────────────────────────────────────
// Maps the user-facing ModelRigor dial to concrete model IDs and thinking
// budgets per phase. Called by every LLM-heavy chain function.

/** Multiplier applied to base thinking budgets by rigor tier. */
const RIGOR_THINKING_MULTIPLIER: Record<ModelRigor, number> = {
  fast: 0,         // no extended thinking
  balanced: 0.4,   // ~40% of the 'deliberate' budget
  deliberate: 1.0, // full budget
};

/**
 * Fast-tier fallbacks per provider. Used when ModelRigor === 'fast'.
 * These override whatever the user has set in Settings > AI Models for
 * the strategy feature keys — fast is always fast.
 */
const FAST_TIER_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5.4-mini',
  google: GEMINI_FLASH,
};

/**
 * Balanced-tier fallbacks per provider. Used when ModelRigor === 'balanced'.
 */
const BALANCED_TIER_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: GPT_54,
  google: 'gemini-3.1-flash-lite-preview',
};

/**
 * Resolve model + provider for a given feature and rigor tier.
 * - 'deliberate' respects workspace AI Models settings (user's choice wins)
 * - 'balanced' downgrades to the balanced tier fallback for the provider
 * - 'fast' forces the fast tier fallback
 */
async function resolveModelForRigor(
  workspaceId: string,
  featureKey: Parameters<typeof resolveFeatureModel>[1],
  rigor: ModelRigor,
): Promise<{ provider: AiProvider; model: string }> {
  const base = await resolveFeatureModel(workspaceId, featureKey);
  if (rigor === 'deliberate') return base;
  const table = rigor === 'fast' ? FAST_TIER_MODELS : BALANCED_TIER_MODELS;
  return { provider: base.provider, model: table[base.provider] };
}

/**
 * Build a provider-keyed thinking config scaled by rigor tier.
 * At 'fast' tier returns undefined (no thinking at all).
 */
function thinkingForRigor(
  provider: string,
  baseBudget: number,
  rigor: ModelRigor,
): { anthropic?: { budgetTokens: number }; openai?: { reasoningEffort: 'low' | 'medium' | 'high' }; google?: { thinkingBudget: number } } | undefined {
  const multiplier = RIGOR_THINKING_MULTIPLIER[rigor];
  if (multiplier === 0) return undefined;
  const budget = Math.round(baseBudget * multiplier);
  if (provider === 'anthropic') return { anthropic: { budgetTokens: budget } };
  if (provider === 'openai') {
    // OpenAI uses reasoning_effort enum, map our numeric rigor
    return { openai: { reasoningEffort: rigor === 'deliberate' ? 'high' : 'medium' } };
  }
  if (provider === 'google') return { google: { thinkingBudget: budget } };
  return undefined;
}

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
  selectedContentType?: string;
  briefing?: CampaignBriefing;
  useExternalEnrichment?: boolean;
  selectedDeliverables?: { type: string; quantity: number }[];
}

interface GenerateOptions {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  trendIds?: string[];
  strategicIntent?: StrategicIntent;
  /** When provided, the pipeline runs without a DB campaign lookup */
  wizardContext?: WizardContext;
  /** Pipeline configuration (strategy depth / creative range / model rigor) */
  pipelineConfig?: PipelineConfig;
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
  /**
   * Pipeline configuration dictating strategy depth, creative range and
   * model rigor. When undefined the phase defaults to the equivalent of
   * the "Standard" preset (grounded / multi-variant / balanced).
   */
  pipelineConfig?: PipelineConfig;
}



// (function bodies removed — see comment above)

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
  const selectedContentType = data.wizardContext.selectedContentType;
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

  // Step 4.5: Generate journey phases when missing
  // This happens in quick-concept mode (hardcoded empty) and when the strategy
  // build AI truncates the architecture object.
  let architecture = data.synthesizedArchitecture;
  if (!architecture.journeyPhases || architecture.journeyPhases.length === 0) {
    onProgress?.({ step: 4, name: 'Journey Phases', status: 'running', label: 'Generating journey phases...' } as PipelineEvent);

    const jpPrompt = buildJourneyPhasesPrompt({
      synthesizedStrategy: synthesizedStrategyJson,
      goalType: campaignGoalType,
      personaIds,
      briefing: data.wizardContext.briefing,
    });

    const jpRaw = await withStepContext('Step 4.5 (Journey Phases — Gemini)', 60, () =>
      createGeminiStructuredCompletion<ArchitectureLayer>(
        jpPrompt.system, jpPrompt.user,
        { model: GEMINI_FLASH, temperature: 0.3, maxOutputTokens: 8000, timeoutMs: 60_000, responseSchema: journeyPhasesResponseSchema },
      ),
    );

    const generatedPhases = (jpRaw as ArchitectureLayer)?.journeyPhases ?? [];
    if (generatedPhases.length > 0) {
      architecture = { ...architecture, journeyPhases: generatedPhases };
    } else {
      console.warn('[elaborateJourney] Journey phase generation returned 0 phases — downstream plans will lack phase context');
    }

    onProgress?.({ step: 4, name: 'Journey Phases', status: 'complete', label: `${architecture.journeyPhases?.length ?? 0} journey phases generated` } as PipelineEvent);
  }

  const synthesizedArchitectureJson = JSON.stringify(architecture);

  // Step 5: Channel Planner
  onProgress?.({ step: 5, name: 'Channel Planner', status: 'running', label: 'Planning channel strategy...' } as PipelineEvent);

  const step5Prompt = buildChannelPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    personaChannelPrefs,
    goalType: campaignGoalType,
    campaignType,
    selectedContentType,
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

  const phaseNames = (architecture.journeyPhases ?? []).map((p: { name: string }) => p.name);

  const step6Prompt = buildAssetPlannerPrompt({
    synthesizedStrategy: synthesizedStrategyJson,
    synthesizedArchitecture: synthesizedArchitectureJson,
    channelPlan: JSON.stringify(channelPlan),
    productContext,
    styleguideContext,
    goalType: campaignGoalType,
    campaignType,
    selectedContentType,
    goalGuidance,
    journeyPhaseNames: phaseNames,
    cialdiniContext: journeyCialdiniContext,
    framingContext: journeyFramingContext,
    growthContext: journeyGrowthContext,
    eastChecklist: journeyEastChecklist,
    selectedDeliverables: data.wizardContext.selectedDeliverables,
  });

  const assetPlanRaw = await withStepContext('Step 6 (Asset Planner — Gemini)', 120, () =>
    createGeminiStructuredCompletion<AssetPlanLayer>(
      step6Prompt.system, step6Prompt.user,
      { model: GEMINI_FLASH, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 120_000, responseSchema: assetPlanResponseSchema },
    ),
  );
  const assetPlan = validateOrWarn(assetPlanLayerSchema, assetPlanRaw, 'Step 6 Asset Plan');
  onProgress?.({ step: 6, name: 'Asset Planner', status: 'complete', label: 'Asset plan complete', preview: `${assetPlan.totalDeliverables} deliverables` });

  // Return architecture when journey phases were auto-generated so the caller
  // can update the store with the enriched architecture.
  const architectureChanged = architecture !== data.synthesizedArchitecture;
  return { channelPlan, assetPlan, ...(architectureChanged ? { architecture } : {}) };
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
  const selectedContentType = wizardContext.selectedContentType;

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
    selectedContentType,
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

  const result = await withStepContext('Phase 1c (Improve Briefing)', 60, () =>
    createStructuredCompletion<ImprovedBriefing>(
      'google', GEMINI_FLASH,
      systemPrompt, userPrompt,
      { temperature: 0.5, maxTokens: 8192, timeoutMs: 60_000 },
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
  const selectedContentType = wizardContext.selectedContentType;

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

  // Resolve strategy foundation model scaled by ModelRigor.
  // 'deliberate' keeps the workspace's configured model (default: Opus),
  // 'balanced' downgrades to Sonnet tier, 'fast' forces Haiku/Flash.
  const rigor = ctx.pipelineConfig?.modelRigor ?? 'balanced';
  const { model: resolvedModel, provider: resolvedProvider } = await resolveModelForRigor(workspaceId, 'campaign-strategy', rigor);

  // Step 3: Deep AI analysis (the long one)
  onProgress?.({ step: 3, name: 'Deep Analysis', status: 'running', label: 'Building behavioral analysis...' });

  const prompt = buildStrategyFoundationPrompt({
    campaignName: wizardContext.campaignName,
    campaignDescription: wizardContext.campaignDescription ?? '',
    goalType: campaignGoalType,
    campaignType,
    selectedContentType,
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

  // Scale thinking budget by rigor. Base 16k maps to Deliberate's full 16k;
  // Balanced gets ~6k; Fast skips thinking entirely (rigor multiplier 0).
  const foundationThinking = thinkingForRigor(resolvedProvider, 16_000, rigor);

  const raw = await withStepContext('Phase 2 (Strategy Foundation)', 600, () =>
    createStructuredCompletion<StrategyFoundation>(
      resolvedProvider, resolvedModel,
      prompt.system, prompt.user,
      { temperature: 0.4, maxTokens: 24000, timeoutMs: 600_000, thinking: foundationThinking },
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
import { selectCreativeMaterials } from '@/lib/campaigns/ai-creative-selector';
import type { HumanInsight, CreativeConcept, InsightMiningResult, CreativeLeapResult, DebateRound, StickinessScore, CampaignLineTests, BisociationDomain } from './strategy-blueprint.types';
import type { GoldenbergTemplate } from '@/lib/goldenberg/goldenberg-templates';
import { buildQuickConceptPrompt } from '@/lib/ai/prompts/campaign-strategy';

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
  /**
   * Pipeline configuration from the wizard. Determines which phases run
   * and how deeply. Defaults to the Standard preset if omitted.
   */
  pipelineConfig: PipelineConfig;
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
  // Default to Standard preset if no config is passed.
  const pipelineConfig: PipelineConfig = opts.pipelineConfig ?? {
    strategyDepth: 'grounded',
    creativeRange: 'multi-variant',
    modelRigor: 'balanced',
  };

  // Parallel context fetching
  const [brandContextData, personaContext, productContext, competitorContext, trendContext] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(opts.personaIds ?? [], workspaceId),
    buildProductContext(workspaceId, opts.productIds),
    buildCompetitorContext(workspaceId, opts.competitorIds),
    buildTrendContext(workspaceId, opts.trendIds),
  ]);
  const brandContext = formatBrandContext(brandContextData);

  // External enrichment (Are.na + Exa only — Scholar runs in strategy foundation phase).
  // Only fetched when strategyDepth is 'research-backed'. Users on Basic/Grounded
  // get a faster, cheaper run without external API calls.
  let arenaContext: string | undefined;
  let exaContext: string | undefined;

  const shouldEnrich = pipelineConfig.strategyDepth === 'research-backed' && wc.useExternalEnrichment;
  if (shouldEnrich) {
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
    pipelineConfig,
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

  const rigor = ctx.pipelineConfig.modelRigor;

  // Resolve model tier per variant, scaled by ModelRigor.
  const [modelA, modelB, modelC] = await Promise.all([
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy', rigor),
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-b', rigor),
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-c', rigor),
  ]);

  const lenses: Array<{ role: 'empathy' | 'tension' | 'behavior'; provider: AiProvider; model: string }> = [
    { role: 'empathy', provider: modelA.provider, model: modelA.model },
    { role: 'tension', provider: modelB.provider, model: modelB.model },
    { role: 'behavior', provider: modelC.provider, model: modelC.model },
  ];

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
        lens.provider,
        lens.model,
        prompt.system,
        prompt.user,
        { maxTokens: 16000, thinking: thinkingForRigor(lens.provider, 8000, rigor) },
      ),
    );

    let parsed: unknown;
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      throw new Error(`Insight mining (${lens.role}) returned invalid JSON`);
    }
    return {
      ...(parsed as Record<string, unknown>),
      providerUsed: lens.provider,
      modelUsed: lens.model,
    } as HumanInsight;
  });

  const insights = await Promise.all(insightPromises);

  // Auto-select the strongest insight based on specificity + emotional depth.
  // Each insight has proofPoints (more = more grounded), underlyingTension
  // (longer = more developed), and humanTruth (more specific = better).
  // Simple heuristic: score by combined field richness.
  let bestIdx = 0;
  let bestScore = 0;
  for (let i = 0; i < insights.length; i++) {
    const ins = insights[i];
    const score =
      (ins.insightStatement?.length ?? 0) * 2 +
      (ins.underlyingTension?.length ?? 0) * 1.5 +
      (ins.humanTruth?.length ?? 0) * 2 +
      (ins.emotionalTerritory?.length ?? 0) +
      (ins.proofPoints?.length ?? 0) * 20 +
      (ins.categoryConvention?.length ?? 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  onProgress?.({ type: 'step', step: 1, name: 'Insight Mining', status: 'complete', label: 'Best insight auto-selected' } as PipelineEvent);

  return { insights, selectedInsightIndex: bestIdx };
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
  regenerationContext?: { feedback: string; failedConcepts: Array<{ campaignLine: string; whyItFailed: string }> },
): Promise<CreativeLeapResult> {
  onProgress?.({ type: 'step', step: 1, name: 'Creative Leap', status: 'running', label: 'Selecting best creative frameworks for this campaign...' } as PipelineEvent);

  // AI-driven selection: pick templates & generate context-specific creative angles
  const { templates, angles } = await selectCreativeMaterials({
    brandContext: ctx.brandContext,
    personaContext: ctx.personaContext,
    goalType: ctx.goalType,
    insight: selectedInsight,
    briefing: ctx.briefing ? {
      occasion: ctx.briefing.occasion,
      audienceObjective: ctx.briefing.audienceObjective,
      coreMessage: ctx.briefing.coreMessage,
    } : undefined,
  });

  const insightText = `Insight: "${selectedInsight.insightStatement}"
Underlying tension: ${selectedInsight.underlyingTension}
Emotional territory: ${selectedInsight.emotionalTerritory}
Category convention: ${selectedInsight.categoryConvention}
Human truth: ${selectedInsight.humanTruth}`;

  // Resolve models scaled by ModelRigor
  const rigor = ctx.pipelineConfig.modelRigor;
  const [modelA, modelB, modelC] = await Promise.all([
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy', rigor),
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-b', rigor),
    resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-c', rigor),
  ]);

  const assignments = [
    { template: templates[0], angle: angles[0], provider: modelA.provider, model: modelA.model },
    { template: templates[1], angle: angles[1], provider: modelB.provider, model: modelB.model },
    { template: templates[2], angle: angles[2], provider: modelC.provider, model: modelC.model },
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
        name: a.angle.name,
        visualMetaphors: a.angle.visualPotential,
        emotionalTerritories: a.angle.emotionalTerritory,
      },
      briefing: ctx.briefing,
      arenaContext: ctx.arenaContext,
      exaContext: ctx.exaContext,
      regenerationContext: regenerationContext ? `
LEARNINGS FROM PREVIOUS ATTEMPT:
${regenerationContext.feedback}

FAILED CONCEPTS (do NOT repeat these approaches):
${regenerationContext.failedConcepts.map(fc => `- "${fc.campaignLine}" — failed because: ${fc.whyItFailed}`).join('\n')}

Generate DIFFERENT concepts that address these failures.` : undefined,
    });

    const result = await withStepContext(`Creative Leap (${a.template.name} × ${a.angle.name})`, 120, () =>
      createStructuredCompletion(
        a.provider,
        a.model,
        prompt.system,
        prompt.user,
        { maxTokens: 16000, thinking: thinkingForRigor(a.provider, 12_000, rigor) },
      ),
    );

    let parsed: unknown;
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      throw new Error('Concept generation returned invalid JSON');
    }
    return {
      ...(parsed as Record<string, unknown>),
      providerUsed: a.provider,
      modelUsed: a.model,
    } as CreativeConcept;
  });

  const concepts = await Promise.all(conceptPromises);

  onProgress?.({ type: 'step', step: 1, name: 'Creative Leap', status: 'complete', label: '3 concepts generated' } as PipelineEvent);

  return { concepts, selectedConceptIndex: null, selectedInsight };
}

// ─── Phase 2b: Creative Debate (Multi-Round) ────────────────

const MAX_DEBATE_ROUNDS = 3;
const DEBATE_QUALITY_GATE = 75;

/** Thinking budgets per debate round (decreasing) */
const DEBATE_THINKING_BUDGETS: Array<{ critic: number; defense: number }> = [
  { critic: 10_000, defense: 12_000 },
  { critic: 6_000, defense: 8_000 },
  { critic: 4_000, defense: 6_000 },
];

/**
 * Runs a multi-round creative quality debate on a selected concept.
 * Up to 3 rounds with decreasing thinking budgets.
 * Stops early if the critic scores overallCreativeScore >= 75.
 * Returns the improved concept, all rounds, and final score.
 */
export async function runCreativeDebate(
  ctx: CreativePipelineContext,
  selectedConcept: CreativeConcept,
  selectedInsight: HumanInsight,
  onProgress?: ProgressCallback,
): Promise<{ critique: unknown; defense: unknown; improvedConcept: CreativeConcept; rounds: DebateRound[]; finalScore: number }> {
  const goalType = ctx.goalType;
  const insightJson = JSON.stringify(selectedInsight, null, 2);
  const rounds: DebateRound[] = [];
  let currentConcept = selectedConcept;
  let latestCritique: unknown = null;
  let latestDefense: unknown = null;
  let finalScore = 0;

  for (let round = 0; round < MAX_DEBATE_ROUNDS; round++) {
    const roundNum = round + 1;
    const budgets = DEBATE_THINKING_BUDGETS[round] ?? DEBATE_THINKING_BUDGETS[DEBATE_THINKING_BUDGETS.length - 1];
    const conceptJson = JSON.stringify(currentConcept, null, 2);
    const previousRoundContext = round > 0
      ? `This is round ${roundNum}. Previous round score: ${finalScore}/100. Previous critique: ${JSON.stringify(latestCritique, null, 2).slice(0, 2000)}`
      : undefined;

    // Critic
    onProgress?.({ type: 'step', step: round * 2 + 1, name: `Creative Critic (Round ${roundNum})`, status: 'running', label: `Round ${roundNum}: Evaluating creative quality...` } as PipelineEvent);

    const criticPrompt = buildCreativeCriticPrompt({
      conceptJson,
      insightJson,
      brandContext: ctx.brandContext,
      personaContext: ctx.personaContext,
      goalType,
      previousRoundContext,
    });

    const rigor = ctx.pipelineConfig.modelRigor;
    const { model: criticModel, provider: criticProvider } = await resolveModelForRigor(ctx.workspaceId, 'campaign-strategy', rigor);
    const critiqueRaw = await withStepContext(`Creative Critic (Round ${roundNum})`, 120, () =>
      createStructuredCompletion(
        criticProvider,
        criticModel,
        criticPrompt.system,
        criticPrompt.user,
        { maxTokens: 16000, thinking: thinkingForRigor(criticProvider, budgets.critic, rigor) },
      ),
    );
    let critique: unknown;
    try {
      critique = typeof critiqueRaw === 'string' ? JSON.parse(critiqueRaw) : critiqueRaw;
    } catch {
      throw new Error(`Creative Critic (Round ${roundNum}) returned invalid JSON`);
    }
    latestCritique = critique;

    const critiqueScore = typeof (critique as Record<string, unknown>)?.overallCreativeScore === 'number'
      ? (critique as Record<string, unknown>).overallCreativeScore as number
      : 0;
    finalScore = critiqueScore;

    onProgress?.({ type: 'step', step: round * 2 + 1, name: `Creative Critic (Round ${roundNum})`, status: 'complete', label: `Round ${roundNum}: Score ${critiqueScore}/100` } as PipelineEvent);

    // Quality gate: if score is high enough, stop debating
    if (critiqueScore >= DEBATE_QUALITY_GATE) {
      rounds.push({ round: roundNum, critique, defense: null, score: critiqueScore, conceptSnapshot: { ...currentConcept } });
      break;
    }

    // Defense
    const roundContext = round > 0
      ? `This is round ${roundNum} of the debate. The concept has been through ${round} previous round(s). Focus on the remaining weaknesses.`
      : undefined;

    onProgress?.({ type: 'step', step: round * 2 + 2, name: `Creative Defense (Round ${roundNum})`, status: 'running', label: `Round ${roundNum}: Creative Director improving concept...` } as PipelineEvent);

    const defensePrompt = buildCreativeDefensePrompt({
      conceptJson,
      insightJson,
      critiqueJson: JSON.stringify(critique, null, 2),
      brandContext: ctx.brandContext,
      personaContext: ctx.personaContext,
      goalType,
      roundContext,
    });

    const { model: defenseModel, provider: defenseProvider } = await resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-b', rigor);
    const defenseRaw = await withStepContext(`Creative Defense (Round ${roundNum})`, 120, () =>
      createStructuredCompletion(
        defenseProvider,
        defenseModel,
        defensePrompt.system,
        defensePrompt.user,
        { maxTokens: 16000, thinking: thinkingForRigor(defenseProvider, budgets.defense, rigor) },
      ),
    );
    let defense: unknown;
    try {
      defense = typeof defenseRaw === 'string' ? JSON.parse(defenseRaw) : defenseRaw;
    } catch {
      throw new Error(`Creative Defense (Round ${roundNum}) returned invalid JSON`);
    }
    latestDefense = defense;

    onProgress?.({ type: 'step', step: round * 2 + 2, name: `Creative Defense (Round ${roundNum})`, status: 'complete', label: `Round ${roundNum}: Concept improved` } as PipelineEvent);

    // Update concept from defense
    currentConcept = {
      ...currentConcept,
      ...((defense as Record<string, unknown>).revisedConcept as Record<string, unknown> ?? {}),
      providerUsed: defenseProvider,
      modelUsed: defenseModel,
    };

    rounds.push({ round: roundNum, critique, defense, score: critiqueScore, conceptSnapshot: { ...currentConcept } });
  }

  return { critique: latestCritique, defense: latestDefense, improvedConcept: currentConcept, rounds, finalScore };
}

// ─── Quick Concept (Light Mode) ─────────────────────────────

/**
 * Generates a quick concept in a single Gemini Flash call (insight + concept combined).
 * Used when pipelineDepth is 'quick' — skips multi-round debate and deep thinking.
 */
export async function generateQuickConcept(
  ctx: CreativePipelineContext,
  onProgress?: ProgressCallback,
): Promise<{ insight: HumanInsight; concept: CreativeConcept; personaValidation: PersonaValidationResult[] }> {
  onProgress?.({ type: 'step', step: 1, name: 'Quick Concept', status: 'running', label: 'Generating insight and concept...' } as PipelineEvent);

  const quickPrompt = buildQuickConceptPrompt({
    brandContext: ctx.brandContext,
    personaContext: ctx.personaContext,
    productContext: ctx.productContext,
    competitorContext: ctx.competitorContext,
    goalType: ctx.goalType,
    briefing: ctx.briefing,
  });

  const result = await withStepContext('Quick Concept Generation', 60, () =>
    createStructuredCompletion(
      'google' as AiProvider,
      GEMINI_FLASH,
      quickPrompt.system,
      quickPrompt.user,
      { maxTokens: 8000 },
    ),
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof result === 'string' ? JSON.parse(result) : result;
  } catch {
    throw new Error('Quick concept generation returned invalid JSON');
  }

  const insight: HumanInsight = {
    insightStatement: (parsed.insightStatement as string) ?? '',
    underlyingTension: (parsed.underlyingTension as string) ?? '',
    emotionalTerritory: (parsed.emotionalTerritory as string) ?? '',
    proofPoints: (parsed.proofPoints as string[]) ?? [],
    categoryConvention: (parsed.categoryConvention as string) ?? '',
    humanTruth: (parsed.humanTruth as string) ?? '',
    providerUsed: 'google',
    modelUsed: GEMINI_FLASH,
  };

  const concept: CreativeConcept = {
    campaignLine: (parsed.campaignLine as string) ?? '',
    bigIdea: (parsed.bigIdea as string) ?? '',
    goldenbergTemplate: (parsed.goldenbergTemplate as GoldenbergTemplate) ?? 'metaphor',
    goldenbergApplication: (parsed.goldenbergApplication as string) ?? '',
    bisociationDomain: (parsed.bisociationDomain as BisociationDomain) ?? { domain: '', connectionToInsight: '', visualPotential: '' },
    visualWorld: (parsed.visualWorld as string) ?? '',
    memorableDevice: (parsed.memorableDevice as string) ?? '',
    stickinessScore: (parsed.stickinessScore as StickinessScore) ?? { simple: 5, unexpected: 5, concrete: 5, credible: 5, emotional: 5, story: 5, total: 5 },
    campaignLineTests: (parsed.campaignLineTests as CampaignLineTests) ?? {
      barTest: { pass: false, evidence: '' }, tShirtTest: { pass: false, evidence: '' },
      parodyTest: { pass: false, evidence: '' }, tenYearTest: { pass: false, evidence: '' },
      categoryEscapeTest: { pass: false, evidence: '' }, oppositeTest: { pass: false, evidence: '' },
      passCount: 0,
    },
    creativeTerritory: (parsed.creativeTerritory as string) ?? '',
    extendability: (parsed.extendability as string[]) ?? [],
    providerUsed: 'google',
    modelUsed: GEMINI_FLASH,
  };

  onProgress?.({ type: 'step', step: 1, name: 'Quick Concept', status: 'complete', label: 'Concept generated' } as PipelineEvent);
  return { insight, concept, personaValidation: [] };
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

  const rigor = ctx.pipelineConfig.modelRigor;
  const { model, provider } = await resolveModelForRigor(ctx.workspaceId, 'campaign-strategy', rigor);

  const result = await withStepContext('Strategy Build', 180, () =>
    createStructuredCompletion(
      provider,
      model,
      prompt.system,
      prompt.user,
      { maxTokens: 16000, thinking: thinkingForRigor(provider, 12_000, rigor) },
    ),
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof result === 'string' ? JSON.parse(result) : (result as Record<string, unknown>);
  } catch {
    throw new Error('Strategy build returned invalid JSON');
  }

  // Ensure the concept fields are preserved on the strategy layer
  const strategy = {
    ...(parsed.strategy as Record<string, unknown>),
    humanInsight: approvedInsight.insightStatement,
    creativePlatform: approvedConcept.bigIdea,
    creativeTerritory: approvedConcept.creativeTerritory,
    memorableDevice: approvedConcept.memorableDevice,
    campaignTheme: approvedConcept.campaignLine,
  } as StrategyLayer;

  if (!parsed.architecture) {
    console.warn('[buildConceptDrivenStrategy] AI did not return architecture object — journey phases will be generated in elaborateJourney()');
  }
  const architecture = (parsed.architecture ?? { campaignType: 'strategic', journeyPhases: [] }) as ArchitectureLayer;

  onProgress?.({ type: 'step', step: 1, name: 'Strategy Build', status: 'complete', label: 'Strategy built on approved concept' } as PipelineEvent);

  return { strategy, architecture };
}

