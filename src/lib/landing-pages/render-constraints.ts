/**
 * Hard render-constraints per archetype (DTS-plan C3 + C6 + C10 + C11).
 *
 * Doel: garandeert dat een variant nooit visueel off-brand renderert ook
 * niet als de scraper-data of AI-generator iets ongepast voorstelt. Werkt
 * als zachte "vangnet"-laag bovenop BrandTokens v4: tokens leveren de
 * waarden, constraints leveren de regels over wat WEL/NIET mag.
 *
 * Pure constants — geen DB, geen DOM. Caller (renderer / variant-generator)
 * leest deze rules en past ze toe.
 */
import type { BrandArchetype } from "./brand-archetype-classifier";
import type { LayoutStyle } from "./design-system";

export type ShadowAllowance = "none" | "subtle" | "medium" | "any";
export type CapitalisationRule = "sentence" | "title" | "uppercase-allowed";
export type ScrimStyle = "solid-brand" | "gradient-brand" | "dark-cinematic" | "scrim-soft";

export interface RenderConstraints {
  // ─── Visuele constraints ──────────────────────────────
  /** Mogen UI-gradients (button-bg / card-bg / divider) gebruikt worden? */
  allowGradients: boolean;
  /** Toegestaan shadow-niveau voor cards/elements. */
  allowShadow: ShadowAllowance;
  /** Mag emoji in copy gebruikt worden? */
  allowEmoji: boolean;
  /** Mag exclamation-mark in copy? */
  allowExclamationMarks: boolean;
  /** Max accent-colors per pagina (naast brand + neutrals). */
  maxAccentColors: number;
  /** Max border-radius in px (pill 9999 alleen bij explicit pill-element). */
  maxRadiusPx: number;
  /** Headlines capitalisation style. */
  capitalisation: CapitalisationRule;

  // ─── Photo-scrim style (C10) ──────────────────────────
  /** Welke scrim-stijl past bij dit archetype voor full-bleed hero-image? */
  scrimStyle: ScrimStyle;
  /** Scrim opacity bij `solid-brand` of `scrim-soft`. */
  scrimOpacity: number;

  // ─── Card-flatness (C11) ──────────────────────────────
  /** Force flat/border-only cards in MINIMAL/EDITORIAL ook bij scraped shadow. */
  forceFlatCards: boolean;

  // ─── Section-blueprint (C6) ───────────────────────────
  /** Default sectie-volgorde voor LP-generatie. AI mag afwijken maar krijgt dit als richtlijn. */
  sectionBlueprint: string[];
  /** Verwacht aantal secties (tolerance ±1). */
  targetSectionCount: number;

  // ─── Max content-width (C8) ───────────────────────────
  /** Max content-width in px voor centered containers. */
  maxContentWidth: number;
}

/** Sectie-namen die de variant-generator herkent (mirror LandingPageVariantContent shape). */
const SECTIONS = {
  hero: "hero",
  trust: "trust-strip",
  features3: "features-3col",
  features4: "features-4col",
  problem: "problem-statement",
  testimonials: "testimonials",
  pricing: "pricing",
  stats: "stats",
  faq: "faq",
  cta: "cta-block",
  footer: "footer",
} as const;

// ─── Default rules per archetype ──────────────────────────

