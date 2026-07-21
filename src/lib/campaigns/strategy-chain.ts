// =============================================================================
// Campaign Strategy Blueprint — Prompt Chain Orchestrator
// Contains: briefing validation, strategy foundation, elaborateJourney (channel+asset plans),
// regenerateBlueprintLayer, CQP creative quality pipeline (insights → concepts → debate → strategy → visuals)
// Legacy 3-variant pipeline functions removed — see CQP pipeline below
// =============================================================================

import type { ZodType } from 'zod';
import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { timeoutForTokens } from '@/lib/ai/call-budget';
import { formatBrandContext, formatBrandContextTier } from '@/lib/ai/prompt-templates';
import { buildSelectedPersonasContext } from '@/lib/ai/persona-context';
import { createClaudeStructuredCompletion, createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { scrubAwardJargonString, scrubStrategyLayer } from '@/lib/ai/sanitize-strategy-output';
import { buildLocaleSystemFragment } from '@/lib/ai/locale-instruction';
import type { AICallTracking } from '@/lib/learning-loop';
import { calculateBlueprintConfidence } from './confidence-calculator';
import { computePhaseSchedule } from './phase-scheduler';
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

const CLAUDE_OPUS = 'claude-opus-4-8';
const GPT_54 = 'gpt-5.6';
const GEMINI_31_PRO = 'gemini-3.1-pro-preview';
const GEMINI_FLASH = 'gemini-3.5-flash';
const GEMINI_FLASH_LITE = 'gemini-3.1-flash-lite';

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
  openai: 'gpt-5.6-luna',
  google: GEMINI_FLASH,
};

/**
 * Balanced-tier fallbacks per provider. Used when ModelRigor === 'balanced'.
 */
const BALANCED_TIER_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: GPT_54,
  google: 'gemini-3.1-flash-lite',
};

/**
 * Resolve model + provider for a given feature and rigor tier.
 * - 'deliberate' respects workspace AI Models settings (user's choice wins)
 * - 'balanced' downgrades to the balanced tier fallback for the provider
 * - 'fast' forces the fast tier fallback
 */
/**
 * Build AICallTracking from a phase or pipeline context.
 * Uses campaignId as parent if present, otherwise workspaceId fallback.
 * Returns undefined when ctx omits required fields — tracking is opt-in.
 */
function buildStrategyTracking(
  ctx: { workspaceId?: string; campaignId?: string },
  sourceFn: string,
  callOrder?: number,
  brandContext?: unknown,
): AICallTracking | undefined {
  if (!ctx.workspaceId) return undefined;
  return {
    workspaceId: ctx.workspaceId,
    parentEntityType: ctx.campaignId ? 'Campaign' : 'Workspace',
    parentEntityId: ctx.campaignId ?? ctx.workspaceId,
    brandContext,
    callOrder,
    sourceIdentifier: `src/lib/campaigns/strategy-chain.ts:${sourceFn}`,
  };
}

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

/**
 * Compute the maxTokens/timeout pair for a call with extended thinking.
 * Thinking tokens count toward max_tokens (Anthropic/Gemini), so the thinking
 * budget must be reserved ON TOP of the output budget — nesting it inside
 * squeezed the net output (12k thinking in 16k maxTokens left ~4k), which
 * hard-throws since the Fase 1 truncation guards (audit 2026-06-11). The
 * timeout follows the total budget via timeoutForTokens so the two never
 * drift apart (gotcha 2026-05-24).
 */
