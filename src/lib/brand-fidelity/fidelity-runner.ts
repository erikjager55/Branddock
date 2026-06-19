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

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  computeFidelityScore,
  type FidelityCompositeResult,
  type FidelityCompositionInput,
} from './composition-engine';
import { getOrCreateFidelityConfig } from './fidelity-config';
import { fetchVoiceguideCentroid } from './voice-similarity';
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from './voice-baseline-1pager';
import { runStrictModeRewrite, type StrictModeResult } from './strict-mode';
import { mapViolationToFindingInput } from './violation-to-finding';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import { Prisma } from '@prisma/client';
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
  /**
   * GEO Fase 3 — activeer de opt-in deterministische GEO-pijler (4e pijler).
   * Compute-gated: alleen bij `true` draait computeGeoScore + telt de pijler mee.
   * Bewust opt-in zodat de brand-fidelity-composite/threshold-semantiek voor
   * bestaande content ongewijzigd blijft; de primaire GEO-meting loopt via de
   * `geoOptimizationAnalysis`-haak bij publish.
   */
  geoOptimizationActive?: boolean;
  /**
   * F33 (audit 2026-05-13): override targetWordCount voor length-control
   * multiplier. Canvas-flow genereert sections (~200-500 woorden), maar
   * content-type-defaults targeten full articles (blog-post 1900 woorden).
   * Zonder override produceert dat -40% judge-penalty op valide sectionele
   * content. Canvas-orchestrator passt nu actualWordCount door om length-
   * control effectief te disablen voor sectionele generation.
   */
  targetWordCountOverride?: number;
  /**
   * Review-fix 2026-06-10: sla NIETS op (geen Deliverable.settings.fidelityScore,
   * geen ContentFidelityScore-rij). Voor transient beslis-scoring zoals de
   * LP silent-iterate: de fire-and-forget settings-persist (read-modify-write)
   * racete daar met de finale settings-write van de route, waardoor net
   * gegenereerde structuredVariantOptions verloren konden gaan — zelfde
   * clobber-klasse als gotcha 2026-06-09.
   */
  skipPersist?: boolean;
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

/**
 * LP-target-fix (audit 2026-06-10): structured-variant webpage-types worden
 * gescoord op de geflattende variant-copy (~440-770 woorden, flatten-variant.ts),
 * niet op een full-page artikel. De registry-midpoint heuristiek gaf hier
 * (100+3000)/2 = 1550 → ratio < 0.5 → ×0.6 "severely short" length-penalty op
 * 46/47 LP-scores (judge-pijler 46.2 i.p.v. raw 75.4). Deze map levert per
 * webpage-type een realistisch scoring-target (empirisch variant-gemiddelde
 * ~646 woorden). Bewust hier en NIET in deliverable-types constraints —
 * minWords/maxWords hebben daar andere consumers (content-validator,
 * auto-iterate shrink-guard, vanilla-baseline).
 */
const STRUCTURED_VARIANT_WORD_TARGETS: Record<string, number> = {
  'landing-page': 650,
  // W1 (page-type-schemas): eigen contracten veranderen de verwachte omvang —
  // product: 3-6 feature-blokken + problem/solution/faq (~750); faq: 3-5
  // popular + 1-3 categorieën × 3-5 items met 40-60-woorden-antwoorden (~800);
  // microsite: 2-4 chapters × 2-3 blokken à 20-60 woorden (~700, ongewijzigd).
  // Afgeleid uit de schema-caps; target=actual (F33) blijft het primaire
  // mechanisme waar de caller de echte wordcount kent.
  'product-page': 750,
  'faq-page': 800,
  'comparison-page': 700,
  microsite: 700,
};

/**
 * Review-fix 2026-06-10: webpage-types worden in TWEE regimes gescoord —
 * structured-variant-copy (~650 woorden) én full component-text via de
 * studio auto-iterate paden (gemeten gem. ~1450 woorden). Eén vast target
 * kan beide niet bedienen; voor webpage-types is target=actual (F33) het
 * enige correcte mechanisme. Deze helper geeft callers die geen variant-
 * context hebben een scoped override: actual voor webpage-types, undefined
 * (= registry-gedrag, byte-identiek aan vóór deze branch) voor al het andere.
 */
export function resolveScoringWordCountOverride(
  contentTypeId: string | null | undefined,
  contentText: string,
): number | undefined {
  if (!contentTypeId || !(contentTypeId in STRUCTURED_VARIANT_WORD_TARGETS)) return undefined;
  const wc = contentText.trim().split(/\s+/).filter(Boolean).length;
  return wc > 0 ? wc : undefined;
}

