// =============================================================================
// Campaign Strategy Blueprint — 5-Step Prompt Chain Orchestrator
// Runs 5 AI calls (1a+1b parallel full variants, 2 persona validation,
// 3 synthesis, 4 channel plan, 5 asset plan) to produce a CampaignBlueprint
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { buildSelectedPersonasContext } from '@/lib/ai/persona-context';
import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { calculateBlueprintConfidence } from './confidence-calculator';
import { getGoalTypeGuidance } from '@/features/campaigns/lib/goal-types';
import {
  buildFullVariantAPrompt,
  buildFullVariantBPrompt,
  buildPersonaValidatorPrompt,
  buildStrategySynthesizerPrompt,
  buildChannelPlannerPrompt,
  buildAssetPlannerPrompt,
} from '@/lib/ai/prompts/campaign-strategy';
import {
  strategyLayerSchema,
  architectureLayerSchema,
  fullVariantSchema,
  channelPlanLayerSchema,
  assetPlanLayerSchema,
  personaValidationArraySchema,
  fullVariantResponseSchema,
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
  PipelineStep,
  StrategicIntent,
  TouchpointPersonaRelevance,
  PersonaRelevance,
  VariantPhaseResult,
  SynthesisPhaseResult,
  JourneyPhaseResult,
} from './strategy-blueprint.types';

// ─── Constants ──────────────────────────────────────────────

const CLAUDE_SONNET = 'claude-sonnet-4-5-20250929';
const CLAUDE_OPUS = 'claude-opus-4-6';
const GEMINI_PRO = 'gemini-3.1-pro-preview';
const GEMINI_FLASH = 'gemini-2.5-flash';

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

