// ============================================================
// F-VAL fidelity-runner — orchestrator-facing wrapper
//
// Eén-stop helper die het canvas-orchestrator (en straks de Studio)
// aanroept om gegenereerde content te scoren tegen alle drie pijlers.
// Wraps composition-engine met:
//   - Brand context fetching (BrandPersonality van BrandAsset table)
//   - Persistence naar Deliverable.settings.fidelityScore
//   - Fail-soft semantiek: failures NEVER block content generation
//
// Bewust losgekoppeld van canvas-orchestrator zodat we straks dezelfde
// runner kunnen aanroepen vanuit Studio quality-refresh of bulk-scoring
// research scripts.
// ============================================================

import { prisma } from '@/lib/prisma';
import { computeFidelityScore, type FidelityCompositeResult } from './composition-engine';
import { getOrCreateFidelityConfig } from './fidelity-config';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { GeneratorProvider } from './judge-dispatcher';
import type { GEvalDimension } from './g-eval-rubric';

// ─── Types ──────────────────────────────────────────

interface PersonalityTraitInput {
  name?: string;
  description?: string;
  weAreThis?: string;
  butNeverThat?: string;
}

interface BrandPersonalityInput {
  personalityTraits?: PersonalityTraitInput[];
  wordsWeUse?: string[];
  brandVoiceDescription?: string;
}

export interface FidelityRunInput {
  workspaceId: string;
  /** Deliverable record on which to persist the score */
  deliverableId: string;
  /** Deliverable contentType id (e.g. 'blog-post'); used for target word count */
  contentTypeId: string | null;
  /** Concatenated first-variant content for scoring */
  contentText: string;
  /** Canvas stack — used to derive persona/strategy summaries */
  stack: CanvasContextStack;
  /** Generator provider — bepaalt cross-family judge keuze */
  generatorProvider: GeneratorProvider;
  /** Skip pijler 2 judge (fast path, deterministische scoring only) */
  skipJudge?: boolean;
}

// ─── Brand Personality fetcher ──────────────────────

/**
 * Fetch structured BrandPersonality data uit BrandAsset table.
 * Pijler 1 style-scorer gebruikt wordsWeUse + personalityTraits;
 * deze zitten in frameworkData JSON, niet in de afgeleide brand context string.
 *
 * Returns null wanneer geen BRAND_PERSONALITY asset bestaat — caller skipt
 * dan pijler 1 en draait alleen pijlers 2 + 3 (composition normaliseert weights).
 */
async function fetchBrandPersonalityInput(workspaceId: string): Promise<BrandPersonalityInput | null> {
  try {
    const asset = await prisma.brandAsset.findFirst({
      where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
      select: { frameworkData: true },
    });
    if (!asset?.frameworkData) return null;

    const data = asset.frameworkData as Record<string, unknown>;

    const wordsWeUse = Array.isArray(data.wordsWeUse)
      ? data.wordsWeUse.filter((w): w is string => typeof w === 'string')
      : [];

    const traitsRaw = Array.isArray(data.personalityTraits) ? data.personalityTraits : [];
    const personalityTraits: PersonalityTraitInput[] = traitsRaw
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t) => ({
        name: typeof t.name === 'string' ? t.name : undefined,
        description: typeof t.description === 'string' ? t.description : undefined,
        weAreThis: typeof t.weAreThis === 'string' ? t.weAreThis : undefined,
        butNeverThat: typeof t.butNeverThat === 'string' ? t.butNeverThat : undefined,
      }));

    const brandVoiceDescription =
      typeof data.brandVoiceDescription === 'string' ? data.brandVoiceDescription : undefined;

    return { wordsWeUse, personalityTraits, brandVoiceDescription };
  } catch (err) {
    console.warn('[fidelity-runner] Failed to fetch BrandPersonality:', (err as Error).message);
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────

/** Derive target word count uit content type registry — falls back op 500 */
function resolveTargetWordCount(contentTypeId: string | null): number {
  if (!contentTypeId) return 500;
  const def = getDeliverableTypeById(contentTypeId);
  if (!def?.constraints) return 500;
  const { minWords, maxWords } = def.constraints;
  if (minWords && maxWords) return Math.round((minWords + maxWords) / 2);
  if (maxWords) return Math.round(maxWords * 0.7); // aim 70% of max as realistic target
  if (minWords) return Math.round(minWords * 1.3);
  return 500;
}

function summarizePersona(stack: CanvasContextStack): string | undefined {
  const persona = stack.personas[0];
  if (!persona) return undefined;
  // serialized is the human-readable persona blob — first ~240 chars give
  // the judge enough context (role + frustrations + key triggers) without
  // exploding token usage.
  const blob = persona.serialized?.trim();
  if (!blob) return persona.name;
  return `${persona.name} — ${blob.slice(0, 240)}`;
}

function summarizeStrategy(stack: CanvasContextStack): string | undefined {
  const objective = stack.brief?.objective;
  if (objective && objective.trim().length > 0) return objective.slice(0, 240);
  const platform = stack.concept?.creativePlatform;
  if (platform) return platform.slice(0, 240);
  return undefined;
}

function summarizeBrandVoice(stack: CanvasContextStack, personality: BrandPersonalityInput | null): string {
  if (personality?.brandVoiceDescription) return personality.brandVoiceDescription;
  if (stack.brand.brandPersonality) return stack.brand.brandPersonality.slice(0, 600);
  if (stack.brand.brandToneOfVoice) return stack.brand.brandToneOfVoice.slice(0, 600);
  return 'Brand voice not specified';
}

// ─── Persistence ────────────────────────────────────

/**
 * Persist fidelity score op Deliverable.settings.fidelityScore.
 *
 * Bewust GEEN ContentFidelityScore record — die heeft een verplichte FK
 * naar ContentVersion (Studio-snapshot model) die canvas-content nog niet heeft.
 * Wanneer de canvas → Studio version flow vaststaat schakelen we over op
 * het polished model.
 */
async function persistFidelityScore(
  deliverableId: string,
  result: FidelityCompositeResult,
): Promise<void> {
  try {
    const existing = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { settings: true },
    });
    const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};

    const fidelityScoreSnapshot = {
      compositeScore: result.compositeScore,
      thresholdMet: result.thresholdMet,
      compositeThreshold: result.compositeThreshold,
      detectorVerdict: result.detectorVerdict,
      humanBaselinePosition: result.humanBaselinePosition,
      pillars: {
        style: { score: result.pillars.style.score, weight: result.pillars.style.weight },
        judge: result.pillars.judge
          ? {
              score: result.pillars.judge.score,
              weight: result.pillars.judge.weight,
              judgeProvider: result.pillars.judge.result.judgeProvider,
              judgeModel: result.pillars.judge.result.judgeModel,
            }
          : null,
        rules: {
          score: result.pillars.rules.score,
          weight: result.pillars.rules.weight,
          violationCount: result.pillars.rules.result.rules.violations.length,
        },
      },
      wordCount: result.wordCount,
      scorerVersion: result.scorerVersion,
      scoredAt: new Date().toISOString(),
    };

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        settings: { ...currentSettings, fidelityScore: fidelityScoreSnapshot },
      },
    });
  } catch (err) {
    console.warn('[fidelity-runner] Persistence failed:', (err as Error).message);
  }
}