/** Derive target word count uit content type registry — falls back op 500.
 *  Geëxporteerd voor smoke-tests (scripts/smoke-tests/lp-text-quality-fidelity.ts). */
export function resolveTargetWordCount(contentTypeId: string | null): number {
  if (!contentTypeId) return 500;
  const structuredTarget = STRUCTURED_VARIANT_WORD_TARGETS[contentTypeId];
  if (structuredTarget) return structuredTarget;
  const def = getDeliverableTypeById(contentTypeId);
  if (!def?.constraints) return 500;
  const { minWords, maxWords } = def.constraints;
  if (minWords && maxWords) return Math.round((minWords + maxWords) / 2);
  if (maxWords) return Math.round(maxWords * 0.7); // aim 70% of max as realistic target
  if (minWords) return Math.round(minWords * 1.3);
  return 500;
}

/**
 * Per-content-type composite-threshold. Short-form content (social media,
 * paid ads) heeft natuurlijk lager ceiling op fidelity-dimensies door
 * korte tekst (minder ruimte voor brand-markers + speed-of-reading geeft
 * minder coherence/concreteness signal). Default 75 voor long-form, 65
 * voor short-form.
 *
 * 2026-05-19: nieuwe helper als deel van Fix C uit F-VAL short-form
 * verbeterplan (gerapporteerd 55/100 score op linkedin-post). Alternatief
 * voor per-workspace per-type override via WorkspaceContentTypeThreshold
 * model — die UI-config laag bestaat nog niet, dus hier hardcoded per
 * category. Future: leen uit DB als die UI er is.
 */
const SHORT_FORM_CATEGORIES = new Set([
  'Social Media',
  'Advertising & Paid',
]);
/**
 * LP-target-fix (audit 2026-06-10): webpage-copy is fragmentarisch van aard
 * (headlines, CTA-labels, bullets — zie flatten-variant.ts) en zit qua
 * brand-marker-ruimte tussen long-form en short-form in. Simulatie zonder
 * length-penalty: 94% van LP-scores ≥ 70, 57% ≥ 75 — midden-drempel 70
 * normaliseert het type zonder de lat te laag te leggen.
 */
const MID_FORM_CATEGORIES = new Set(['Website & Landing Pages']);
/** Geëxporteerd voor smoke-tests. */
export function resolveCompositeThreshold(contentTypeId: string | null | undefined): number {
  const DEFAULT = 75;
  const MID_FORM = 70;
  const SHORT_FORM = 65;
  if (!contentTypeId) return DEFAULT;
  const def = getDeliverableTypeById(contentTypeId);
  if (!def) return DEFAULT;
  if (SHORT_FORM_CATEGORIES.has(def.category)) return SHORT_FORM;
  if (MID_FORM_CATEGORIES.has(def.category)) return MID_FORM;
  return DEFAULT;
}

function summarizePersona(stack: CanvasContextStack): string | undefined {
  const persona = stack.personas[0];
  if (!persona) return undefined;
  // serialized is the human-readable persona blob. Cap at 800 chars (was 240
  // pre-2026-05-18) — judge-rubric strategicAnchoring + audienceFit dimensies
  // hadden te weinig context met 240 (architect-persona pains/triggers vielen
  // af, score zakte naar ~73 op B2B long-form). 800 chars dekt role + 2-3
  // pains + 2-3 triggers + key-quote zonder token-budget materieel te raken.
  const blob = persona.serialized?.trim();
  if (!blob) return persona.name;
  return `${persona.name} — ${blob.slice(0, 800)}`;
}