export const RENDER_CONSTRAINTS_BY_ARCHETYPE: Record<BrandArchetype, RenderConstraints> = {
  RULER: {
    allowGradients: false,
    allowShadow: "none",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 0,
    // Pill-buttons ok wanneer scraped data dat zegt (LINFI = 9999) — geen cap
    maxRadiusPx: 9999,
    capitalisation: "sentence",
    // Subtiele dark-gradient bottom-up voor text-readability i.p.v. zware
    // brand-color overlay die de architecturale foto verzwaart.
    scrimStyle: "dark-cinematic",
    scrimOpacity: 0.35,
    forceFlatCards: true,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1200,
  },
  SAGE: {
    allowGradients: false,
    allowShadow: "subtle",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 1,
    maxRadiusPx: 8,
    capitalisation: "sentence",
    scrimStyle: "scrim-soft",
    scrimOpacity: 0.4,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.problem, SECTIONS.features4, SECTIONS.stats, SECTIONS.testimonials, SECTIONS.faq, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 8,
    maxContentWidth: 1280,
  },
  MAGICIAN: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 2,
    maxRadiusPx: 16,
    capitalisation: "title",
    scrimStyle: "dark-cinematic",
    scrimOpacity: 0.7,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.problem, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 6,
    maxContentWidth: 1280,
  },
  CREATOR: {
    allowGradients: true,
    allowShadow: "subtle",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 2,
    maxRadiusPx: 12,
    capitalisation: "sentence",
    scrimStyle: "scrim-soft",
    scrimOpacity: 0.4,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features4, SECTIONS.testimonials, SECTIONS.faq, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 6,
    maxContentWidth: 1280,
  },
  LOVER: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: true,
    allowExclamationMarks: false,
    maxAccentColors: 1,
    maxRadiusPx: 24,
    capitalisation: "title",
    scrimStyle: "gradient-brand",
    scrimOpacity: 0.5,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1280,
  },
  EXPLORER: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: false,
    allowExclamationMarks: true,
    maxAccentColors: 2,
    maxRadiusPx: 16,
    capitalisation: "title",
    scrimStyle: "dark-cinematic",
    scrimOpacity: 0.65,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1400,
  },
  HERO: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: false,
    allowExclamationMarks: true,
    maxAccentColors: 2,
    maxRadiusPx: 12,
    capitalisation: "title",
    scrimStyle: "gradient-brand",
    scrimOpacity: 0.55,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features4, SECTIONS.testimonials, SECTIONS.stats, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 6,
    maxContentWidth: 1280,
  },
  OUTLAW: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: false,
    allowExclamationMarks: true,
    maxAccentColors: 2,
    maxRadiusPx: 8,
    capitalisation: "title",
    scrimStyle: "dark-cinematic",
    scrimOpacity: 0.7,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1280,
  },
  INNOCENT: {
    allowGradients: false,
    allowShadow: "subtle",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 1,
    maxRadiusPx: 16,
    capitalisation: "sentence",
    scrimStyle: "scrim-soft",
    scrimOpacity: 0.4,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1280,
  },
  JESTER: {
    allowGradients: true,
    allowShadow: "medium",
    allowEmoji: true,
    allowExclamationMarks: true,
    maxAccentColors: 3,
    maxRadiusPx: 24,
    capitalisation: "title",
    scrimStyle: "gradient-brand",
    scrimOpacity: 0.5,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features4, SECTIONS.pricing, SECTIONS.testimonials, SECTIONS.faq, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 7,
    maxContentWidth: 1400,
  },
  REGULAR_GUY: {
    allowGradients: false,
    allowShadow: "subtle",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 1,
    maxRadiusPx: 8,
    capitalisation: "sentence",
    scrimStyle: "scrim-soft",
    scrimOpacity: 0.45,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 5,
    maxContentWidth: 1280,
  },
  CARETAKER: {
    allowGradients: false,
    allowShadow: "subtle",
    allowEmoji: false,
    allowExclamationMarks: false,
    maxAccentColors: 1,
    maxRadiusPx: 12,
    capitalisation: "sentence",
    scrimStyle: "scrim-soft",
    scrimOpacity: 0.5,
    forceFlatCards: false,
    sectionBlueprint: [SECTIONS.hero, SECTIONS.problem, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
    targetSectionCount: 6,
    maxContentWidth: 1280,
  },
};

/** Geen archetype geclassificeerd: gebruik neutrale defaults (lenient). */
export const DEFAULT_RENDER_CONSTRAINTS: RenderConstraints = {
  allowGradients: true,
  allowShadow: "subtle",
  allowEmoji: false,
  allowExclamationMarks: false,
  maxAccentColors: 2,
  maxRadiusPx: 16,
  capitalisation: "sentence",
  scrimStyle: "gradient-brand",
  scrimOpacity: 0.5,
  forceFlatCards: false,
  sectionBlueprint: [SECTIONS.hero, SECTIONS.features3, SECTIONS.testimonials, SECTIONS.cta, SECTIONS.footer],
  targetSectionCount: 5,
  maxContentWidth: 1280,
};

/** Resolve constraints voor een archetype, met layoutStyle-override voor C11 enforcement. */
export function getRenderConstraints(
  archetype: BrandArchetype | null,
  layoutStyle: LayoutStyle | null,
): RenderConstraints {
  const base = archetype
    ? RENDER_CONSTRAINTS_BY_ARCHETYPE[archetype]
    : DEFAULT_RENDER_CONSTRAINTS;

  // C11 — MINIMAL + EDITORIAL forceren flat-cards ongeacht archetype
  if (layoutStyle === "MINIMAL" || layoutStyle === "EDITORIAL") {
    return { ...base, forceFlatCards: true };
  }

  return base;
}

/**
 * Bouw een copy-constraints fragment voor variant-generator system-prompt.
 * AI gebruikt deze regels bij content-generation.
 */
export function buildCopyConstraintsFragment(c: RenderConstraints): string {
  const rules: string[] = [];
  if (!c.allowEmoji) rules.push("Geen emoji in copy");
  if (!c.allowExclamationMarks) rules.push("Geen uitroeptekens — gebruik punten");
  if (c.capitalisation === "sentence") rules.push("Headlines in sentence case (alleen eerste woord + eigennamen)");
  if (c.capitalisation === "title") rules.push("Headlines in Title Case (belangrijke woorden hoofdletters)");
  if (c.capitalisation === "uppercase-allowed") rules.push("Banners mogen UPPERCASE; headlines sentence case");
  return rules.length > 0 ? `Copy-regels:\n- ${rules.join("\n- ")}` : "";
}
