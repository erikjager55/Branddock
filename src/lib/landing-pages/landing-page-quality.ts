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
}

// ─── Constanten per spec §4d ─────────────────────────────

const WEIGHTS = {
  heroClarity: 0.2,
  singleCtaDiscipline: 0.15,
  readability: 0.15,
  socialProofPresence: 0.15,
  anatomyCompleteness: 0.2,
  objectionCoverage: 0.15,
} as const;

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
  };

  const composite =
    dimensions.heroClarity * WEIGHTS.heroClarity +
    dimensions.singleCtaDiscipline * WEIGHTS.singleCtaDiscipline +
    dimensions.readability * WEIGHTS.readability +
    dimensions.socialProofPresence * WEIGHTS.socialProofPresence +
    dimensions.anatomyCompleteness * WEIGHTS.anatomyCompleteness +
    dimensions.objectionCoverage * WEIGHTS.objectionCoverage;

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

// ─── Per-dimensie scorers ────────────────────────────────

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
