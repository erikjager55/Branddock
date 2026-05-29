/**
 * Landing-page type-specifieke quality evaluator (Fase 4 van spec
 * docs/specs/web-page-types/landing-page.md §4d).
 *
 * 6 type-specifieke dimensies bovenop generieke F-VAL pijlers:
 *   1. Hero clarity (2s-test, 4 vragen)        — gewicht 20%
 *   2. Single-CTA discipline                    — gewicht 15%
 *   3. Readability (difficult-words count)      — gewicht 15%
 *   4. Social proof presence                     — gewicht 15%
 *   5. Anatomie-completeness                     — gewicht 20%
 *   6. Objection coverage                        — gewicht 15%
 *
 * 5 van 6 dimensies zijn volledig deterministisch — geen LLM, geen DB,
 * geen API-tokens. Hero-clarity (1) kan optioneel een LLM-judge-injection
 * krijgen voor 4-vragen-evaluatie; default is een deterministische proxy
 * die controleert dat headline + subhead + CTA aanwezig zijn.
 *
 * Composite-score <70 → shouldAutoIterate=true (sluit aan bij Phase 6.11
 * non-improvement-reject patroon).
 *
 * Pure functie — smoke-testable zonder Prisma / Anthropic.
 */

import { componentTypeCounts, flattenPuckText, type PuckLikeData } from "./puck-data-flatten";
import type { BrandTokens } from "./brand-tokens";
import { validateTokenPairs } from "./wcag";

// ─── Types ───────────────────────────────────────────────

export interface LandingPageDimensionScores {
  /** 0-100. Beantwoordt hero 4 vragen (wie/wat/voordeel/volgende stap) binnen 2s. */
  heroClarity: number;
  /** 0-100. Alle CTAs op de pagina drijven naar dezelfde actie (single-CTA). */
  singleCtaDiscipline: number;
  /** 0-100. Difficult-word count <= 140 = full score. */
  readability: number;
  /** 0-100. Trust-strip above-fold + uitgebreide sectie aanwezig. */
  socialProofPresence: number;
  /** 0-100. Alle 6 verplichte secties aanwezig (1/2/4/5/7/8 + footer). */
  anatomyCompleteness: number;
  /** 0-100. FAQ dekt minimaal 3 koop-barrières. */
  objectionCoverage: number;
  /** 0-100. WCAG-compliance check op brand-tokens. Optional — alleen
   *  meegerekend als brandTokens aanwezig is. */
  wcagCompliance?: number;
  /** 0-100. Dimensie 8 — visuele brand-fit (Claude vision-judge).
   *  Optional — alleen meegerekend als evaluateLandingPageQualityWithVision
   *  is aangeroepen + screenshot + designPhilosophy beschikbaar zijn. */
  visualBrandFit?: number;
}

export interface LandingPageQualityResult {
  composite: number;
  threshold: number;
  thresholdMet: boolean;
  shouldAutoIterate: boolean;
  dimensions: LandingPageDimensionScores;
  signals: {
    wordCount: number;
    difficultWordCount: number;
    components: Record<string, number>;
    distinctCtas: string[];
    faqItemCount: number;
  };
}

export interface LandingPageQualityInputs {
  data: PuckLikeData;
  /** Optionele AI-judge-resultaat voor hero-clarity (4-vragen score). */
  heroClarityJudgeScore?: number;
  /** Optionele AI-judge-resultaat voor objection-coverage (categorisering FAQ). */
  objectionCategoriesJudgeCount?: number;
  /** BrandTokens voor WCAG-compliance check (dimensie 7).
   *  Wanneer afwezig: dimensie krijgt geen gewicht in composite. */
  brandTokens?: BrandTokens;
}

// ─── Constanten per spec §4d ─────────────────────────────

/**
 * Gewichten per spec §4d, met Sprint 2 herbalancering om WCAG (10%) toe te
 * voegen. Hero-clarity en anatomie-completeness elk 5% lager om ruimte te maken.
 * Totaal = 100% — als brandTokens afwezig is voor WCAG, wordt het gewicht
 * herverdeeld over de overige 6 dimensies (proportioneel).
 */
