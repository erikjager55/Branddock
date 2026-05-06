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
import {
  computeFidelityScore,
  type FidelityCompositeResult,
  type FidelityCompositionInput,
} from './composition-engine';
import { getOrCreateFidelityConfig } from './fidelity-config';
import { fetchVoiceguideCentroid } from './voice-similarity';
import { runStrictModeRewrite, type StrictModeResult } from './strict-mode';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { GeneratorProvider } from './judge-dispatcher';
import type { GEvalDimension } from './g-eval-rubric';
import type { HumanVoiceMode } from '@prisma/client';

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
 * Fetch structured voice signals voor pijler 1 style-scorer.
 *
 * BV-WIRE migration (W-1, minimal data-source swap):
 * - wordsWeUse + voiceDescription komen uit BrandVoiceguide (nieuw single
 *   source of truth voor voice). Fallback naar legacy BrandPersonality.
 * - personalityTraits komen uit BrandPersonality (NIET in voiceguide).
 *
 * Returns null wanneer beide bronnen leeg zijn — caller skipt pijler 1 en
 * draait alleen pijlers 2 + 3 (composition normaliseert weights).
 *
 * Het centroid-embedding cosine-similarity algoritme (W-1 full) komt later;
 * dit is een data-source migration die het algoritme intact laat.
 */
async function fetchBrandPersonalityInput(workspaceId: string): Promise<BrandPersonalityInput | null> {
  try {
    const [voiceguide, asset] = await Promise.all([
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: { wordsWeUse: true, voiceDescription: true },
      }),
      prisma.brandAsset.findFirst({
        where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
        select: { frameworkData: true },
      }),
    ]);

    // Voiceguide wint voor voice-velden; legacy BrandPersonality voice-data
    // alleen gebruiken als fallback voor unmigrated workspaces.
    const personalityData = (asset?.frameworkData ?? null) as Record<string, unknown> | null;

    let wordsWeUse: string[] = [];
    let brandVoiceDescription: string | undefined;

    if (voiceguide && (voiceguide.wordsWeUse?.length || voiceguide.voiceDescription)) {
      wordsWeUse = (voiceguide.wordsWeUse ?? []).filter(
        (w): w is string => typeof w === 'string',
      );
      brandVoiceDescription =
        typeof voiceguide.voiceDescription === 'string' && voiceguide.voiceDescription.length > 0
          ? voiceguide.voiceDescription
          : undefined;
    } else if (personalityData) {
      // Legacy fallback — BrandPersonality.frameworkData voice-velden
      if (Array.isArray(personalityData.wordsWeUse)) {
        wordsWeUse = personalityData.wordsWeUse.filter((w): w is string => typeof w === 'string');
      }
      if (typeof personalityData.brandVoiceDescription === 'string') {
        brandVoiceDescription = personalityData.brandVoiceDescription;
      }
    }

    // personalityTraits leven NIET in voiceguide — altijd uit BrandPersonality
    const traitsRaw =
      personalityData && Array.isArray(personalityData.personalityTraits)
        ? personalityData.personalityTraits
        : [];
    const personalityTraits: PersonalityTraitInput[] = traitsRaw
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t) => ({
        name: typeof t.name === 'string' ? t.name : undefined,
        description: typeof t.description === 'string' ? t.description : undefined,
        weAreThis: typeof t.weAreThis === 'string' ? t.weAreThis : undefined,
        butNeverThat: typeof t.butNeverThat === 'string' ? t.butNeverThat : undefined,
      }));

    // Beide bronnen leeg → null returnen voor pijler 1 skip
    if (wordsWeUse.length === 0 && personalityTraits.length === 0) return null;

    return { wordsWeUse, personalityTraits, brandVoiceDescription };
  } catch (err) {
    console.warn('[fidelity-runner] Failed to fetch voice signals:', (err as Error).message);
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

/**
 * Opt-in dual-write naar de polished ContentFidelityScore tabel.
 *
 * Activeert alleen wanneer er een ContentVersion bestaat die bij deze
 * Deliverable hoort — in canvas-only flows (zonder Studio version) is
 * dit een no-op. Wanneer canvas → Studio version flow wordt gewired
 * (toekomstige stap, opensaande task #27) gaat dit automatisch werken
 * zonder code-changes hier.
 *
 * judgeIdentifier blijft consistent ("composition-engine-v1.0") zodat
 * downstream queries kunnen filteren op judge-source. ContentFidelityScore
 * is 1:N met ContentVersion (multi-judge support — andere scorers zoals
 * de learning-loop scorer kunnen co-existeren).
 */
async function persistContentFidelityScoreIfPossible(
  deliverableId: string,
  workspaceId: string,
  result: FidelityCompositeResult,
): Promise<void> {
  try {
    // Pak de meest recente ContentVersion voor deze deliverable.
    // Geen-version = canvas-only piece → no-op.
    const version = await prisma.contentVersion.findFirst({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });
    if (!version) return;

    const pillarScoresJson = {
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
    };

    const subCriteriaScoresJson: Record<string, { score: number; pillar: string; source: string; rationale?: string }> = {};
    if (result.pillars.judge) {
      const judge = result.pillars.judge.result;
      for (const [key, dimScore] of Object.entries(judge.scores)) {
        subCriteriaScoresJson[key] = {
          score: dimScore.score,
          pillar: 'judge',
          source: `${judge.judgeProvider}/${judge.judgeModel}`,
          rationale: dimScore.reasoning,
        };
      }
    }

    const ruleViolationsJson = result.pillars.rules.result.rules.violations.map((v) => ({
      ruleId: v.ruleId,
      severity: v.severity,
      message: v.message,
      snippet: v.snippet || undefined,
      source: 'rule-compiler',
      pillar: 'rules',
    }));

    await prisma.contentFidelityScore.create({
      data: {
        workspaceId,
        contentVersionId: version.id,
        judgeIdentifier: 'composition-engine-v1.0',
        compositeScore: result.compositeScore,
        pillarScores: pillarScoresJson,
        subCriteriaScores: subCriteriaScoresJson,
        ruleViolations: ruleViolationsJson,
        thresholdMet: result.thresholdMet,
        scorerVersion: result.scorerVersion,
      },
    });
  } catch (err) {
    // Non-fatal — Deliverable.settings.fidelityScore blijft de fallback.
    console.warn('[fidelity-runner] ContentFidelityScore dual-write failed:', (err as Error).message);
  }
}

/**
 * Persist STRICT rewrite snapshot op Deliverable.settings.strictRewrite.
 * Bewaart de finale tekst + before/after detector signaal zodat UI hem
 * kan ophalen voor de "Bekijk STRICT-verbeterde versie" preview panel.
 */
async function persistStrictRewrite(
  deliverableId: string,
  rewriteText: string,
  result: StrictModeResult,
): Promise<void> {
  try {
    const existing = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { settings: true },
    });
    const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};

    const strictRewriteSnapshot = {
      text: rewriteText,
      decisionReason: result.decisionReason,
      rewriteAttempted: result.rewriteAttempted,
      before: {
        verdict: result.originalResult.verdict,
        humanBaselinePosition: result.originalResult.humanBaselinePosition,
        scorePer1000Words: Math.round(result.originalResult.scorePer1000Words * 10) / 10,
      },
      after: {
        verdict: result.finalResult.verdict,
        humanBaselinePosition: result.finalResult.humanBaselinePosition,
        scorePer1000Words: Math.round(result.finalResult.scorePer1000Words * 10) / 10,
      },
      rewrittenAt: new Date().toISOString(),
    };

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        settings: { ...currentSettings, strictRewrite: strictRewriteSnapshot },
      },
    });
  } catch (err) {
    console.warn('[fidelity-runner] STRICT persist failed:', (err as Error).message);
  }
}