export type ProgressCallback = (step: PipelineStep) => void;

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
 * - Normalize preferredVariant to uppercase "A" or "B"
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
    preferredVariant: (
      typeof p.preferredVariant === 'string' && ['A', 'B'].includes(p.preferredVariant.trim().toUpperCase())
        ? p.preferredVariant.trim().toUpperCase() as 'A' | 'B'
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
 * Phase A: Generate 2 full variants (strategy + architecture each) + persona validation.
 * Runs Steps 1-2 of the pipeline and returns variant data for user review.
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

  const [brandContext, personaContext, productContext, competitorContext, trendContext, personaProfiles] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildPersonaProfiles(personaIds, workspaceId),
  ]);
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
  };

  // Step 1: Dual Full Variants (parallel — each model generates its own strategy + architecture)
  onProgress?.({ step: 1, name: 'Dual Full Variants', status: 'running', label: 'Two AI models generating complete strategy variants...' });

  const step1aPrompt = buildFullVariantAPrompt(sharedPromptParams);
  const step1bPrompt = buildFullVariantBPrompt(sharedPromptParams);

  const [fullVariantARaw, fullVariantBRaw] = await Promise.all([
    withStepContext('Step 1a (Full Variant A — Claude)', 300, () =>
      createClaudeStructuredCompletion<FullVariant>(
        step1aPrompt.system, step1aPrompt.user,
        { model: CLAUDE_SONNET, temperature: 0.5, maxTokens: 24000, timeoutMs: 300_000 },
      ),
    ),
    withStepContext('Step 1b (Full Variant B — Gemini)', 300, () =>
      createGeminiStructuredCompletion<FullVariant>(
        step1bPrompt.system, step1bPrompt.user,
        { model: GEMINI_PRO, temperature: 0.4, maxOutputTokens: 24000, timeoutMs: 300_000, responseSchema: fullVariantResponseSchema },
      ),
    ),
  ]);

  const fullVariantA = validateOrWarn(fullVariantSchema, fullVariantARaw, 'Step 1a Full Variant A');
  const fullVariantB = validateOrWarn(fullVariantSchema, fullVariantBRaw, 'Step 1b Full Variant B');
  const strategyLayerA = fullVariantA.strategy;
  const strategyLayerB = fullVariantB.strategy;
  const variantA = normalizeArchitectureLayer(fullVariantA.architecture);
  const variantB = normalizeArchitectureLayer(fullVariantB.architecture);

  onProgress?.({ step: 1, name: 'Dual Full Variants', status: 'complete', label: 'Both complete variants generated', preview: `A: "${strategyLayerA.campaignTheme}" (${variantA.journeyPhases.length} phases) | B: "${strategyLayerB.campaignTheme}" (${variantB.journeyPhases.length} phases)` });

  // Step 2: Persona Validation
  onProgress?.({ step: 2, name: 'Persona Validation', status: 'running', label: 'Validating with personas...' });

  const goalGuidance = getGoalTypeGuidance(campaignGoalType);
  let personaValidation: PersonaValidationResult[] = [];
  let variantAScore = 0;
  let variantBScore = 0;

  if (personaProfiles.length > 0) {
    const step2Prompt = buildPersonaValidatorPrompt({
      strategyLayerA: JSON.stringify(strategyLayerA),
      strategyLayerB: JSON.stringify(strategyLayerB),
      variantA: JSON.stringify(variantA),
      variantB: JSON.stringify(variantB),
      personas: personaProfiles,
      goalType: campaignGoalType,
      goalGuidance,
    });

    const validationRaw = await withStepContext('Step 2 (Persona Validation)', 300, () =>
      createClaudeStructuredCompletion<PersonaValidationResult[]>(
        step2Prompt.system, step2Prompt.user,
        { model: CLAUDE_SONNET, temperature: 0.7, maxTokens: 16384, timeoutMs: 300_000 },
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
      variantAScore = aVoters.length > 0 ? aVoters.reduce((s, p) => s + p.overallScore, 0) / aVoters.length : avgScore;
      variantBScore = bVoters.length > 0 ? bVoters.reduce((s, p) => s + p.overallScore, 0) / bVoters.length : avgScore;
    }
  } else {
    variantAScore = 7;
    variantBScore = 7;
  }

  onProgress?.({ step: 2, name: 'Persona Validation', status: 'complete', label: 'Personas evaluated', preview: personaValidation.length > 0 ? `${personaValidation.length} personas scored` : 'Skipped (no personas)' });

  return { strategyLayerA, strategyLayerB, variantA, variantB, personaValidation, variantAScore, variantBScore };
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
    variantA: ArchitectureLayer;
    variantB: ArchitectureLayer;
    personaValidation: PersonaValidationResult[];
    variantAScore: number;
    variantBScore: number;
    wizardContext: WizardContext;
    strategicIntent?: StrategicIntent;
  },
  onProgress?: ProgressCallback,
): Promise<SynthesisPhaseResult> {
  const campaignGoalType = data.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);

  onProgress?.({ step: 4, name: 'Strategy Synthesis', status: 'running', label: 'Synthesizing optimal strategy...' });

  // Inject user feedback into the persona validation context so the synthesizer weighs it
  const personaValidationWithFeedback = data.variantFeedback
    ? JSON.stringify(data.personaValidation) + `\n\n--- USER FEEDBACK ON VARIANTS ---\n${data.variantFeedback}`
    : JSON.stringify(data.personaValidation);

  const step4Prompt = buildStrategySynthesizerPrompt({
    strategyLayerA: JSON.stringify(data.strategyLayerA),
    strategyLayerB: JSON.stringify(data.strategyLayerB),
    variantA: JSON.stringify(data.variantA),
    variantB: JSON.stringify(data.variantB),
    personaValidation: personaValidationWithFeedback,
    variantAScore: data.variantAScore,
    variantBScore: data.variantBScore,
    goalType: campaignGoalType,
    goalGuidance,
  });

  const synthesizedRaw = await withStepContext('Step 4 (Strategy Synthesis — Opus)', 300, () =>
    createClaudeStructuredCompletion<SynthesizedResult>(
      step4Prompt.system,
      step4Prompt.user,
      { model: CLAUDE_OPUS, temperature: 0.3, maxTokens: 32000, timeoutMs: 300_000 },
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

  // Fetch all context in parallel
  // Brand assets + styleguide are always loaded (brand identity, always relevant)
  // Products, competitors, trends, and personas are only loaded when explicitly selected
  const [brandContext, personaContext, productContext, competitorContext, trendContext, styleguideContext, personaProfiles, personaChannelPrefs] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(personaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaProfiles(personaIds, workspaceId),
    buildPersonaChannelPrefs(personaIds, workspaceId),
  ]);

  const brandContextText = formatBrandContext(brandContext);

  // ─── Step 1: Dual Full Variants (parallel) ──────────
  onProgress?.({ step: 1, name: 'Dual Full Variants', status: 'running', label: 'Generating strategy variants A & B...' });

  const briefing = isWizardMode ? options.wizardContext!.briefing : undefined;
  const goalGuidance = getGoalTypeGuidance(campaignGoalType);

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
  };

  const step1aPrompt = buildFullVariantAPrompt(fullVariantParams);
  const step1bPrompt = buildFullVariantBPrompt(fullVariantParams);

  const [fullVariantARaw, fullVariantBRaw] = await Promise.all([
    withStepContext('Step 1a (Full Variant A — Claude)', 300, () =>
      createClaudeStructuredCompletion<FullVariant>(
        step1aPrompt.system,
        step1aPrompt.user,
        { model: CLAUDE_SONNET, temperature: 0.5, maxTokens: 24000, timeoutMs: 300_000 },
      ),
    ),
    withStepContext('Step 1b (Full Variant B — Gemini)', 300, () =>
      createGeminiStructuredCompletion<FullVariant>(
        step1bPrompt.system,
        step1bPrompt.user,
        { model: GEMINI_PRO, temperature: 0.4, maxOutputTokens: 24000, timeoutMs: 300_000, responseSchema: fullVariantResponseSchema },
      ),
    ),
  ]);

  const fullA = fullVariantSchema.parse(fullVariantARaw);
  const fullB = fullVariantSchema.parse(fullVariantBRaw);

  const strategyLayerA = validateOrWarn(strategyLayerSchema, fullA.strategy, 'Step 1a Strategy A');
  const strategyLayerB = validateOrWarn(strategyLayerSchema, fullB.strategy, 'Step 1b Strategy B');
  const variantA = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, fullA.architecture, 'Step 1a Architecture A'));
  const variantB = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, fullB.architecture, 'Step 1b Architecture B'));

  onProgress?.({ step: 1, name: 'Dual Full Variants', status: 'complete', label: 'Both variants generated', preview: `A: ${variantA.journeyPhases.length} phases | B: ${variantB.journeyPhases.length} phases` });

  // ─── Step 2: Persona Validator (Claude Sonnet) ───────────
  onProgress?.({ step: 2, name: 'Persona Validation', status: 'running', label: 'Validating with personas...' });

  let personaValidation: PersonaValidationResult[] = [];
  let variantAScore = 0;
  let variantBScore = 0;

  if (personaProfiles.length > 0) {
    const step2Prompt = buildPersonaValidatorPrompt({
      strategyLayerA: JSON.stringify(strategyLayerA),
      strategyLayerB: JSON.stringify(strategyLayerB),
      variantA: JSON.stringify(variantA),
      variantB: JSON.stringify(variantB),
      personas: personaProfiles,
      goalType: campaignGoalType,
      goalGuidance,
    });

    const validationRaw = await withStepContext('Step 2 (Persona Validation)', 300, () =>
      createClaudeStructuredCompletion<PersonaValidationResult[]>(
        step2Prompt.system,
        step2Prompt.user,
        { model: CLAUDE_SONNET, temperature: 0.7, maxTokens: 16384, timeoutMs: 300_000 },
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
      variantAScore = aVoters.length > 0 ? aVoters.reduce((s, p) => s + p.overallScore, 0) / aVoters.length : avgScore;
      variantBScore = bVoters.length > 0 ? bVoters.reduce((s, p) => s + p.overallScore, 0) / bVoters.length : avgScore;
    }
  } else {
    // No personas — skip validation, use balanced scores
    variantAScore = 7;
    variantBScore = 7;
  }

  onProgress?.({ step: 2, name: 'Persona Validation', status: 'complete', label: 'Personas evaluated', preview: personaValidation.length > 0 ? `${personaValidation.length} personas, avg score ${(personaValidation.reduce((s, p) => s + p.overallScore, 0) / personaValidation.length).toFixed(1)}/10` : 'Skipped (no personas)' });

  // ─── Step 3: Strategy Synthesizer (Claude Opus) ──────────
  onProgress?.({ step: 3, name: 'Strategy Synthesis', status: 'running', label: 'Synthesizing optimal strategy...' });

  const step3Prompt = buildStrategySynthesizerPrompt({
    strategyLayerA: JSON.stringify(strategyLayerA),
    strategyLayerB: JSON.stringify(strategyLayerB),
    variantA: JSON.stringify(variantA),
    variantB: JSON.stringify(variantB),
    personaValidation: JSON.stringify(personaValidation),
    variantAScore,
    variantBScore,
    goalType: campaignGoalType,
    goalGuidance,
  });

  // Step 3 returns BOTH strategy + architecture in a single response — needs high token limit
  const synthesizedRaw = await withStepContext('Step 3 (Strategy Synthesis — Opus)', 300, () =>
    createClaudeStructuredCompletion<SynthesizedResult>(
      step3Prompt.system,
      step3Prompt.user,
      { model: CLAUDE_OPUS, temperature: 0.3, maxTokens: 32000, timeoutMs: 300_000 },
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
    pipelineDuration: Date.now() - startTime,
    modelsUsed: [CLAUDE_SONNET, GEMINI_PRO, CLAUDE_OPUS, GEMINI_FLASH],
    contextSelection: {
      personaIds,
      productIds,
      competitorIds,
      trendIds,
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

  const [brandContext, personaContext, productContext, competitorContext, trendContext, styleguideContext, personaProfiles, personaChannelPrefs] = await Promise.all([
    getBrandContext(workspaceId),
    buildSelectedPersonasContext(resolvedPersonaIds, workspaceId),
    productIds.length > 0 ? buildProductContext(workspaceId, productIds) : Promise.resolve(''),
    competitorIds.length > 0 ? buildCompetitorContext(workspaceId, competitorIds) : Promise.resolve(''),
    trendIds.length > 0 ? buildTrendContext(workspaceId, trendIds) : Promise.resolve(''),
    buildStyleguideContext(workspaceId),
    buildPersonaProfiles(resolvedPersonaIds, workspaceId),
    buildPersonaChannelPrefs(resolvedPersonaIds, workspaceId),
  ]);

  const brandContextText = formatBrandContext(brandContext);

  // Regenerate from the requested layer downward
  // Strategy and architecture are now coupled — regeneration produces both via a full variant.
  if (layer === 'strategy' || layer === 'architecture') {
    onProgress?.({ step: 1, name: 'Full Variant Regeneration', status: 'running', label: 'Regenerating strategy & architecture...' });

    const regenDescription = `${campaign.description || ''}${feedback ? `\n\nUser feedback for regeneration: ${feedback}` : ''}`;
    const prompt = buildFullVariantAPrompt({
      brandContext: brandContextText,
      personaContext,
      campaignName: campaign.title,
      campaignDescription: regenDescription,
      goalType: campaign.campaignGoalType || 'BRAND_AWARENESS',
      strategicIntent: blueprint.strategy.strategicIntent,
      productContext,
      competitorContext,
      trendContext,
      personaIds: resolvedPersonaIds,
    });

    const fullVariantRaw = await withStepContext('Regenerate Full Variant (Step 1)', 300, () =>
      createClaudeStructuredCompletion<FullVariant>(
        prompt.system, prompt.user,
        { model: CLAUDE_SONNET, temperature: 0.5, maxTokens: 24000, timeoutMs: 300_000 },
      ),
    );
    const fullVariant = fullVariantSchema.parse(fullVariantRaw);
    blueprint.strategy = validateOrWarn(strategyLayerSchema, fullVariant.strategy, 'Regenerate Strategy');
    blueprint.architecture = normalizeArchitectureLayer(validateOrWarn(architectureLayerSchema, fullVariant.architecture, 'Regenerate Architecture'));

    // Clear stale persona validation — it was scored against the previous strategy.
    blueprint.personaValidation = [];
    blueprint.variantAScore = 0;
    blueprint.variantBScore = 0;

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
  // Preserve context selection for future regenerations
  blueprint.contextSelection = existingBlueprint.contextSelection;

  return blueprint;
}