const WEIGHTS = {
  heroClarity: 0.15,
  singleCtaDiscipline: 0.15,
  readability: 0.15,
  socialProofPresence: 0.15,
  anatomyCompleteness: 0.15,
  objectionCoverage: 0.15,
  wcagCompliance: 0.10,
} as const;

/** Dimensie 8 gewicht — verlaagt elk ander dimensie-gewicht licht wanneer
 *  meegenomen. Wanneer absent: WCAG + content dimensies krijgen 100%. */
const VISUAL_BRAND_FIT_WEIGHT = 0.10;

const QUALITY_THRESHOLD = 70;

/** Spec §1 #4: max 140 difficult-words = healthy.  */
const READABILITY_HEALTHY_MAX = 140;
const READABILITY_DEGRADED_MAX = 280;

/** Karakter-lengte threshold voor "moeilijk woord" — proxy voor 3+ syllables in NL. */
const DIFFICULT_WORD_MIN_LENGTH = 10;

// ─── Hoofdevaluator ──────────────────────────────────────

export function evaluateLandingPageQuality(
  input: LandingPageQualityInputs,
): LandingPageQualityResult {
  const counts = componentTypeCounts(input.data);
  const flatText = flattenPuckText(input.data);
  const words = flatText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const difficultWordCount = words.filter((w) => w.length >= DIFFICULT_WORD_MIN_LENGTH).length;

  const distinctCtas = collectDistinctCtas(input.data);
  const faqItemCount = countFaqItems(input.data);

  const wcagScore = input.brandTokens
    ? scoreWCAGCompliance(input.brandTokens)
    : undefined;

  const dimensions: LandingPageDimensionScores = {
    heroClarity: scoreHeroClarity(input.data, input.heroClarityJudgeScore),
    singleCtaDiscipline: scoreSingleCtaDiscipline(distinctCtas),
    readability: scoreReadability(difficultWordCount),
    socialProofPresence: scoreSocialProofPresence(counts),
    anatomyCompleteness: scoreAnatomyCompleteness(counts),
    objectionCoverage: scoreObjectionCoverage(
      faqItemCount,
      input.objectionCategoriesJudgeCount,
    ),
    wcagCompliance: wcagScore,
  };

  // Wanneer geen brandTokens: WCAG-gewicht herverdelen over overige 6 dims
  // proportioneel om totaal op 100% te houden.
  const composite = wcagScore === undefined
    ? computeCompositeWithoutWcag(dimensions)
    : computeCompositeWithWcag(dimensions, wcagScore);

  return {
    composite: Math.round(composite),
    threshold: QUALITY_THRESHOLD,
    thresholdMet: composite >= QUALITY_THRESHOLD,
    shouldAutoIterate: composite < QUALITY_THRESHOLD,
    dimensions,
    signals: {
      wordCount,
      difficultWordCount,
      components: counts,
      distinctCtas,
      faqItemCount,
    },
  };
}

// ─── Composite-berekening ────────────────────────────────

function computeCompositeWithWcag(
  d: LandingPageDimensionScores,
  wcag: number,
): number {
  return (
    d.heroClarity * WEIGHTS.heroClarity +
    d.singleCtaDiscipline * WEIGHTS.singleCtaDiscipline +
    d.readability * WEIGHTS.readability +
    d.socialProofPresence * WEIGHTS.socialProofPresence +
    d.anatomyCompleteness * WEIGHTS.anatomyCompleteness +
    d.objectionCoverage * WEIGHTS.objectionCoverage +
    wcag * WEIGHTS.wcagCompliance
  );
}

function computeCompositeWithoutWcag(d: LandingPageDimensionScores): number {
  // Herverdeel WCAG-gewicht (10%) proportioneel over 6 dims (1.67% elk).
  const SCALE = 1 / (1 - WEIGHTS.wcagCompliance);
  return (
    d.heroClarity * WEIGHTS.heroClarity * SCALE +
    d.singleCtaDiscipline * WEIGHTS.singleCtaDiscipline * SCALE +
    d.readability * WEIGHTS.readability * SCALE +
    d.socialProofPresence * WEIGHTS.socialProofPresence * SCALE +
    d.anatomyCompleteness * WEIGHTS.anatomyCompleteness * SCALE +
    d.objectionCoverage * WEIGHTS.objectionCoverage * SCALE
  );
}