// ─── Main API ───────────────────────────────────────

export interface FidelityRunOutcome {
  result: FidelityCompositeResult;
  /** De gederiveerde composition input — re-usable voor STRICT re-scoring */
  compositionInput: FidelityCompositionInput;
}

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
): Promise<FidelityRunOutcome | null> {
  try {
    const wordCount = input.contentText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      // Niet genoeg signaal voor een betekenisvolle score
      return null;
    }

    const [personality, config, voiceguideCentroid] = await Promise.all([
      fetchBrandPersonalityInput(input.workspaceId),
      getOrCreateFidelityConfig(input.workspaceId),
      fetchVoiceguideCentroid(input.workspaceId),
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

    const compositionInput: FidelityCompositionInput = {
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
      voiceguideCentroid,
    };

    const result = await computeFidelityScore(compositionInput);

    // Persist async — don't await, don't block the orchestrator
    void persistFidelityScore(input.deliverableId, result);
    void persistContentFidelityScoreIfPossible(input.deliverableId, input.workspaceId, result);

    return { result, compositionInput };
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
  // Pillar score is null wanneer de pijler is overgeslagen (weight 0):
  // pijler 1 zonder declared BrandPersonality vocab/traits, of pijler 2
  // expliciet gedisabled via skipJudge. UI toont "n.v.t." i.p.v. 0/100.
  return {
    compositeScore: result.compositeScore,
    thresholdMet: result.thresholdMet,
    compositeThreshold: result.compositeThreshold,
    detectorVerdict: result.detectorVerdict,
    humanBaselinePosition: result.humanBaselinePosition,
    pillars: {
      style: result.pillars.style.weight > 0 ? result.pillars.style.score : null,
      judge: result.pillars.judge?.score ?? null,
      rules: result.pillars.rules.score,
    },
    elapsedMs: result.elapsedMs,
    scorerVersion: result.scorerVersion,
  };
}

// ─── STRICT mode runner ─────────────────────────────

const STRICT_REWRITE_MODEL = 'claude-sonnet-4-6';
const STRICT_REWRITE_MAX_TOKENS = 8000;

export interface StrictRunInput {
  /** Composition input van de eerste scoring run — hergebruikt voor re-scoring */
  compositionInput: FidelityCompositionInput;
  /** Deliverable ID voor persistentie van de nieuwe score-snapshot */
  deliverableId: string;
}

export interface StrictRunResult {
  /** True wanneer rewrite improvement opleverde (verdict-drop + score-drop) */
  improved: boolean;
  /** Nieuwe finale tekst — origineel als rewrite niet beter was */
  finalText: string;
  /** Decisie logging voor SSE/persistence */
  strictResult: StrictModeResult;
  /** Hercomputed composition score op finale tekst — null als scoring faalde */
  finalFidelityScore: FidelityCompositeResult | null;
}

/**
 * Anthropic-gebaseerde rewrite callback. Bewust geen extended thinking —
 * STRICT rewrite is herschrijfwerk, geen reasoning.
 */
async function callAnthropicRewrite(feedbackPrompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured for STRICT rewrite');
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: STRICT_REWRITE_MODEL,
    max_tokens: STRICT_REWRITE_MAX_TOKENS,
    system:
      'You are a senior Dutch-language content editor. Rewrite to eliminate AI patterns while preserving structure, factual content, and approximate length. Output only the revised content, no preamble or commentary.',
    messages: [{ role: 'user', content: feedbackPrompt }],
  });

  const finalMessage = await stream.finalMessage();
  const block = finalMessage.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : '';
  return text.trim();
}