function budgetWithThinking(
  outputTokens: number,
  thinking: ReturnType<typeof thinkingForRigor>,
): { maxTokens: number; timeoutMs: number } {
  // OpenAI reasoning has no explicit token budget but its reasoning tokens
  // DO count toward max_completion_tokens — reserve a fixed allowance so
  // the net output isn't squeezed (high effort routinely burns 8-12k).
  const thinkingTokens =
    thinking?.anthropic?.budgetTokens ??
    thinking?.google?.thinkingBudget ??
    (thinking?.openai ? (thinking.openai.reasoningEffort === 'high' ? 12_000 : 6_000) : 0);
  const maxTokens = outputTokens + thinkingTokens;
  // Thinking-enabled calls previously ran on the SDK wrappers' 600s default
  // (no timeoutMs passed); the token-coupled formula may only extend, never
  // shorten, that — slow Opus-class emission with thinking outruns the
  // 10ms/token rule well before these budgets.
  const timeoutMs = thinking
    ? Math.max(timeoutForTokens(maxTokens), 600_000)
    : timeoutForTokens(maxTokens);
  return { maxTokens, timeoutMs };
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

// ─── Output-language contract + concept jargon-scrub ────────

/**
 * Append the workspace output-language contract to a system prompt.
 * Deliberately placed at the END: trailing instructions outrank earlier ones,
 * so this also overrides language directives baked into shared prompt text
 * (e.g. the quick-concept prompt hardcodes English — audit 2026-06-11 T5).
 * No-op when the language is unknown.
 */
function withLocaleContract(systemPrompt: string, contentLanguage: string | undefined): string {
  const fragment = buildLocaleSystemFragment(contentLanguage);
  return fragment ? `${systemPrompt}\n\n${fragment}` : systemPrompt;
}

/**
 * Deep-scrub award-rubric jargon (Effie/Cannes vocabulary) from every string
 * in a parsed LLM value. The concept path (creative leap / debate / quick
 * concept) bypasses scrubStrategyLayer, which only knows StrategyLayer fields;
 * this walker covers arbitrary concept/critique shapes (audit 2026-06-11 T5).
 * Warns when the vangnet actually fired — the prompt output-guards should
 * normally suppress this vocabulary at the source.
 */
function scrubConceptOutput<T>(value: T, stepName: string): T {
  let replaced = 0;
  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const scrubbed = scrubAwardJargonString(node);
      if (scrubbed !== node) replaced += 1;
      return scrubbed;
    }
    if (Array.isArray(node)) return node.map(visit);
    if (node !== null && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        out[key] = visit(child);
      }
      return out;
    }
    return node;
  };
  const result = visit(value) as T;
  if (replaced > 0) {
    console.warn(
      `[strategy-chain] ${stepName}: award-jargon scrubber replaced ${replaced} string field(s) in LLM output — prompt output-guards did not suppress internal rubric vocabulary`,
    );
  }
  return result;
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
  /** Draft campaign id — used to populate CreativePipelineContext.campaignId for tracking. */
  campaignId?: string;
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
  // Guidelines + examples verhuisd naar BrandVoiceguide (ADR 2026-05-15).
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { writingGuidelines: true, contentGuidelines: true, examplePhrases: true },
  });
  if (!voiceguide) return '';
  const parts: string[] = [];
  if (voiceguide.contentGuidelines?.length) parts.push(`Content guidelines: ${voiceguide.contentGuidelines.join('; ')}`);
  if (voiceguide.writingGuidelines?.length) parts.push(`Writing guidelines: ${voiceguide.writingGuidelines.join('; ')}`);
  if (voiceguide.examplePhrases) parts.push(`Example phrases: ${JSON.stringify(voiceguide.examplePhrases)}`);
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
    `Risk level: ${angle.riskLevel} | Award potential: ${angle.effieCannesPotential}`,
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

// ─── Zod validation helpers ─────────────────────────────────

/** Minimal structural view on a Zod issue — keeps the helpers version-agnostic. */
interface ZodIssueLike {
  code?: string;
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/**
 * Convert an AI-returned value to a display string. Models regularly return
 * objects where the schema expects strings (gotcha 2026-03-24); pick the most
 * descriptive field instead of letting "[object Object]" reach the UI.
 */
function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toDisplayString).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['barrier', 'name', 'title', 'description']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
    }
    const stringValues = Object.values(record).filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    if (stringValues.length > 0) return stringValues.join(' — ');
    return JSON.stringify(value);
  }
  return '';
}

