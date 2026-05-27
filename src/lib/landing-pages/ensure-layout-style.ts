/**
 * Lazy LayoutStyle-inference (Pad C V2-2).
 *
 * Wanneer BrandStyleguide.layoutStyle null is, infereer een sensible default
 * uit archetype + brand-tone-signals en persist. Volgende generations lezen
 * het uit cache.
 *
 * Deterministisch (geen AI-call): elke archetype heeft een base LayoutStyle,
 * en tone/values-keywords kunnen die nudgen naar een buur-style. Beschouw dit
 * als "best-guess default" — user kan altijd overrulen via brand-styling UI.
 *
 * Failure-mode: bij DB-error wordt niet ge-throwed; caller krijgt
 * layoutStyle=null terug en variant-generator valt terug op
 * DEFAULT_LAYOUT_STYLE (COMMERCIAL).
 *
 * Module-design: pure helper `inferLayoutStyleFromBrand` is geïsoleerd van
 * Prisma — smoke kan het zonder DATABASE_URL importeren. De integration-
 * wrapper `ensureLayoutStyle` doet alleen de DB-write.
 */
import type { BrandContextBlock } from "@/lib/ai/prompt-templates";
import type { BrandArchetype } from "./brand-archetype-classifier";
import type { LayoutStyle } from "./design-system";

export interface EnsureLayoutStyleResult {
  layoutStyle: LayoutStyle | null;
  inferred: boolean;
  /** Confidence in mapping (alleen indicatief; geen AI-call). */
  confidence?: "high" | "medium" | "low";
  /** Beknopte uitleg waarom dit layoutStyle gekozen werd. */
  reasoning?: string;
}

// ─── Base mapping archetype → LayoutStyle ─────────────────
//
// Hoofdregel: welke layout-density past natuurlijk bij elk archetype?
// MINIMAL    = quiet luxury, considered, premium-without-shouting
// EDITORIAL  = magazine-rich, narrative-driven
// COMMERCIAL = tight scannable, conversion-optimized
// EXPERIENTIAL = story-driven, emotion-led, generous spacing
// PLAYFUL    = warm casual, friendly density

const ARCHETYPE_BASE_LAYOUT: Record<BrandArchetype, LayoutStyle> = {
  RULER: "MINIMAL",
  SAGE: "EDITORIAL",
  MAGICIAN: "EXPERIENTIAL",
  CREATOR: "EDITORIAL",
  LOVER: "EXPERIENTIAL",
  EXPLORER: "EXPERIENTIAL",
  HERO: "COMMERCIAL",
  OUTLAW: "COMMERCIAL",
  INNOCENT: "PLAYFUL",
  JESTER: "PLAYFUL",
  REGULAR_GUY: "COMMERCIAL",
  CARETAKER: "PLAYFUL",
};

// ─── Tone-keyword nudges ──────────────────────────────────
//
// Bepaalde tone-signalen kunnen een archetype een buurstyle in duwen. Bv:
// HERO base=COMMERCIAL, maar wanneer tone "premium/refined" → MINIMAL.
// SAGE base=EDITORIAL, maar wanneer tone "snelle/scanbaar/B2C" → COMMERCIAL.

interface ToneSignals {
  premium: boolean;
  refined: boolean;
  playful: boolean;
  storytelling: boolean;
  evidenceLed: boolean;
  scannable: boolean;
  intimate: boolean;
  bold: boolean;
}