/**
 * Run STRICT mode evaluatie + rewrite + re-score.
 *
 * Returns null wanneer humanVoiceMode !== STRICT — caller hoeft humanVoiceMode
 * niet zelf te checken voor early-exit. Wanneer rewrite plaatsvindt en
 * succesvol is herbereken we de composition score voor accurate UI display
 * en persisten dat als nieuwe snapshot.
 */
export async function runStrictModeIfApplicable(
  input: StrictRunInput,
  humanVoiceMode: HumanVoiceMode,
): Promise<StrictRunResult | null> {
  if (humanVoiceMode !== 'STRICT') return null;
  const original = input.compositionInput.contentText;
  if (original.split(/\s+/).filter(Boolean).length < 50) return null;

  try {
    const strictResult = await runStrictModeRewrite(original, async ({ feedbackPrompt }) => {
      return callAnthropicRewrite(feedbackPrompt);
    });

    // Geen rewrite uitgevoerd of geen improvement → bail
    if (!strictResult.rewriteAttempted || strictResult.finalText === original) {
      return {
        improved: false,
        finalText: original,
        strictResult,
        finalFidelityScore: null,
      };
    }

    // Rewrite was an improvement → persist + herbereken composition score
    void persistStrictRewrite(input.deliverableId, strictResult.finalText, strictResult);

    let finalFidelityScore: FidelityCompositeResult | null = null;
    try {
      finalFidelityScore = await computeFidelityScore({
        ...input.compositionInput,
        contentText: strictResult.finalText,
      });

      void persistFidelityScore(input.deliverableId, finalFidelityScore);
      void persistContentFidelityScoreIfPossible(
        input.deliverableId,
        input.compositionInput.workspaceId,
        finalFidelityScore,
      );
    } catch (rescoringErr) {
      console.warn('[fidelity-runner] STRICT re-scoring failed:', (rescoringErr as Error).message);
    }

    return {
      improved: true,
      finalText: strictResult.finalText,
      strictResult,
      finalFidelityScore,
    };
  } catch (err) {
    console.warn('[fidelity-runner] STRICT mode failed (non-fatal):', (err as Error).message);
    return null;
  }
}

/**
 * SSE event payload voor strict_rewrite_complete. Bevat before/after
 * detector signaal + (indien beschikbaar) hercomputed composition score
 * die de fidelityScore in store overschrijft.
 */
/** Aantal chars uit rewrite-tekst dat over de wire gaat — UI haalt rest van DB */
const REWRITE_PREVIEW_CHARS = 1500;

export function buildStrictRewriteEventPayload(
  result: StrictRunResult,
  finalScore: FidelityCompositeResult | null,
) {
  return {
    improved: result.improved,
    decisionReason: result.strictResult.decisionReason,
    rewriteAttempted: result.strictResult.rewriteAttempted,
    before: {
      verdict: result.strictResult.originalResult.verdict,
      humanBaselinePosition: result.strictResult.originalResult.humanBaselinePosition,
      scorePer1000Words: Math.round(result.strictResult.originalResult.scorePer1000Words * 10) / 10,
    },
    after: {
      verdict: result.strictResult.finalResult.verdict,
      humanBaselinePosition: result.strictResult.finalResult.humanBaselinePosition,
      scorePer1000Words: Math.round(result.strictResult.finalResult.scorePer1000Words * 10) / 10,
    },
    /** Preview van eerste 1500 chars — volledige tekst staat op
     *  Deliverable.settings.strictRewrite.text en is via PATCH endpoint
     *  beschikbaar. Bewust truncated om SSE chunk klein te houden. */
    rewritePreview: result.improved
      ? result.finalText.slice(0, REWRITE_PREVIEW_CHARS) +
        (result.finalText.length > REWRITE_PREVIEW_CHARS ? '\n\n[…volledige tekst beschikbaar]' : '')
      : null,
    finalScore: finalScore ? buildFidelityScoreEventPayload(finalScore) : null,
  };
}