// ─── Main API ───────────────────────────────────────

/**
 * Score gegenereerde content tegen alle drie F-VAL pijlers.
 *
 * Returns null bij iedere voorzienbare failure (BrandPersonality missing,
 * judge call timeout, etc.) — caller moet falen niet als blokkerend behandelen.
 *
 * Side effects:
 *  - persistFidelityScore wordt asynchroon aangeroepen na de score-berekening
 */
export async function runFidelityScoring(
  input: FidelityRunInput,
): Promise<FidelityCompositeResult | null> {
  try {
    const wordCount = input.contentText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      // Niet genoeg signaal voor een betekenisvolle score
      return null;
    }

    const [personality, config] = await Promise.all([
      fetchBrandPersonalityInput(input.workspaceId),
      getOrCreateFidelityConfig(input.workspaceId),
    ]);

    const targetWordCount = resolveTargetWordCount(input.contentTypeId);
    const brandName = input.stack.brand.brandName ?? 'Brand';
    const brandVoiceSummary = summarizeBrandVoice(input.stack, personality);
    const personaSummary = summarizePersona(input.stack);
    const strategySummary = summarizeStrategy(input.stack);

    // FidelityConfig.rubricWeights is JSON; cast to expected shape (defensive)
    const rubricWeights =
      config.rubricWeights && typeof config.rubricWeights === 'object'
        ? (config.rubricWeights as Partial<Record<GEvalDimension, number>>)
        : undefined;

    const result = await computeFidelityScore({
      contentText: input.contentText,
      workspaceId: input.workspaceId,
      brandName,
      brandVoiceSummary,
      personaSummary,
      strategySummary,
      personality,
      generatorProvider: input.generatorProvider,
      targetWordCount,
      pillarWeights: {
        style: config.styleWeight,
        judge: config.judgeWeight,
        rules: config.ruleWeight,
      },
      rubricWeights,
      skipJudge: input.skipJudge,
    });

    // Persist async — don't await, don't block the orchestrator
    void persistFidelityScore(input.deliverableId, result);

    return result;
  } catch (err) {
    console.warn('[fidelity-runner] Scoring failed (non-fatal):', (err as Error).message);
    return null;
  }
}

/**
 * Format result naar het SSE event payload shape verwacht door demo-UI.
 * Held klein — UI kan via deliverable.settings.fidelityScore meer detail ophalen.
 */
export function buildFidelityScoreEventPayload(result: FidelityCompositeResult) {
  return {
    compositeScore: result.compositeScore,
    thresholdMet: result.thresholdMet,
    compositeThreshold: result.compositeThreshold,
    detectorVerdict: result.detectorVerdict,
    humanBaselinePosition: result.humanBaselinePosition,
    pillars: {
      style: result.pillars.style.score,
      judge: result.pillars.judge?.score ?? null,
      rules: result.pillars.rules.score,
    },
    elapsedMs: result.elapsedMs,
    scorerVersion: result.scorerVersion,
  };
}