function summarizeStrategy(stack: CanvasContextStack): string | undefined {
  const objective = stack.brief?.objective;
  if (objective && objective.trim().length > 0) return objective.slice(0, 240);
  const platform = stack.concept?.creativePlatform;
  if (platform) return platform.slice(0, 240);
  // Fallback voor content-mode (single-content flow zonder brief/concept):
  // bouw een strategic-anchor uit BrandAsset PURPOSE/POSITIONING/PROMISE.
  // Voorheen returned undefined wat resulteerde in 0 strategicAnchoring-context
  // in judge-prompt → onnodig lage Strategy-pillar score (H3.2 fix 2026-05-18).
  const brand = stack.brand;
  const fallbackParts: string[] = [];
  if (brand.brandPromise) fallbackParts.push(`Promise: ${brand.brandPromise}`);
  else if (brand.brandPurpose) fallbackParts.push(`Purpose: ${brand.brandPurpose}`);
  if (brand.brandEssence) fallbackParts.push(`Essence: ${brand.brandEssence}`);
  if (fallbackParts.length === 0 && brand.brandMission) fallbackParts.push(`Mission: ${brand.brandMission}`);
  if (fallbackParts.length === 0) return undefined;
  return fallbackParts.join(' | ').slice(0, 480);
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
/**
 * Stabiele content-fingerprint voor score-dedupe. sha-256 prefix (16 hex)
 * over getrimde tekst — collision-kans verwaarloosbaar op deze volumes.
 * Geëxporteerd voor smoke-tests + baseline-recompute script.
 */
export function computeContentHash(contentText: string): string {
  return createHash('sha256').update(contentText.trim()).digest('hex').slice(0, 16);
}

async function persistContentFidelityScoreIfPossible(
  deliverableId: string,
  workspaceId: string,
  result: FidelityCompositeResult,
  contentHash?: string,
): Promise<void> {
  try {
    // Pak de meest recente ContentVersion voor deze deliverable.
    // F32 (audit 2026-05-13): voorheen returnde deze function bij ontbreken
    // van ContentVersion → canvas-generated content (waar geen route-handler
    // de ContentVersion creëert zoals components/generate-all wel doet)
    // kreeg silently nooit een ContentFidelityScore in DB. Nu valt de
    // function terug op een lazy-create wanneer geen version bestaat — de
    // FK voor het score-record is dan gegarandeerd.
    let version = await prisma.contentVersion.findFirst({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });
    if (!version) {
      try {
        const { createContentVersion } = await import('@/lib/learning-loop/content-version');
        const created = await createContentVersion({
          deliverableId,
          workspaceId,
          createdBy: 'AI',
        });
        version = { id: created.id };
      } catch (versionErr) {
        console.warn(
          '[fidelity-runner] persistContentFidelityScoreIfPossible: createContentVersion fallback failed:',
          versionErr instanceof Error ? versionErr.message : versionErr,
        );
        return;
      }
    }

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
      // GEO Fase 3 — alleen niet-null wanneer de (opt-in) GEO-pijler actief was.
      geo: result.pillars.geo
        ? { score: result.pillars.geo.score, weight: result.pillars.geo.weight }
        : null,
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

    // Dedupe-guard (audit 2026-06-10): herhaald scoren van byte-identieke
    // content op dezelfde ContentVersion maakt geen nieuwe rij — dat vervuilt
    // type-gemiddelden (één placeholder-deliverable was 10/47 LP-scores).
    // Alleen de meest recente rij telt: een oudere identieke score gevolgd
    // door edits + terug-edit is legitiem her-scoren.
    if (contentHash) {
      const latest = await prisma.contentFidelityScore.findFirst({
        where: { contentVersionId: version.id },
        orderBy: { scoredAt: 'desc' },
        select: { id: true, contentHash: true },
      });
      if (latest?.contentHash === contentHash) {
        console.warn(
          '[fidelity-runner] Skipping duplicate ContentFidelityScore persist (same contentHash %s, version %s)',
          contentHash,
          version.id,
        );
        return;
      }
    }

    // Δ-1 Surface E: persist BrandReviewFinding rows alongside the score so
    // PublishGate (en mogelijk andere internal-content surfaces) dezelfde
    // structured-finding shape kan tonen die external Surface C/D al gebruikt.
    // Nested-create binnen één Prisma-call: 1 round-trip ipv 2.
    const findings = result.pillars.rules.result.rules.violations.map(
      mapViolationToFindingInput,
    );
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
        contentHash: contentHash ?? null,
        // Aggregate-counter voor join-free UI counts (ADR-1). Pre-rolled bij
        // create zodat dashboards en find-list views niet per row een join
        // op BrandReviewFinding hoeven te doen.
        findingsCount: findings.length,
        findings: {
          create: findings.map((f) => ({
            workspaceId,
            location: f.location,
            severity: f.severity,
            category: f.category,
            description: f.description,
            suggestion: f.suggestion ?? null,
            beforeText: null,
            afterText: null,
            evidence: f.evidence ?? Prisma.JsonNull,
          })),
        },
      },
    });
  } catch (err) {
    // Non-fatal — Deliverable.settings.fidelityScore blijft de fallback.
    // Findings-write failure leidt tot empty findings-block in PublishGate
    // (graceful degradatie); score zelf is nog wel beschikbaar.
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

/**
 * Bekende editor/template-placeholder-markers. Content die deze bevat is
 * unfilled scaffold, geen gegenereerde of geschreven copy. Lowercase-match.
 * Geëxporteerd voor smoke-tests.
 */
export const PLACEHOLDER_CONTENT_MARKERS = [
  'schrijf hier je inhoud',
  'lorem ipsum',
  'plaats hier je tekst',
  'your content here',
] as const;

/** Geëxporteerd voor smoke-tests. */
export function containsPlaceholderContent(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_CONTENT_MARKERS.some((marker) => lower.includes(marker));
}

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
    if (containsPlaceholderContent(input.contentText)) {
      // Score-vervuiling-guard (audit 2026-06-10): één placeholder-deliverable
      // ("Schrijf hier je inhoud") leverde 21% van alle LP-judge-scores en
      // drukte het type-gemiddelde ~4 punten. Unfilled editor-defaults zijn
      // geen content — scoren ervan vervuilt benchmarks én verwart de user.
      console.warn(
        '[fidelity-runner] Skipping fidelity scoring: content contains editor placeholder markers (deliverable %s)',
        input.deliverableId,
      );
      return null;
    }

    const [personality, config, voiceguideCentroid, voiceguideRow] = await Promise.all([
      fetchBrandPersonalityInput(input.workspaceId),
      getOrCreateFidelityConfig(input.workspaceId),
      fetchVoiceguideCentroid(input.workspaceId),
      // Δ-3: full voiceguide row for 1-pager derivation (separate from
      // fetchBrandPersonalityInput which only reads 2 fields). Cheap query
      // since BrandVoiceguide is keyed on workspaceId (unique).
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId: input.workspaceId },
      }),
    ]);

    // F33: gebruik override (van canvas-orchestrator) als beschikbaar; anders
    // content-type registry default. Override is nuttig voor sectionele canvas-
    // flow content waar de content-type target (volledig artikel) niet past.
    const targetWordCount =
      typeof input.targetWordCountOverride === 'number' && input.targetWordCountOverride > 0
        ? input.targetWordCountOverride
        : resolveTargetWordCount(input.contentTypeId);
    const brandName = input.stack.brand.brandName ?? 'Brand';
    const brandVoiceSummary = summarizeBrandVoice(input.stack, personality);
    const personaSummary = summarizePersona(input.stack);
    const strategySummary = summarizeStrategy(input.stack);
    // Δ-3: derived 1-pager string for judge-prompt embed. Empty-baseline when
    // no voiceguide → format() returns placeholder strings, prompt safely degrades.
    const voiceBaseline1Pager = formatVoiceBaseline1Pager(
      deriveVoiceBaseline1Pager(voiceguideRow),
    );

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
      // Audit 2026-06-10: geseede vocabularyDo hoort in de allowlist van
      // detector + rules-heuristiek (zie FidelityCompositionInput JSDoc).
      brandVocabularyDo: (voiceguideRow?.vocabularyDo ?? []).filter(
        (w): w is string => typeof w === 'string',
      ),
      generatorProvider: input.generatorProvider,
      targetWordCount,
      // Fix C 2026-05-19: per-content-type threshold ipv DEFAULT 75 voor
      // iedereen. Short-form (Social Media, Advertising) krijgt 65.
      compositeThreshold: resolveCompositeThreshold(input.contentTypeId),
      pillarWeights: {
        style: config.styleWeight,
        judge: config.judgeWeight,
        rules: config.ruleWeight,
      },
      rubricWeights,
      skipJudge: input.skipJudge,
      // GEO Fase 3 — opt-in 4e pijler; alleen actief wanneer een caller dit zet
      // (de live GEO-meting loopt primair via de geoOptimizationAnalysis-haak).
      geoOptimizationActive: input.geoOptimizationActive,
      voiceguideCentroid,
      voiceBaseline1Pager,
    };

    const result = await computeFidelityScore(compositionInput);

    // Persist async — don't await, don't block the orchestrator
    if (!input.skipPersist) {
      void persistFidelityScore(input.deliverableId, result);
      void persistContentFidelityScoreIfPossible(
        input.deliverableId,
        input.workspaceId,
        result,
        computeContentHash(input.contentText),
      );
    }

    return { result, compositionInput };
  } catch (err) {
    // 2026-05-19 — log full stack so we can diagnose why composite scoring
    // skips silently. Previously only the message was logged which made it
    // impossible to tell whether the judge LLM call failed, voiceguide
    // fetch threw, or computeFidelityScore itself crashed.
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.warn(
      '[fidelity-runner] Scoring failed (non-fatal) for content-type %s, workspace %s: %s',
      input.contentTypeId,
      input.workspaceId,
      errMsg,
    );
    if (errStack) {
      console.warn('[fidelity-runner] Stack trace:\n' + errStack);
    }
    // Re-throw so the orchestrator's fidelity_score_skipped reason field
    // gets the actual error message instead of a generic "insufficient
    // signal" placeholder. The orchestrator already catches and surfaces.
    throw err;
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
        computeContentHash(strictResult.finalText),
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