/**
 * Composite met dim 8 (visual brand-fit) erbij. Verlaagt content-dimensie-
 * gewichten proportioneel om 100% te behouden.
 */
function applyVisualBrandFit(baseComposite: number, vbf: number): number {
  // Base-composite (zonder dim 8) weegt nu 90% van het totaal; dim 8 weegt 10%.
  return baseComposite * (1 - VISUAL_BRAND_FIT_WEIGHT) + vbf * VISUAL_BRAND_FIT_WEIGHT;
}

// ─── Per-dimensie scorers ────────────────────────────────

/**
 * Dimensie 7 — WCAG-compliance. Valideert kern-token-pairs uit BrandTokens:
 *   - onSurface op surface (body-text)
 *   - surfaceMuted op surface (sub-text)
 *   - onBrand op brand (button-text)
 *   - onAction op action (CTA-text)
 *   - surfaceBorder vs surface (non-text)
 *
 * Score:
 *   - 100 = 0 failures (alle pairs AA+)
 *   - 75  = 1 failure
 *   - 50  = 2 failures
 *   - 25  = 3 failures
 *   - 0   = 4+ failures
 *
 * Pre-render gate in extractor zou bij ideal geval alle failures al
 * voorkomen via fallback. WCAG-dimensie hier vangt edge-cases op.
 */
function scoreWCAGCompliance(tokens: BrandTokens): number {
  const result = validateTokenPairs({
    onSurface: { fg: tokens.onSurface, bg: tokens.surface },
    surfaceMuted: { fg: tokens.surfaceMuted, bg: tokens.surface },
    onBrand: { fg: tokens.onBrand, bg: tokens.brand },
    onAction: { fg: tokens.onAction, bg: tokens.action },
    surfaceBorder: { fg: tokens.surfaceBorder, bg: tokens.surface },
  });
  const failures = result.failureCount;
  if (failures === 0) return 100;
  if (failures === 1) return 75;
  if (failures === 2) return 50;
  if (failures === 3) return 25;
  return 0;
}

/**
 * Dimensie 1 — Hero clarity (2s-test, 4 vragen). Default deterministische
 * proxy: headline + subhead + CTA aanwezig in eerste BrandHero. Caller
 * kan AI-judge-score injecteren voor genuanceerd 4-vragen-oordeel.
 */
function scoreHeroClarity(
  data: PuckLikeData,
  judgeScore: number | undefined,
): number {
  if (typeof judgeScore === "number") {
    return clamp01(judgeScore) * 100;
  }
  // Proxy: check eerste BrandHero heeft alle 3 textuele elementen
  const hero = data.content.find((c) => c.type === "BrandHero");
  if (!hero) return 0;
  const props = hero.props as { headline?: string; sub?: string; ctaLabel?: string };
  let score = 0;
  if (props.headline && props.headline.trim().length > 0) score += 35;
  if (props.sub && props.sub.trim().length > 0) score += 35;
  if (props.ctaLabel && props.ctaLabel.trim().length > 0) score += 30;
  return score;
}

/**
 * Dimensie 2 — Single-CTA discipline. Verzamel alle CTA-labels (BrandHero.ctaLabel
 * + alle BrandCTA.label). Identiek = 100; 2 verschillende = 60; 3+ = 20.
 */
function scoreSingleCtaDiscipline(distinctCtas: string[]): number {
  if (distinctCtas.length === 0) return 0; // geen CTA = fail
  if (distinctCtas.length === 1) return 100;
  if (distinctCtas.length === 2) return 60;
  return 20;
}

/**
 * Dimensie 3 — Readability. Aantal "moeilijke woorden" (>= 10 chars proxy
 * voor 3+ syllables in NL). Spec §1 #4: <= 140 = healthy.
 *   - 0-140 difficult words → 100
 *   - 141-280 → linear 100→0
 *   - 280+ → 0
 */