function getAtPath(root: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

function setAtPath(root: unknown, path: ReadonlyArray<PropertyKey>, value: unknown): void {
  if (path.length === 0) return;
  const parent = getAtPath(root, path.slice(0, -1));
  if (parent === null || typeof parent !== 'object') return;
  (parent as Record<PropertyKey, unknown>)[path[path.length - 1]] = value;
}

/**
 * Best-effort coercion of AI output toward a Zod schema, guided by the issues
 * of a failed parse. Repairs the three recurring AI deviations (gotcha
 * 2026-03-24): numbers serialized as strings, objects where strings are
 * expected, and null/missing arrays.
 */
function coerceTowardSchema(data: unknown, issues: ReadonlyArray<ZodIssueLike>): unknown {
  const clone = structuredClone(data);
  for (const issue of issues) {
    if (issue.code !== 'invalid_type') continue;
    const expected = (issue as { expected?: unknown }).expected;
    const current = getAtPath(clone, issue.path);
    if (expected === 'number') {
      const coerced = Number(current);
      if (Number.isFinite(coerced)) setAtPath(clone, issue.path, coerced);
    } else if (expected === 'string') {
      if (current !== null && current !== undefined) setAtPath(clone, issue.path, toDisplayString(current));
    } else if (expected === 'array') {
      if (current === null || current === undefined) setAtPath(clone, issue.path, []);
    }
  }
  return clone;
}

function summarizeZodIssues(issues: ReadonlyArray<ZodIssueLike>, limit = 5): string {
  const lines = issues.slice(0, limit).map(i => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`);
  const remainder = issues.length - limit;
  return lines.join('; ') + (remainder > 0 ? `; … +${remainder} more` : '');
}

/**
 * Validate AI output against a Zod schema with coerce-then-enforce semantics
 * (successor of the warn-only `validateOrWarn`, audit 2026-06-11 T3):
 *
 * 1. First `safeParse` — on success return the parsed (schema-clean) data.
 * 2. On failure, run a coercion pass over the raw data (string→number,
 *    object→string, null→[]) and re-validate; on success warn and return
 *    the coerced data.
 * 3. Still failing: by default keep the historical warn-and-passthrough
 *    behavior (cosmetic AI deviations should not kill a 7-step pipeline).
 *    With `enforce: true` — only set at call-sites where malformed data is
 *    guaranteed to crash downstream anyway — throw a clear error instead of
 *    letting raw data flow on.
 */
function validateAndCoerce<T>(
  schema: ZodType<T>,
  data: unknown,
  stepName: string,
  options?: { enforce?: boolean },
): T {
  const first = schema.safeParse(data);
  if (first.success) return first.data;

  const coerced = coerceTowardSchema(data, first.error.issues);
  const second = schema.safeParse(coerced);
  if (second.success) {
    console.warn(
      `[strategy-chain] ${stepName}: AI output deviated from schema but was repaired by coercion (${first.error.issues.length} issue(s)): ${summarizeZodIssues(first.error.issues)}`,
    );
    return second.data;
  }

  if (options?.enforce) {
    throw new Error(
      `${stepName} returned data that does not match the expected schema (even after coercion): ${summarizeZodIssues(second.error.issues)}`,
    );
  }

  console.warn(
    `[strategy-chain] Zod validation warning for ${stepName} — proceeding with raw data: ${summarizeZodIssues(second.error.issues)}`,
  );
  return data as T;
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
    // Non-array shapes (model keys phases by name) fall back to [] so the
    // follow-up schema parse reports a clean error instead of a TypeError.
    journeyPhases: (Array.isArray(raw.journeyPhases) ? raw.journeyPhases : []).map((rawPhase, index) => {
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
  /** Campaign ID for learning-loop tracking. When omitted, tracking falls back to Workspace as parent. */
  campaignId?: string;
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
  campaignId?: string,
): Promise<JourneyPhaseResult> {
  const campaignGoalType = data.wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';
  const campaignType = data.wizardContext.campaignType;
  const selectedContentType = data.wizardContext.selectedContentType;
  // Journey/channel/asset prompts carry no brand-context block, so they need
  // the locale contract explicitly — asset-planner briefs are user-visible
  // (audit 2026-06-11 T5). getBrandContext is 5-min cached.
  const { contentLanguage } = await getBrandContext(workspaceId);
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

    const jpRaw = await withStepContext('Step 4.5 (Journey Phases — Gemini Lite)', 60, () =>
      createGeminiStructuredCompletion<ArchitectureLayer>(
        withLocaleContract(jpPrompt.system, contentLanguage), jpPrompt.user,
        { model: GEMINI_FLASH_LITE, temperature: 0.3, maxOutputTokens: 8000, timeoutMs: 60_000, responseSchema: journeyPhasesResponseSchema },
        buildStrategyTracking({ workspaceId, campaignId }, 'elaborateJourney:journeyPhases', 4),
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

  const channelPlanRaw = await withStepContext('Step 5 (Channel Planner — Gemini Lite)', 180, () =>
    createGeminiStructuredCompletion<ChannelPlanLayer>(
      withLocaleContract(step5Prompt.system, contentLanguage), step5Prompt.user,
      { model: GEMINI_FLASH_LITE, temperature: 0.2, maxOutputTokens: 12000, timeoutMs: 180_000, responseSchema: channelPlanResponseSchema },
      buildStrategyTracking({ workspaceId, campaignId }, 'elaborateJourney:channelPlanner', 5),
    ),
  );
  // enforce: the next line dereferences channelPlan.channels unguarded — a
  // malformed plan would crash here anyway, just with a cryptic TypeError.
  const channelPlan = validateAndCoerce(channelPlanLayerSchema, channelPlanRaw, 'Step 5 Channel Plan', { enforce: true });
  onProgress?.({ step: 5, name: 'Channel Planner', status: 'complete', label: 'Channel plan complete', preview: `${channelPlan.channels.length} channels` });

  // Step 6: Asset Planner
  onProgress?.({ step: 6, name: 'Asset Planner', status: 'running', label: 'Creating asset plan...' });

  // Filter out unnamed phases — un-normalized architectures can carry
  // `name: undefined`, which would otherwise reach the asset-planner prompt
  // as the literal string "undefined" (audit 2026-06-11 T3).
  const phaseNames = (architecture.journeyPhases ?? [])
    .map((p: { name?: string }) => p.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0 && name !== 'undefined');

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

  const assetPlanRaw = await withStepContext('Step 6 (Asset Planner — Gemini Lite)', 120, () =>
    createGeminiStructuredCompletion<AssetPlanLayer>(
      withLocaleContract(step6Prompt.system, contentLanguage), step6Prompt.user,
      { model: GEMINI_FLASH_LITE, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 120_000, responseSchema: assetPlanResponseSchema },
      buildStrategyTracking({ workspaceId, campaignId }, 'elaborateJourney:assetPlanner', 6),
    ),
  );
  // No enforce: immediate use is interpolation-only and the launch route
  // guards `deliverables?.length` before consuming the plan.
  const assetPlan = validateAndCoerce(assetPlanLayerSchema, assetPlanRaw, 'Step 6 Asset Plan');
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
  schedulerContext?: {
    campaignStart?: Date | string | null;
    campaignEnd?: Date | string | null;
    phases?: import('./strategy-blueprint.types').JourneyPhase[];
  },
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

  // Compute AI-suggested publish dates per deliverable. Stored as
  // `suggestedPublishDate` (not `scheduledPublishDate`) so users explicitly
  // commit via drag or the "Accept all suggestions" bulk action.
  const schedule = schedulerContext?.phases && schedulerContext.phases.length > 0
    ? computePhaseSchedule(assetPlanDeliverables, schedulerContext.phases, {
        campaignStart: schedulerContext.campaignStart ?? null,
        campaignEnd: schedulerContext.campaignEnd ?? null,
      }).byTitle
    : new Map<string, Date>();

  // 2. Create new deliverables from blueprint
  // Observability for the audit-2026-06-11 schema fix: contentTypeInputs was
  // structurally always {} (responseSchema declared an empty object) — this
  // rate makes a regression to that state visible in the logs.
  const filledInputs = assetPlanDeliverables.filter(
    (d) => d.contentTypeInputs && Object.keys(d.contentTypeInputs).length > 0,
  ).length;
  console.info(
    `[asset-plan] contentTypeInputs non-empty: ${filledInputs}/${assetPlanDeliverables.length} deliverables`,
  );
  for (const d of assetPlanDeliverables) {
    const suggestedDate = schedule.get(d.title) ?? null;
    await prisma.deliverable.create({
      data: {
        campaignId,
        title: d.title,
        contentType: d.contentType,
        status: 'NOT_STARTED',
        progress: 0,
        journeyPhase: d.phase ?? null,
        ...(suggestedDate ? { suggestedPublishDate: suggestedDate } : {}),
        settings: JSON.parse(JSON.stringify({
          channel: d.channel,
          phase: d.phase,
          targetPersonas: d.targetPersonas,
          brief: d.brief,
          productionPriority: d.productionPriority,
          estimatedEffort: d.estimatedEffort,
          suggestedOrder: d.suggestedOrder,
          ...(d.contentTypeInputs && Object.keys(d.contentTypeInputs).length > 0
            ? { contentTypeInputs: d.contentTypeInputs }
            : {}),
        })),
      },
    });
  }

  return assetPlanDeliverables.length;
}

// ─── Per-Layer Regeneration ─────────────────────────────────

/**
 * Lenient-first validation for a regenerated full variant (audit 2026-06-11
 * T3): the old code ran the strict parse BEFORE normalizeArchitectureLayer,
 * so regeneration failed on exactly the deviations (`phase` vs `name`, flat
 * personaRelevance, …) the normalizer exists to repair. Normalize + coerce
 * first; only when the repaired object still fails do we throw, as the
 * strict parse did. Return type stays zod-inferred on purpose — the
 * `StrategyLayer` interface lacks the index signature scrubStrategyLayer needs.
 */
function parseRegeneratedFullVariant(raw: unknown) {
  const first = fullVariantSchema.safeParse(raw);
  if (first.success) return first.data;
  const rawRecord = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  // Only repair an architecture that exists as an object — substituting an
  // empty default here would let a response WITHOUT architecture pass the
  // second parse and silently wipe the stored journey (empty journeyPhases
  // is schema-valid). Missing/garbage architecture must fail into enforce.
  const arch = rawRecord.architecture;
  const repaired = {
    ...rawRecord,
    architecture:
      arch && typeof arch === 'object' && !Array.isArray(arch)
        ? normalizeArchitectureLayer(arch as ArchitectureLayer)
        : arch,
  };
  return validateAndCoerce(fullVariantSchema, repaired, 'Regenerate Full Variant (Step 1)', { enforce: true });
}

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
  // Regen-prompts carry no brand-context block — locale contract is
  // injected per call-site (audit 2026-06-11 T5). 5-min cached.
  const { contentLanguage } = await getBrandContext(workspaceId);

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
        withLocaleContract(prompt.system, contentLanguage), prompt.user,
        { temperature: 0.5, maxTokens: 24000, timeoutMs: 300_000, thinking: { anthropic: THINKING_CONFIG.anthropic, openai: THINKING_CONFIG.openai, google: THINKING_CONFIG.google } },
        buildStrategyTracking({ workspaceId, campaignId }, 'regenerateBlueprintLayer:fullVariant', 1),
      ),
    );
    const fullVariant = parseRegeneratedFullVariant(fullVariantRaw);
    blueprint.strategy = scrubStrategyLayer(fullVariant.strategy);
    blueprint.architecture = normalizeArchitectureLayer(fullVariant.architecture);

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
        withLocaleContract(prompt.system, contentLanguage), prompt.user,
        { model: GEMINI_FLASH_LITE, temperature: 0.2, maxOutputTokens: 12000, timeoutMs: 180_000, responseSchema: channelPlanResponseSchema },
        buildStrategyTracking({ workspaceId, campaignId }, 'regenerateBlueprintLayer:channelPlan', 4),
      ),
    );
    // enforce: the regenerate route immediately maps over
    // updatedBlueprint.channelPlan.channels unguarded when persisting.
    blueprint.channelPlan = validateAndCoerce(channelPlanLayerSchema, channelRaw, 'Regenerate Channel Plan', { enforce: true });

    onProgress?.({ step: 4, name: 'Channel Planner', status: 'complete', label: 'Channel plan regenerated' });
    // Fall through to regenerate asset plan
  }

  // Asset plan is always regenerated
  onProgress?.({ step: 5, name: 'Asset Planner', status: 'running', label: 'Regenerating asset plan...' });

  const assetFeedback = layer === 'assetPlan' && feedback ? `\n\nUser feedback: ${feedback}` : '';
  const assetRegenGoalType = campaign.campaignGoalType || 'BRAND_AWARENESS';
  // Same truthy-filter as elaborateJourney — stored blueprints may predate
  // architecture normalization and carry unnamed phases.
  const regenPhaseNames = (blueprint.architecture?.journeyPhases ?? [])
    .map((p: { name?: string }) => p.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0 && name !== 'undefined');
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
      withLocaleContract(assetPrompt.system, contentLanguage), assetPrompt.user,
      { model: GEMINI_FLASH_LITE, temperature: 0.3, maxOutputTokens: 16000, timeoutMs: 180_000, responseSchema: assetPlanResponseSchema },
      buildStrategyTracking({ workspaceId, campaignId }, 'regenerateBlueprintLayer:assetPlan', 5),
    ),
  );
  // No enforce: the regenerate route only persists the asset plan; the launch
  // route guards `deliverables?.length` before creating deliverables.
  blueprint.assetPlan = validateAndCoerce(assetPlanLayerSchema, assetRaw, 'Regenerate Asset Plan');

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
    brandContext: formatBrandContextTier(brandContext, 'summary'),
    personaContext,
    productContext,
  });

  // Use Gemini Flash for speed — summary context keeps prompt small
  const raw = await withStepContext('Phase 1 (Briefing Validation)', 60, () =>
    createStructuredCompletion<BriefingValidation>(
      'google', GEMINI_FLASH,
      prompt.system, prompt.user,
      { temperature: 0.3, maxTokens: 8192, timeoutMs: 45_000 },
      buildStrategyTracking(ctx, 'validateBriefing', 1),
    ),
  );

  onProgress?.({ step: 2, name: 'Analyzing Briefing', status: 'complete', label: 'Analysis complete' });

  // Step 3: Score results
  onProgress?.({ step: 3, name: 'Scoring Results', status: 'running', label: 'Scoring results...' });

  // No enforce: downstream consumers (BriefingReviewView, improveBriefing)
  // guard all array access defensively (gotcha 2026-03-24).
  const result = validateAndCoerce(briefingValidationSchema, raw, 'Phase 1 Briefing Validation');

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
  tracking?: AICallTracking,
): Promise<ImprovedBriefing> {
  const goalType = wizardContext.campaignGoalType ?? 'BRAND_AWARENESS';

  // This call gets no brand context, so the workspace output language must be
  // derived here — without it the rewrite drifted to English on NL briefings
  // (audit 2026-06-11 T5). The only caller always passes tracking with a
  // workspaceId; getBrandContext is 5-min cached, so this stays cheap. The
  // fallback keeps the briefing language stable for tracking-less callers.
  const contentLanguage = tracking?.workspaceId
    ? (await getBrandContext(tracking.workspaceId)).contentLanguage
    : undefined;
  const localeContract =
    buildLocaleSystemFragment(contentLanguage) ||
    "Output language requirement: write every field in the same language as the current briefing fields. Do not translate the briefing into another language.";

  const systemPrompt = `You are a senior campaign strategist. Your task is to improve a campaign briefing based on AI validation feedback. Rewrite each field to address the identified gaps and apply the suggestions while preserving the user's original intent.

Return a JSON object with exactly these 5 fields:
- occasion: string (why this campaign exists, what triggers it)
- audienceObjective: string (what the audience should think, feel, or do)
- coreMessage: string (the single most important message)
- tonePreference: string (desired tone and communication style)
- constraints: string (limitations, budget, timeline, requirements)

Each field must be a substantive, well-written paragraph. Do NOT leave any field empty.

${localeContract}`;

  // Defensive `?? []`: validation may stem from warn-and-passthrough
  // validateAndCoerce output with missing arrays (gotcha 2026-03-24).
  const gapsText = (validation.gaps ?? []).map(g => `- [${g.severity}] ${g.field}: ${g.suggestion}`).join('\n');
  const suggestionsText = (validation.suggestions ?? []).map(s => `- ${s}`).join('\n');

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
${(validation.strengths ?? []).map(s => `- ${s}`).join('\n') || 'None'}

Rewrite all 5 briefing fields, addressing every gap and applying the suggestions. Preserve what's already strong. Make the briefing score-worthy of 90+/100.`;

  const result = await withStepContext('Phase 1c (Improve Briefing)', 60, () =>
    createStructuredCompletion<ImprovedBriefing>(
      'google', GEMINI_FLASH,
      systemPrompt, userPrompt,
      { temperature: 0.5, maxTokens: 8192, timeoutMs: 60_000 },
      tracking ? { ...tracking, sourceIdentifier: tracking.sourceIdentifier ?? 'src/lib/campaigns/strategy-chain.ts:improveBriefing' } : undefined,
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
  // Output-budget 16k → 24k: de foundation-JSON kapte op fast-tier/Haiku af
  // bij 57.606 chars ≈ 16k tokens (dogfood 2026-07-12, agent-pad) waardoor de
  // strategist-tool faalde. De Claude-wrapper streamt (geen SDK-non-streaming-
  // plafond) en budgetWithThinking schaalt de timeout mee. Caveat: deliberate
  // rigor + een workspace-model met een output-cap < 36k (gpt-5.6-terra: 32.768)
  // geeft een API 400 — Anthropic-modellen (64k-cap, de default) passen ruim.
  const foundationBudget = budgetWithThinking(24_000, foundationThinking);

  const raw = await withStepContext('Phase 2 (Strategy Foundation)', Math.round(foundationBudget.timeoutMs / 1000), () =>
    createStructuredCompletion<StrategyFoundation>(
      resolvedProvider, resolvedModel,
      prompt.system, prompt.user,
      { temperature: 0.4, maxTokens: foundationBudget.maxTokens, timeoutMs: foundationBudget.timeoutMs, thinking: foundationThinking },
      buildStrategyTracking(ctx, 'buildStrategyFoundation', 2),
    ),
  );

  onProgress?.({ step: 3, name: 'Deep Analysis', status: 'complete', label: 'Analysis complete' });

  // Step 4: Finalize foundation
  onProgress?.({ step: 4, name: 'Finalizing Foundation', status: 'running', label: 'Synthesizing foundation insights...' });

  // No enforce: StrategyFoundationReviewView guards all array access
  // defensively (gotcha 2026-03-24) and immediate access below is optional-chained.
  const foundation = validateAndCoerce(strategyFoundationSchema, raw, 'Phase 2 Strategy Foundation');

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
  /** Campaign ID for learning-loop tracking. When omitted, tracking falls back to Workspace as parent. */
  campaignId?: string;
  /** Full brand context string (for strategy build which needs everything) */
  brandContext: string;
  /** Raw brand context data block — use with formatBrandContextTier() for lighter phases */
  brandContextData: import('@/lib/ai/prompt-templates').BrandContextBlock;
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
    campaignId: opts.campaignId,
    brandContext,
    brandContextData,
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

  // Use medium tier for insight mining — strategy assets + personality, no competitor/trend details
  const insightBrandContext = formatBrandContextTier(ctx.brandContextData, 'medium');

  const insightPromises = lenses.map(async (lens) => {
    const prompt = buildInsightMiningPrompt({
      brandContext: insightBrandContext,
      personaContext: ctx.personaContext,
      productContext: ctx.productContext,
      competitorContext: ctx.competitorContext,
      trendContext: ctx.trendContext,
      goalType: ctx.goalType,
      briefing: ctx.briefing,
      providerRole: lens.role,
    });

    const lensThinking = thinkingForRigor(lens.provider, 8000, rigor);
    const lensBudget = budgetWithThinking(8_000, lensThinking);
    const result = await withStepContext(`Insight Mining (${lens.role})`, Math.round(lensBudget.timeoutMs / 1000), () =>
      createStructuredCompletion(
        lens.provider,
        lens.model,
        withLocaleContract(prompt.system, ctx.brandContextData.contentLanguage),
        prompt.user,
        { maxTokens: lensBudget.maxTokens, timeoutMs: lensBudget.timeoutMs, thinking: lensThinking },
        buildStrategyTracking(ctx, `generateInsights:${lens.role}`, 1),
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

  // Use medium tier for creative leap — brand identity matters, not competitor/trend details
  const leapBrandContext = formatBrandContextTier(ctx.brandContextData, 'medium');

  const conceptPromises = assignments.map(async (a) => {
    const prompt = buildCreativeLeapPrompt({
      selectedInsight: insightText,
      brandContext: leapBrandContext,
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

    const leapThinking = thinkingForRigor(a.provider, 12_000, rigor);
    const leapBudget = budgetWithThinking(8_000, leapThinking);
    const result = await withStepContext(`Creative Leap (${a.template.name} × ${a.angle.name})`, Math.round(leapBudget.timeoutMs / 1000), () =>
      createStructuredCompletion(
        a.provider,
        a.model,
        withLocaleContract(prompt.system, ctx.brandContextData.contentLanguage),
        prompt.user,
        { maxTokens: leapBudget.maxTokens, timeoutMs: leapBudget.timeoutMs, thinking: leapThinking },
        buildStrategyTracking(ctx, `generateCreativeConcepts:${a.template.id}`, 2),
      ),
    );

    let parsed: unknown;
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      throw new Error('Concept generation returned invalid JSON');
    }
    return scrubConceptOutput(
      {
        ...(parsed as Record<string, unknown>),
        providerUsed: a.provider,
        modelUsed: a.model,
      } as CreativeConcept,
      `Creative Leap (${a.template.name})`,
    );
  });

  const settled = await Promise.allSettled(conceptPromises);
  const concepts: CreativeConcept[] = [];
  const failures: string[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      concepts.push(r.value);
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error('[generateCreativeConcepts] One variant failed:', msg);
      failures.push(msg);
    }
  }

  if (concepts.length === 0) {
    throw new Error(`All 3 concept variants failed: ${failures.join(' | ')}`);
  }

  onProgress?.({ type: 'step', step: 1, name: 'Creative Leap', status: 'complete', label: `${concepts.length} of 3 concepts generated${failures.length > 0 ? ` (${failures.length} failed)` : ''}` } as PipelineEvent);

  return { concepts, selectedConceptIndex: null, selectedInsight };
}

// ─── Phase 2b: Creative Debate (Multi-Round) ────────────────

const MAX_DEBATE_ROUNDS = 3;
const DEBATE_QUALITY_GATE = 70;

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

  // Use light tier for debate — critic/defense need brand positioning + tone, not full frameworks
  const debateBrandContext = formatBrandContextTier(ctx.brandContextData, 'light');

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
      brandContext: debateBrandContext,
      personaContext: ctx.personaContext,
      goalType,
      previousRoundContext,
    });

    const rigor = ctx.pipelineConfig.modelRigor;
    const { model: criticModel, provider: criticProvider } = await resolveModelForRigor(ctx.workspaceId, 'campaign-strategy', rigor);
    const criticThinking = thinkingForRigor(criticProvider, budgets.critic, rigor);
    const criticBudget = budgetWithThinking(8_000, criticThinking);
    const critiqueRaw = await withStepContext(`Creative Critic (Round ${roundNum})`, Math.round(criticBudget.timeoutMs / 1000), () =>
      createStructuredCompletion(
        criticProvider,
        criticModel,
        withLocaleContract(criticPrompt.system, ctx.brandContextData.contentLanguage),
        criticPrompt.user,
        { maxTokens: criticBudget.maxTokens, timeoutMs: criticBudget.timeoutMs, thinking: criticThinking },
        buildStrategyTracking(ctx, `runCreativeDebate:critic:round${roundNum}`, 3),
      ),
    );
    let critique: unknown;
    try {
      critique = typeof critiqueRaw === 'string' ? JSON.parse(critiqueRaw) : critiqueRaw;
    } catch {
      throw new Error(`Creative Critic (Round ${roundNum}) returned invalid JSON`);
    }
    critique = scrubConceptOutput(critique, `Creative Critic (Round ${roundNum})`);
    latestCritique = critique;

    // Gotcha 2026-03-24: models return numeric scores as strings — coerce
    // with Number() instead of a typeof check that silently zeroes them.
    const rawScore = Number((critique as Record<string, unknown>)?.overallCreativeScore);
    let critiqueScore = Number.isFinite(rawScore) ? rawScore : 0;
    // Defensive scale normalization: the quality gate assumes 0-100, but
    // models sometimes score on a 0-10 rubric — such a score could never
    // pass the gate and silently forced all 3 debate rounds.
    if (critiqueScore > 0 && critiqueScore <= 10) {
      console.warn(
        `[strategy-chain] runCreativeDebate round ${roundNum}: overallCreativeScore ${critiqueScore} looks 0-10 scaled — normalizing to ${critiqueScore * 10} for the 0-100 quality gate`,
      );
      critiqueScore = critiqueScore * 10;
    }
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
      brandContext: debateBrandContext,
      personaContext: ctx.personaContext,
      goalType,
      roundContext,
    });

    const { model: defenseModel, provider: defenseProvider } = await resolveModelForRigor(ctx.workspaceId, 'campaign-strategy-b', rigor);
    const defenseThinking = thinkingForRigor(defenseProvider, budgets.defense, rigor);
    const defenseBudget = budgetWithThinking(8_000, defenseThinking);
    const defenseRaw = await withStepContext(`Creative Defense (Round ${roundNum})`, Math.round(defenseBudget.timeoutMs / 1000), () =>
      createStructuredCompletion(
        defenseProvider,
        defenseModel,
        withLocaleContract(defensePrompt.system, ctx.brandContextData.contentLanguage),
        defensePrompt.user,
        { maxTokens: defenseBudget.maxTokens, timeoutMs: defenseBudget.timeoutMs, thinking: defenseThinking },
        buildStrategyTracking(ctx, `runCreativeDebate:defense:round${roundNum}`, 4),
      ),
    );
    let defense: unknown;
    try {
      defense = typeof defenseRaw === 'string' ? JSON.parse(defenseRaw) : defenseRaw;
    } catch {
      throw new Error(`Creative Defense (Round ${roundNum}) returned invalid JSON`);
    }
    // Scrubbing the defense BEFORE the revisedConcept merge below keeps the
    // improved concept (and its round snapshot) free of award jargon too.
    defense = scrubConceptOutput(defense, `Creative Defense (Round ${roundNum})`);
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

  // The trailing locale contract pins the workspace language — the prompt
  // itself carries no language instruction since the Fase 4 jargon/locale
  // sweep removed its hardcoded English-forcing (audit 2026-06-11 T5).
  const result = await withStepContext('Quick Concept Generation', 60, () =>
    createStructuredCompletion(
      'google' as AiProvider,
      GEMINI_FLASH,
      withLocaleContract(quickPrompt.system, ctx.brandContextData.contentLanguage),
      quickPrompt.user,
      { maxTokens: 8000 },
      buildStrategyTracking(ctx, 'generateQuickConcept', 1),
    ),
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof result === 'string' ? JSON.parse(result) : result;
  } catch {
    throw new Error('Quick concept generation returned invalid JSON');
  }
  // Single scrub point covers both the insight and the concept built below.
  parsed = scrubConceptOutput(parsed, 'Quick Concept');

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
 * Architecture JSON contract appended to the strategy-build system prompt.
 * Taken from the synthesizer prompt — the only prompt that spelled out the
 * exact field names. The concept-driven build prompt describes the
 * architecture only loosely, which yielded `phase`-keyed phases without
 * `name` and flat personaRelevance objects (audit 2026-06-11 T3).
 */
const ARCHITECTURE_EXACT_SCHEMA_BLOCK = `CRITICAL JSON SCHEMA — the architecture object MUST use these EXACT field names:

architecture: {
  campaignType: string,
  journeyPhases: [
    {
      id: string,           // lowercase slug, no spaces
      name: string,          // display name for the phase
      description: string,   // Brief description of the phase
      orderIndex: number,    // 0-based position
      goal: string,          // What to achieve in this phase
      kpis: string[],
      personaPhaseData: [    // One entry per persona — REQUIRED
        {
          personaId: string,
          personaName: string,
          needs: string[],
          painPoints: string[],
          mindset: string,
          keyQuestion: string,
          triggers: string[]
        }
      ],
      touchpoints: [
        {
          channel: string,
          contentType: string,
          message: string,
          role: "primary" | "supporting",
          personaRelevance: [  // MUST be an ARRAY of objects, NOT a flat object
            {
              personaId: string,
              relevance: "high" | "medium" | "low",
              messagingAngle: string
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Use "name" (NOT "phase") for the journey phase display name
- Use "id" for the phase identifier (lowercase slug)
- personaRelevance MUST be an ARRAY of objects, NOT a flat object
- personaPhaseData MUST be included — one entry per persona from the input
- Every persona from the input MUST appear in EVERY phase's personaPhaseData`;

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

  // Thinking budget on top of the 16k output budget — nesting it inside
  // left ~4k net output and hard-throws on truncation since Fase 1.
  const thinking = thinkingForRigor(provider, 12_000, rigor);
  const { maxTokens, timeoutMs } = budgetWithThinking(16_000, thinking);

  const result = await withStepContext('Strategy Build', Math.round(timeoutMs / 1000), () =>
    createStructuredCompletion(
      provider,
      model,
      withLocaleContract(`${prompt.system}\n\n${ARCHITECTURE_EXACT_SCHEMA_BLOCK}`, ctx.brandContextData.contentLanguage),
      prompt.user,
      { maxTokens, timeoutMs, thinking },
      buildStrategyTracking(ctx, 'buildConceptDrivenStrategy', 5),
    ),
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof result === 'string' ? JSON.parse(result) : (result as Record<string, unknown>);
  } catch {
    throw new Error('Strategy build returned invalid JSON');
  }

  // Ensure the concept fields are preserved on the strategy layer.
  // Scrub Effie-rubric vocabulary uit LLM-output (interne kwaliteits-criteria
  // mogen niet user-facing lekken — zie gotchas.md 2026-05-17).
  const strategy = scrubStrategyLayer({
    ...(parsed.strategy as Record<string, unknown>),
    humanInsight: approvedInsight.insightStatement,
    creativePlatform: approvedConcept.bigIdea,
    creativeTerritory: approvedConcept.creativeTerritory,
    memorableDevice: approvedConcept.memorableDevice,
    campaignTheme: approvedConcept.campaignLine,
  }) as StrategyLayer;

  if (!parsed.architecture) {
    console.warn('[buildConceptDrivenStrategy] AI did not return architecture object — journey phases will be generated in elaborateJourney()');
  }
  // Normalize like the regen path does — without it, `phase`-keyed phases
  // without `name` flow into the store and later into the asset-planner
  // prompt as literal "undefined" phase names (audit 2026-06-11 T3).
  const architecture = normalizeArchitectureLayer(
    (parsed.architecture ?? { campaignType: 'strategic', journeyPhases: [] }) as ArchitectureLayer,
  );

  onProgress?.({ type: 'step', step: 1, name: 'Strategy Build', status: 'complete', label: 'Strategy built on approved concept' } as PipelineEvent);

  return { strategy, architecture };
}