function detectToneSignals(brand: BrandContextBlock): ToneSignals {
  const haystack = [
    brand.brandToneOfVoice ?? "",
    brand.brandPersonality ?? "",
    brand.brandEssence ?? "",
    brand.brandPromise ?? "",
    brand.brandStory ?? "",
    (brand.brandValues ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const has = (...keywords: string[]) =>
    keywords.some((kw) => haystack.includes(kw));

  return {
    premium: has("premium", "exclusief", "luxury", "luxe", "high-end", "exclusive"),
    refined: has("refined", "verfijnd", "elegant", "sophisticated", "quiet"),
    playful: has("playful", "speels", "speelse", "fun", "joyful", "vrolijk", "casual"),
    storytelling: has(
      "story",
      "stories",
      "verhaal",
      "verhalen",
      "narrative",
      "narratief",
      "journey",
      "reis",
    ),
    evidenceLed: has(
      "evidence",
      "evidence-led",
      "data",
      "feiten",
      "research",
      "wetenschap",
    ),
    scannable: has(
      "scannable",
      "scanbaar",
      "snel",
      "quick",
      "tight",
      "to-the-point",
    ),
    intimate: has("intimate", "intiem", "warm", "personal", "persoonlijk"),
    bold: has("bold", "krachtig", "powerful", "stoer", "stoere", "fearless"),
  };
}

// ─── Inference ────────────────────────────────────────────

/**
 * Pure inference van LayoutStyle gegeven archetype + brand-context.
 *
 * Returnt null wanneer er geen archetype is — zonder archetype kunnen we
 * geen sensible default kiezen (en DEFAULT_LAYOUT_STYLE moet expliciet door
 * de consumer worden gebruikt).
 */
export function inferLayoutStyleFromBrand(
  archetype: BrandArchetype | null,
  brand: BrandContextBlock,
): { layoutStyle: LayoutStyle; confidence: "high" | "medium" | "low"; reasoning: string } | null {
  if (!archetype) return null;

  const base = ARCHETYPE_BASE_LAYOUT[archetype];
  const tone = detectToneSignals(brand);

  // Nudge-rules: bekijk per archetype welke buurstyle door tone gerechtvaardigd is.
  // Alleen één nudge wordt toegepast — bij conflict wint de base.

  // HERO/OUTLAW base=COMMERCIAL → MINIMAL bij premium/refined
  if ((archetype === "HERO" || archetype === "OUTLAW") && (tone.premium || tone.refined)) {
    return {
      layoutStyle: "MINIMAL",
      confidence: "medium",
      reasoning: `${archetype} base is COMMERCIAL, maar premium/refined tone duwt richting MINIMAL`,
    };
  }

  // SAGE base=EDITORIAL → COMMERCIAL bij scannable
  if (archetype === "SAGE" && tone.scannable) {
    return {
      layoutStyle: "COMMERCIAL",
      confidence: "medium",
      reasoning: `SAGE base is EDITORIAL, maar scannable tone duwt richting COMMERCIAL`,
    };
  }

  // CREATOR base=EDITORIAL → EXPERIENTIAL bij storytelling
  if (archetype === "CREATOR" && tone.storytelling) {
    return {
      layoutStyle: "EXPERIENTIAL",
      confidence: "medium",
      reasoning: `CREATOR base is EDITORIAL, storytelling tone duwt richting EXPERIENTIAL`,
    };
  }

  // INNOCENT/CARETAKER base=PLAYFUL → MINIMAL bij refined
  if ((archetype === "INNOCENT" || archetype === "CARETAKER") && tone.refined) {
    return {
      layoutStyle: "MINIMAL",
      confidence: "low",
      reasoning: `${archetype} base is PLAYFUL, maar refined tone duwt richting MINIMAL`,
    };
  }

  // REGULAR_GUY base=COMMERCIAL → PLAYFUL bij intimate
  if (archetype === "REGULAR_GUY" && tone.intimate) {
    return {
      layoutStyle: "PLAYFUL",
      confidence: "medium",
      reasoning: `REGULAR_GUY base is COMMERCIAL, intimate tone duwt richting PLAYFUL`,
    };
  }

  // LOVER base=EXPERIENTIAL → EDITORIAL bij refined
  if (archetype === "LOVER" && tone.refined) {
    return {
      layoutStyle: "EDITORIAL",
      confidence: "medium",
      reasoning: `LOVER base is EXPERIENTIAL, refined tone duwt richting EDITORIAL`,
    };
  }

  // Default — gebruik base mapping
  return {
    layoutStyle: base,
    confidence: "high",
    reasoning: `Base mapping ${archetype} → ${base} (geen contraire tone-signalen)`,
  };
}

/**
 * Ensure BrandStyleguide.layoutStyle is gevuld. Gate-logica:
 *  - layoutStyleInferred=true → no-op (user-override of eerder geïnferred)
 *  - layoutStyleInferred=false → infereer + persist (zelfs als layoutStyle
 *    al een waarde heeft; die is dan de schema-default COMMERCIAL)
 *  - geen archetype → skip (geen reliable inference mogelijk)
 *
 * Schema-default `LayoutStyle @default(COMMERCIAL)` is een sentinel die we
 * niet kunnen onderscheiden van een user-keuze zonder de aparte
 * `layoutStyleInferred` flag.
 */
export async function ensureLayoutStyle(
  workspaceId: string,
  currentLayoutStyle: LayoutStyle | null,
  isInferred: boolean,
  archetype: BrandArchetype | null,
  brand: BrandContextBlock,
): Promise<EnsureLayoutStyleResult> {
  if (isInferred && currentLayoutStyle) {
    return { layoutStyle: currentLayoutStyle, inferred: false };
  }

  const inferred = inferLayoutStyleFromBrand(archetype, brand);
  if (!inferred) {
    return { layoutStyle: null, inferred: false };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: {
        layoutStyle: inferred.layoutStyle,
        layoutStyleInferred: true,
      },
    });
    return {
      layoutStyle: inferred.layoutStyle,
      inferred: true,
      confidence: inferred.confidence,
      reasoning: inferred.reasoning,
    };
  } catch (err) {
    console.error(
      `[ensureLayoutStyle] Persist failed for workspace ${workspaceId}:`,
      err instanceof Error ? err.message : err,
    );
    // Inferred maar niet persisted — geef wel terug zodat current generation
    // het gebruikt; volgende sessie inferred opnieuw.
    return {
      layoutStyle: inferred.layoutStyle,
      inferred: true,
      confidence: inferred.confidence,
      reasoning: inferred.reasoning,
    };
  }
}