function scoreReadability(difficultWordCount: number): number {
  if (difficultWordCount <= READABILITY_HEALTHY_MAX) return 100;
  if (difficultWordCount >= READABILITY_DEGRADED_MAX) return 0;
  const range = READABILITY_DEGRADED_MAX - READABILITY_HEALTHY_MAX;
  const excess = difficultWordCount - READABILITY_HEALTHY_MAX;
  return Math.round(100 - (excess / range) * 100);
}

/**
 * Dimensie 4 — Social proof presence. Trust-signal above-fold (1e FeatureGrid
 * fungeert als trust-strip in MVP) + uitgebreide social-proof sectie
 * (Testimonial component aanwezig).
 *   - Beide aanwezig → 100
 *   - Een van beide → 50
 *   - Geen van beide → 0
 *
 * Disclaimer: in MVP-mapping is trust-strip een FeatureGrid; voor v2-component
 * dedicated TrustStrip moet deze check uitgebreid worden.
 */
function scoreSocialProofPresence(counts: Record<string, number>): number {
  const hasTrustOrFeatures = (counts.FeatureGrid ?? 0) > 0;
  const hasTestimonial = (counts.Testimonial ?? 0) > 0;
  let score = 0;
  if (hasTrustOrFeatures) score += 50;
  if (hasTestimonial) score += 50;
  return score;
}

/**
 * Dimensie 5 — Anatomie-completeness. Tel verplichte secties uit spec §2:
 *   1. Hero (BrandHero)
 *   2. Trust-strip (FeatureGrid #1 in MVP)
 *   4. Features (FeatureGrid)
 *   5. Social proof (Testimonial)
 *   7. FAQ
 *   8. Final CTA (BrandCTA)
 *   + Footer (verplicht maar niet genummerd)
 * = 7 verplichte componenten. Conditional (problem RichText, pricing PricingTable)
 * tellen niet mee in completeness — spec markeert ze als optional.
 *
 * Score = (aanwezig / 7) * 100.
 */
function scoreAnatomyCompleteness(counts: Record<string, number>): number {
  const featureGridNeeded = (counts.FeatureGrid ?? 0) >= 2; // trust + features
  const requiredPresent = [
    (counts.BrandHero ?? 0) > 0,
    featureGridNeeded, // telt voor zowel trust-strip als features (2 FeatureGrids)
    (counts.Testimonial ?? 0) > 0,
    (counts.FAQ ?? 0) > 0,
    (counts.BrandCTA ?? 0) > 0,
    (counts.Footer ?? 0) > 0,
  ].filter(Boolean).length;
  // 6 verplichte slots (trust+features samen via featureGridNeeded)
  return Math.round((requiredPresent / 6) * 100);
}

/**
 * Dimensie 6 — Objection coverage. Spec §1 #14: FAQ dekt min 3 koop-barrières.
 *   - 0 FAQ items → 0
 *   - 1-2 → 30
 *   - 3-4 → 60
 *   - 5+ → 100 (matched spec §2 sectie 7 micro-anatomie)
 *
 * Optional: caller kan via objectionCategoriesJudgeCount een LLM-geclassificeerd
 * aantal unieke categorieën meegeven voor nauwkeuriger score.
 */
function scoreObjectionCoverage(
  faqItemCount: number,
  judgeCategoryCount: number | undefined,
): number {
  if (typeof judgeCategoryCount === "number") {
    // Spec §2 lijst 6 categorieën: prijs/implementatie/lock-in/security/vergelijking/geschiktheid
    if (judgeCategoryCount >= 5) return 100;
    if (judgeCategoryCount >= 3) return 70;
    if (judgeCategoryCount >= 1) return 40;
    return 0;
  }
  // Fallback op item-count
  if (faqItemCount === 0) return 0;
  if (faqItemCount <= 2) return 30;
  if (faqItemCount <= 4) return 60;
  return 100;
}

// ─── Helpers ─────────────────────────────────────────────

function collectDistinctCtas(data: PuckLikeData): string[] {
  const ctas = new Set<string>();
  for (const c of data.content) {
    if (c.type === "BrandHero") {
      const label = (c.props as { ctaLabel?: string }).ctaLabel;
      if (label && label.trim()) ctas.add(label.trim());
    } else if (c.type === "BrandCTA") {
      const label = (c.props as { label?: string }).label;
      if (label && label.trim()) ctas.add(label.trim());
    }
  }
  return Array.from(ctas);
}

function countFaqItems(data: PuckLikeData): number {
  let total = 0;
  for (const c of data.content) {
    if (c.type === "FAQ") {
      const items = (c.props as { items?: unknown[] }).items;
      if (Array.isArray(items)) total += items.length;
    }
  }
  return total;
}

function clamp01(n: number): number {
  if (n <= 1) return Math.max(0, n);
  return Math.min(100, n) / 100;
}

// ─── Dimensie 8 — Visual Brand-Fit async wrapper ────────────

export interface LandingPageQualityVisionInputs extends LandingPageQualityInputs {
  /** designPhilosophy uit BrandStyleguide. Required voor visual-judge. */
  designPhilosophy?: string | null;
  /** Brand-context voor scherpere vision-judging. */
  brandName?: string;
  brandColors?: string[];
  brandImageryStyle?: string | null;
  /** CanvasContextStack voor screenshot-render. */
  canvasContext?: import("@/lib/ai/canvas-context").CanvasContextStack | null;
  /** Bypass-flag voor tests of cost-control. Default: laat vision-call lopen. */
  skipVision?: boolean;
}

/**
 * Async wrapper rond evaluateLandingPageQuality met dimensie 8 (visual
 * brand-fit). Roept Playwright + Claude vision aan voor de visuele score.
 *
 * Bij visuele-judge-failure (no philosophy / screenshot-fail / vision-error):
 * composite valt graceful terug op de 7-dim score zonder visualBrandFit.
 *
 * Cost: ~$0.01 per LP (Playwright lokaal gratis + Anthropic vision input).
 */
export async function evaluateLandingPageQualityWithVision(
  input: LandingPageQualityVisionInputs,
): Promise<LandingPageQualityResult> {
  // Step 1 — compute base composite (deterministisch + WCAG)
  const baseResult = evaluateLandingPageQuality(input);

  // Step 2 — skip vision-pad als geen designPhilosophy of expliciet uitgeschakeld
  if (input.skipVision || !input.designPhilosophy || input.designPhilosophy.trim().length === 0) {
    return baseResult;
  }

  // Step 3 — roep vision-judge aan (Playwright + Claude vision)
  try {
    const { judgeVisualBrandFit } = await import("./visual-brand-fit-judge");
    const vbfResult = await judgeVisualBrandFit({
      puckData: input.data as unknown as import("@puckeditor/core").Data,
      ctx: input.canvasContext ?? null,
      designPhilosophy: input.designPhilosophy,
      brandName: input.brandName,
      brandColors: input.brandColors,
      brandImageryStyle: input.brandImageryStyle,
    });

    // Wanneer vision-judge een score retourneerde: integreer in composite
    if (vbfResult.status === "scored" && vbfResult.score !== null) {
      const newComposite = applyVisualBrandFit(baseResult.composite, vbfResult.score);
      return {
        ...baseResult,
        composite: Math.round(newComposite),
        thresholdMet: newComposite >= QUALITY_THRESHOLD,
        shouldAutoIterate: newComposite < QUALITY_THRESHOLD,
        dimensions: {
          ...baseResult.dimensions,
          visualBrandFit: vbfResult.score,
        },
      };
    }

    // Skipped of error: log + return base (graceful)
    if (vbfResult.status !== "scored") {
      console.warn(
        `[landing-page-quality] Visual brand-fit skipped/failed: ${vbfResult.status} — ${vbfResult.reasoning ?? "n/a"}`,
      );
    }
    return baseResult;
  } catch (err) {
    console.warn(
      `[landing-page-quality] Visual brand-fit unexpected error (non-critical): ${err instanceof Error ? err.message : String(err)}`,
    );
    return baseResult;
  }
}
