/**
 * Structural brand-token extraction for the web-page builder.
 *
 * **v2 (2026-05-26, Sprint 1 van brand-styling-consistency-plan):**
 * Role-based tokens (surface/onSurface/brand/onBrand/accent/etc.) bovenop
 * de legacy kleur-naam-tokens (primaryHex/secondaryHex/accentHex/neutralHex).
 * Smartere extractie gebruikt tags + WCAG contrast-fields + luminance om de
 * juiste kleur per rol te kiezen — voorkomt body-text in brand-color
 * (LINFI-incident 2026-05-26: Golden Bronze als secondaryHex → unleesbare
 * feature-headings + FAQ-vragen).
 *
 * Twee extractie-routes:
 *  - `extractBrandTokensFromStyleguide(...)` — structurele BrandStyleguide-
 *    records (colors per ColorCategory + tags + contrast, fonts per FontRole).
 *    Server-side, requires Prisma includes met tags + contrastWhite/Black.
 *  - `extractBrandTokensFromContext(brand)` — regex-fallback voor flat-string
 *    `BrandContextBlock` fields. Minder data, ruwere heuristiek.
 *
 * Beide retourneren dezelfde BrandTokens shape (legacy + role-tokens).
 */

import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import {
  type LayoutStyle,
  type DesignSystem,
  DEFAULT_LAYOUT_STYLE,
  getDesignSystemForLayoutStyle,
} from './design-system';
import type { BrandArchetype } from './brand-archetype-classifier';

// ─── Public interface ─────────────────────────────────────────

export interface BrandTokens {
  // ─── Legacy kleur-naam-tokens (backward-compat) ──────────
  /** Geadviseerd: gebruik `brand` voor CTA-fill of `onSurface` voor body-text. */
  primaryHex: string;
  /** Geadviseerd: gebruik `onSurface` voor body-text. */
  secondaryHex: string;
  /** Geadviseerd: gebruik `accent` (hover-only) of `brand`. */
  accentHex: string;
  /** Geadviseerd: gebruik `surfaceMuted` voor sub-text. */
  neutralHex: string;

  // ─── Surface-roles (page-bg + tekst-op-page) ─────────────
  /** Page background — meestal wit/off-white. */
  surface: string;
  /** Body-text op surface (≥7:1 AAA waar mogelijk). */
  onSurface: string;
  /** Sub-text / meta-data op surface (≥4.5:1 AA). */
  surfaceMuted: string;
  /** Dividers, card-borders (≥3:1 non-text). */
  surfaceBorder: string;

  // ─── Brand-roles ─────────────────────────────────────────
  /** Klant-eigen primary color voor CTA-fill, accent-borders. */
  brand: string;
  /** Text-kleur op brand-fill (≥4.5:1 op brand). */
  onBrand: string;
  /** Brand-tint voor backgrounds — auto-derived (lighten brand 85%). */
  brandSubtle: string;

  // ─── Action-roles (CTA-specifiek) ────────────────────────
  /** CTA-fill — default = brand. */
  action: string;
  /** CTA-tekst — default = onBrand. */
  onAction: string;

  // ─── Accent (sparingly used) ─────────────────────────────
  /** Hover/highlight only — nooit body-text. */
  accent: string;

  // ─── Typografie ──────────────────────────────────────────
  headingFont: string;
  bodyFont: string;

  // ─── v3 — Design-system (Pad C Sub-Sprint A) ─────────────
  /** LayoutStyle uit BrandStyleguide — bepaalt design-system primitives. */
  layoutStyle: LayoutStyle;
  /** Volledige design-system bundle: spacing-scale, typography-scale, radius,
   *  image-strategy, section-alternation. Consumer-friendly voor renderers. */
  designSystem: DesignSystem;

  // ─── v3 — Brand-archetype (Pad C Sub-Sprint B Phase 1) ───
  /** Jung archetype voor brand-emergent rendering decisions. Null = nog
   *  niet geclassificeerd — renderer valt terug op layoutStyle-only. */
  archetype: BrandArchetype | null;

  // ─── v4 — Component-specific styling profiles (verbeterplan) ───
  /** Button-styling uit scraper. 3-tier fallback chain:
   *   1. scraped buttonProfile (primary-role wint)
   *   2. archetype-default uit computeBrandRenderHints
   *   3. hard default
   */
  button: ButtonTokens;
  /** Card-elevation styling uit scraper (radiusProfile + elevationProfile). */
  elevation: ElevationTokens;
  /** Iconography stroke + size — uit designLanguage of archetype-default. */
  iconography: IconographyTokens;
  /** Section/card spacing rhythm — uit spacingProfile of layoutStyle-preset. */
  sectionRhythm: SectionRhythmTokens;
  /** Motion (transition duration + easing). */
  motion: MotionTokens;
  /** Photography-DNA voor hero-visual prompts. */
  photography: PhotographyTokens;

  // ─── v5 — Text-hiërarchie + banner styling (DTS C4) ───────
  /** 4-level foreground hiërarchie. Defaults zijn aliassen van bestaande
   *  onSurface/surfaceMuted tokens — visueel identiek bij absence. */
  text: TextTokens;
}

export interface TextTokens {
  /** Headlines / h1-h3 — donker, hoogste contrast. Default = onSurface. */
  heading: { color: string; weight: number };
  /** Body-tekst / paragraphs — mid donker. Default = onSurface. */
  body: { color: string; weight: number };
  /** Secondary tekst / meta / sub-content — mid. Default = surfaceMuted. */
  secondary: { color: string; weight: number };
  /** Captions / overlines / muted-info — lichtst. Default = surfaceMuted. */
  caption: { color: string; weight: number };
  /** Banner-style: uppercase + tracking voor civic/eyebrow elementen. */
  banner: {
    fontSize: number;
    weight: number;
    letterSpacing: string;
    textTransform: "uppercase" | "none";
  };
}

export interface ButtonTokens {
  paddingY: number;
  paddingX: number;
  radiusPx: number;
  fontWeight: number;
  fontSize: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing: string;
  /** Hover-strategie: darken (premium) / lighten / underline / scale / none. */
  hoverStyle: "darken" | "lighten" | "underline" | "scale" | "none";
}

export interface ElevationTokens {
  /** CSS box-shadow value of "none". */
  cardShadow: string;
  cardBorderRadius: number;
  cardBorderWidth: number;
  /** Category — voor renderer-keuzes (flat = no border + no shadow). */
  cardElevationCategory: "flat" | "subtle-shadow" | "strong-shadow" | "border-only";
}

export interface IconographyTokens {
  strokeWeight: number;  // 1 (premium luxury) / 1.5-2 (default) / 2.5 (bold playful)
  sizeDefault: number;   // 20-32 typical range
  style: "outline" | "filled" | "duotone";
}

export interface SectionRhythmTokens {
  /** Sectie verticale padding in px. */
  sectionPaddingY: number;
  /** Sectie horizontale padding. */
  sectionPaddingX: number;
  cardPaddingY: number;
  cardPaddingX: number;
  /** Alternate background per sectie? */
  alternateBg: boolean;
}

export interface MotionTokens {
  /** CSS-ready duration string ("200ms"). */
  transitionDuration: string;
  /** CSS-ready easing function. */
  easing: string;
}

export interface PhotographyTokens {
  mood: string | null;
  compositionStyle: string | null;
  subjectMatter: string | null;
  /** Hero-visual-prompt extension; klaar voor opname in image-gen prompt. */
  promptFragment: string;
}

export const DEFAULT_BRAND_TOKENS: BrandTokens = {
  // Legacy
  primaryHex: '#1FD1B2',
  secondaryHex: '#0F172A',
  accentHex: '#F59E0B',
  neutralHex: '#64748B',
  // Surface
  surface: '#FFFFFF',
  onSurface: '#0F172A',
  surfaceMuted: '#64748B',
  surfaceBorder: '#E2E8F0',
  // Brand
  brand: '#1FD1B2',
  onBrand: '#FFFFFF',
  brandSubtle: '#E6F9F5',
  // Action
  action: '#1FD1B2',
  onAction: '#FFFFFF',
  // Accent
  accent: '#F59E0B',
  // Typography
  headingFont: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  bodyFont: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  // v3 — Design-system
  layoutStyle: DEFAULT_LAYOUT_STYLE,
  designSystem: getDesignSystemForLayoutStyle(DEFAULT_LAYOUT_STYLE),
  // v3 — Brand-archetype (null = unclassified)
  archetype: null,
  // v4 — Component-specific styling profiles (defaults voor onbekende
  // workspaces; extractor + renderer override met scraper/archetype-data).
  button: {
    paddingY: 14,
    paddingX: 28,
    radiusPx: 6,
    fontWeight: 600,
    fontSize: 16,
    textTransform: "none",
    letterSpacing: "0.01em",
    hoverStyle: "darken",
  },
  elevation: {
    cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
    cardBorderRadius: 12,
    cardBorderWidth: 0,
    cardElevationCategory: "subtle-shadow",
  },
  iconography: {
    strokeWeight: 1.75,
    sizeDefault: 24,
    style: "outline",
  },
  sectionRhythm: {
    sectionPaddingY: 64,
    sectionPaddingX: 32,
    cardPaddingY: 24,
    cardPaddingX: 20,
    alternateBg: false,
  },
  motion: {
    transitionDuration: "200ms",
    easing: "ease",
  },
  photography: {
    mood: null,
    compositionStyle: null,
    subjectMatter: null,
    promptFragment: "",
  },
  // v5 — Text-hiërarchie (defaults = backward-compat met v3 onSurface/muted)
  text: {
    heading: { color: '#0F172A', weight: 700 },
    body: { color: '#0F172A', weight: 400 },
    secondary: { color: '#64748B', weight: 400 },
    caption: { color: '#64748B', weight: 400 },
    banner: {
      fontSize: 12,
      weight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
};

// ─── Input shapes ─────────────────────────────────────────────

interface StyleguideColorLike {
  hex: string;
  category: string;
  /** Tags geven semantische rol-hints — bv. ["background","brand","header"]. */
  tags?: string[] | null;
  /** WCAG-tag voor white-text-op-deze-kleur — "AAA" | "AA" | "Fail". */
  contrastWhite?: string | null;
  /** WCAG-tag voor black-text-op-deze-kleur — "AAA" | "AA" | "Fail". */
  contrastBlack?: string | null;
  confidence?: string | null;
  sortOrder?: number;
}

interface StyleguideFontLike {
  name: string;
  role: string;
  fontFamily?: string | null;
  sortOrder?: number;
}

interface StyleguideShape {
  colors?: StyleguideColorLike[] | null;
  fonts?: StyleguideFontLike[] | null;
  primaryFontName?: string | null;
  /** Pad C Sub-Sprint A — LayoutStyle uit Prisma. Default COMMERCIAL. */
  layoutStyle?: LayoutStyle | null;
  /** Pad C Sub-Sprint B Phase 1 — Jung archetype uit Prisma. Null = nog
   *  niet geclassificeerd. */
  archetype?: BrandArchetype | null;
  // Verbeterplan Fase B — rendering-profiles (Json velden uit Prisma).
  // Type `unknown` voor flexibele JSON-shape; v4-mappers parsen veilig.
  buttonProfile?: unknown;
  typographyProfile?: unknown;
  spacingProfile?: unknown;
  elevationProfile?: unknown;
  radiusProfile?: unknown;
  motionProfile?: unknown;
  /** photographyStyle JSON met {mood, subjects, composition}. */
  photographyStyle?: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#'
    + [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

/** WCAG relative luminance — 0 = black, 1 = white. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sv = c / 255;
    return sv <= 0.03928 ? sv / 12.92 : Math.pow((sv + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mix kleur met wit — amount 0..1 (0 = ongewijzigd, 1 = wit). */
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const blend = (c: number) => c + (255 - c) * amount;
  return rgbToHex(blend(rgb.r), blend(rgb.g), blend(rgb.b));
}

function tagsLower(c: StyleguideColorLike): string[] {
  return (c.tags ?? []).map((t) => t.toLowerCase());
}

function hasAnyTag(c: StyleguideColorLike, needles: string[]): boolean {
  const tags = tagsLower(c);
  return needles.some((n) => tags.includes(n));
}

/** Score AAA=3, AA=2, anders 0. */
function contrastScore(s: string | null | undefined): number {
  if (s === 'AAA') return 3;
  if (s === 'AA') return 2;
  return 0;
}

/** Kies #FFFFFF of #000000 als onBrand op basis van WCAG-tags. */
function pickOnColor(c: StyleguideColorLike | null): string {
  if (!c) return '#FFFFFF';
  const whiteScore = contrastScore(c.contrastWhite);
  const blackScore = contrastScore(c.contrastBlack);
  // Bij gelijke score → wit (vaker gebruikt voor brand-fill UX)
  return whiteScore >= blackScore ? '#FFFFFF' : '#000000';
}

/** Confidence-rank — high=3, medium=2, low=1, null=0. */
function confidenceRank(c: StyleguideColorLike): number {
  const v = c.confidence?.toLowerCase();
  if (v === 'high') return 3;
  if (v === 'medium') return 2;
  if (v === 'low') return 1;
  return 0;
}

// ─── Role-selection heuristieken ──────────────────────────────

/**
 * Selectie-volgorde per rol:
 *  1. Tag-prioritaire match (semantische intentie)
 *  2. Category + luminance fallback
 *  3. Default
 */

function pickSurface(colors: StyleguideColorLike[]): StyleguideColorLike | null {
  // Tier 1: expliciet "surface" tag + L>0.85
  const surfaceTagged = colors.find(
    (c) => hasAnyTag(c, ['surface']) && relativeLuminance(c.hex) > 0.85,
  );
  if (surfaceTagged) return surfaceTagged;
  // Tier 2: tagged "background" of "light" + L>0.85, prefereer NEUTRAL
  // boven SECONDARY (SECONDARY-background is vaak een accent-light zoals
  // soft-cream, NEUTRAL-background is vaak echte page-surface zoals white)
  const taggedNeutral = colors.find(
    (c) =>
      c.category === 'NEUTRAL'
      && hasAnyTag(c, ['background', 'light'])
      && relativeLuminance(c.hex) > 0.85,
  );
  if (taggedNeutral) return taggedNeutral;
  // Tier 3: any color tagged background/light + L>0.85
  const taggedAny = colors.find(
    (c) => hasAnyTag(c, ['background', 'light']) && relativeLuminance(c.hex) > 0.85,
  );
  if (taggedAny) return taggedAny;
  // Tier 4: lightest color overall met L>0.85
  const sorted = [...colors].sort((a, b) => relativeLuminance(b.hex) - relativeLuminance(a.hex));
  const lightest = sorted[0];
  if (lightest && relativeLuminance(lightest.hex) > 0.85) return lightest;
  return null;
}

function pickOnSurface(colors: StyleguideColorLike[]): StyleguideColorLike | null {
  // Tagged "text" + darkest
  const tagged = colors.filter((c) => hasAnyTag(c, ['text', 'body', 'header']));
  const darkTagged = tagged
    .filter((c) => relativeLuminance(c.hex) < 0.2)
    .sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex))[0];
  if (darkTagged) return darkTagged;
  // Darkest color overall (excluding semantic colors like error/success)
  const candidates = colors.filter((c) => c.category !== 'SEMANTIC');
  const sorted = [...candidates].sort(
    (a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex),
  );
  return sorted[0] ?? null;
}

function pickSurfaceMuted(
  colors: StyleguideColorLike[],
  surface: string,
): StyleguideColorLike | null {
  const surfaceL = relativeLuminance(surface);
  // NEUTRAL tagged "muted" / "secondary-text" / "subtle"
  const tagged = colors.filter(
    (c) =>
      c.category === 'NEUTRAL'
      && hasAnyTag(c, ['muted', 'secondary-text', 'subtle']),
  );
  if (tagged[0]) return tagged[0];
  // Mid-range NEUTRAL (L between 0.2-0.6) for contrast-on-surface
  const midRange = colors.filter((c) => {
    const l = relativeLuminance(c.hex);
    return c.category === 'NEUTRAL' && l > 0.2 && l < 0.6 && Math.abs(l - surfaceL) > 0.3;
  });
  return midRange[0] ?? null;
}

function pickSurfaceBorder(colors: StyleguideColorLike[]): StyleguideColorLike | null {
  const tagged = colors.filter(
    (c) =>
      c.category === 'NEUTRAL'
      && hasAnyTag(c, ['border', 'divider']),
  );
  if (tagged[0]) return tagged[0];
  // Light gray NEUTRAL (L > 0.7) that's not the surface itself
  const lightNeutral = colors.find(
    (c) => c.category === 'NEUTRAL' && relativeLuminance(c.hex) > 0.7,
  );
  return lightNeutral ?? null;
}

function pickBrand(colors: StyleguideColorLike[]): StyleguideColorLike | null {
  // PRIMARY tagged "brand" but NOT "background"/"header"/"text"
  // (filtert out classifier-fouten zoals "Charcoal Navy → PRIMARY"
  //  bij minimalistische sites)
  const excluded = ['background', 'header', 'text', 'body'];
  const candidates = colors.filter(
    (c) =>
      c.category === 'PRIMARY'
      && hasAnyTag(c, ['brand'])
      && !excluded.some((e) => tagsLower(c).includes(e)),
  );
  if (candidates.length > 0) {
    // Highest-confidence match
    return [...candidates].sort((a, b) => confidenceRank(b) - confidenceRank(a))[0];
  }
  // Fallback 1: PRIMARY zonder background-tag
  const primaries = colors.filter(
    (c) =>
      c.category === 'PRIMARY'
      && !excluded.some((e) => tagsLower(c).includes(e)),
  );
  if (primaries[0]) return primaries[0];
  // Fallback 2: ACCENT
  const accents = colors.filter((c) => c.category === 'ACCENT');
  if (accents[0]) return accents[0];
  // Fallback 3: eerste PRIMARY ongeacht tags
  return colors.find((c) => c.category === 'PRIMARY') ?? null;
}

function pickAccent(
  colors: StyleguideColorLike[],
  brandHex: string,
): StyleguideColorLike | null {
  // ACCENT category, niet identiek aan brand
  const accents = colors.filter(
    (c) => c.category === 'ACCENT' && c.hex.toLowerCase() !== brandHex.toLowerCase(),
  );
  if (accents[0]) return accents[0];
  // PRIMARY tagged "accent" (LINFI-pattern: Golden Bronze als accent in tags)
  const primaryAccents = colors.filter(
    (c) =>
      c.category === 'PRIMARY'
      && hasAnyTag(c, ['accent'])
      && c.hex.toLowerCase() !== brandHex.toLowerCase(),
  );
  return primaryAccents[0] ?? null;
}

// ─── Main extractor ───────────────────────────────────────────

/**
 * Extract brand tokens uit een structureel-geladen BrandStyleguide.
 * Pure functie — testable without DB.
 *
 * v2 (2026-05-26): role-based mapping met tag/luminance/contrast-heuristiek.
 * Legacy fields (primaryHex/etc.) populated als alias van role-tokens voor
 * backward-compat met bestaande puck-config consumers.
 */
export function extractBrandTokensFromStyleguide(
  styleguide: StyleguideShape | null | undefined,
): BrandTokens {
  if (!styleguide) return { ...DEFAULT_BRAND_TOKENS };

  const colors = (styleguide.colors ?? []).slice().sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const fonts = (styleguide.fonts ?? []).slice().sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  // ── Roles ──
  const surfaceColor = pickSurface(colors);
  const surface = surfaceColor?.hex ?? DEFAULT_BRAND_TOKENS.surface;

  const onSurfaceColor = pickOnSurface(colors);
  const onSurface = onSurfaceColor?.hex ?? DEFAULT_BRAND_TOKENS.onSurface;

  const surfaceMutedColor = pickSurfaceMuted(colors, surface);
  const surfaceMuted = surfaceMutedColor?.hex ?? DEFAULT_BRAND_TOKENS.surfaceMuted;

  const surfaceBorderColor = pickSurfaceBorder(colors);
  const surfaceBorder = surfaceBorderColor?.hex ?? DEFAULT_BRAND_TOKENS.surfaceBorder;

  const brandColor = pickBrand(colors);
  const brand = brandColor?.hex ?? DEFAULT_BRAND_TOKENS.brand;
  const onBrand = pickOnColor(brandColor);
  const brandSubtle = brand ? lighten(brand, 0.85) : DEFAULT_BRAND_TOKENS.brandSubtle;

  const accentColor = pickAccent(colors, brand);
  const accent = accentColor?.hex ?? DEFAULT_BRAND_TOKENS.accent;

  // ── WCAG pre-render gate (Sprint 2 §3b) ──
  // Forceer veilige fallbacks bij contrast-fail: voorkomt unreadable
  // body-text / button-text bij classifier-fouten of marginal kleuren.
  const safeOnSurface = enforceContrastFallback(onSurface, surface, 'normal');
  const safeOnBrand = enforceContrastFallback(onBrand, brand, 'normal');
  const safeSurfaceMuted = enforceContrastFallback(surfaceMuted, surface, 'normal');

  // ── Fonts ──
  const fontByRole = (role: string): string | null => {
    const match = fonts.find((f) => f.role === role);
    if (!match) return null;
    return match.fontFamily ?? match.name;
  };
  const headingFont =
    fontByRole('DISPLAY')
    ?? styleguide.primaryFontName
    ?? DEFAULT_BRAND_TOKENS.headingFont;
  const bodyFont =
    fontByRole('BODY')
    ?? styleguide.primaryFontName
    ?? DEFAULT_BRAND_TOKENS.bodyFont;

  // ── v3 — Design-system resolutie (Pad C Sub-Sprint A) ──
  const layoutStyle = styleguide.layoutStyle ?? DEFAULT_LAYOUT_STYLE;
  const designSystem = getDesignSystemForLayoutStyle(layoutStyle);
  const archetype = styleguide.archetype ?? null;

  // ── v4 — Component tokens (verbeterplan Fase C) ──
  // Lazy import om circular dep + extra surface te minimaliseren in deze file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const v4 = require("./brand-tokens-v4-mappers") as typeof import("./brand-tokens-v4-mappers");
  const button = v4.mapButtonTokens(
    styleguide.buttonProfile,
    archetype,
    DEFAULT_BRAND_TOKENS.button,
  );
  const elevation = v4.mapElevationTokens(
    styleguide.elevationProfile,
    styleguide.radiusProfile,
    DEFAULT_BRAND_TOKENS.elevation,
  );
  const iconography = v4.mapIconographyTokens(
    archetype,
    layoutStyle,
    DEFAULT_BRAND_TOKENS.iconography,
  );
  const sectionRhythm = v4.mapSectionRhythmTokens(
    styleguide.spacingProfile,
    designSystem,
    DEFAULT_BRAND_TOKENS.sectionRhythm,
  );
  const motion = v4.mapMotionTokens(
    styleguide.motionProfile,
    DEFAULT_BRAND_TOKENS.motion,
  );
  const photography = v4.mapPhotographyTokens(
    styleguide.photographyStyle,
    DEFAULT_BRAND_TOKENS.photography,
  );
  const text = v4.mapTextTokens(
    styleguide.typographyProfile,
    safeOnSurface,
    safeSurfaceMuted,
    DEFAULT_BRAND_TOKENS.text,
  );

  return {
    // Legacy aliases (semantisch correct na v2-mapping + WCAG-gate)
    primaryHex: brand,
    secondaryHex: safeOnSurface,
    accentHex: accent,
    neutralHex: safeSurfaceMuted,
    // Surface roles (WCAG-validated)
    surface,
    onSurface: safeOnSurface,
    surfaceMuted: safeSurfaceMuted,
    surfaceBorder,
    // Brand roles (WCAG-validated)
    brand,
    onBrand: safeOnBrand,
    brandSubtle,
    // Action roles (default = brand)
    action: brand,
    onAction: safeOnBrand,
    // Accent
    accent,
    // Typography
    headingFont,
    bodyFont,
    // v3 Design-system
    layoutStyle,
    designSystem,
    archetype,
    // v4 Component-tokens
    button,
    elevation,
    iconography,
    sectionRhythm,
    motion,
    photography,
    // v5 Text-hiërarchie
    text,
  };
}

/**
 * WCAG-fallback: als fg/bg contrast onder AA-threshold valt, vervang fg
 * door safe black-or-white. Log warning voor diagnostics.
 */
function enforceContrastFallback(
  fg: string,
  bg: string,
  size: 'normal' | 'large',
): string {
  // Lazy import om circular dep te vermijden — wcag.ts importeert
  // relativeLuminance uit deze file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { contrastRatio, getMinRatio, blackOrWhiteFor } = require('./wcag') as {
    contrastRatio: (a: string, b: string) => number;
    getMinRatio: (level: 'AA', size: 'normal' | 'large') => number;
    blackOrWhiteFor: (bg: string) => '#000000' | '#FFFFFF';
  };
  const ratio = contrastRatio(fg, bg);
  const minRatio = getMinRatio('AA', size);
  if (ratio >= minRatio) return fg;
  // Fallback naar black-or-white
  const safe = blackOrWhiteFor(bg);
  console.warn(
    `[brand-tokens] WCAG-gate fallback: ${fg} op ${bg} ratio ${ratio.toFixed(2)}:1 < ${minRatio}:1 → ${safe}`,
  );
  return safe;
}

/**
 * Regex-fallback voor flat-string BrandContextBlock.brandColors —
 * gebruikt wanneer styleguide niet geladen is. Eenvoudiger heuristiek
 * (geen tags, geen contrast-info) — sorteer alleen op luminance.
 */
export function extractBrandTokensFromContext(
  brand: BrandContextBlock | undefined | null,
): BrandTokens {
  if (!brand) return { ...DEFAULT_BRAND_TOKENS };

  const hexes = typeof brand.brandColors === 'string'
    ? (brand.brandColors.match(/#[0-9A-Fa-f]{6}/g) ?? [])
    : [];

  // Strategie verschilt per aantal hexes:
  //  - 1 hex: die hex IS de brand-color (gebruikersintentie); surface = wit default
  //  - 2 hexes: donkerste = brand, lichtste = surface
  //  - 3+ hexes: full role-mapping op luminance (lichtste=surface, donkerste=onSurface,
  //    middle=brand)
  // De single-hex case staat los van luminance om "Geef me deze brand-kleur"
  // gebruikersintentie te respecteren.
  let surface: string;
  let onSurface: string;
  let brandColor: string;

  if (hexes.length === 0) {
    surface = DEFAULT_BRAND_TOKENS.surface;
    onSurface = DEFAULT_BRAND_TOKENS.onSurface;
    brandColor = DEFAULT_BRAND_TOKENS.brand;
  } else if (hexes.length === 1) {
    // Single hex = brand. Surface en onSurface uit defaults.
    surface = DEFAULT_BRAND_TOKENS.surface;
    onSurface = DEFAULT_BRAND_TOKENS.onSurface;
    brandColor = hexes[0];
  } else {
    // 2+ hexes: sorteer op luminance (lichtste eerst)
    const sorted = [...hexes].sort((a, b) => relativeLuminance(b) - relativeLuminance(a));
    surface = relativeLuminance(sorted[0]) > 0.85 ? sorted[0] : DEFAULT_BRAND_TOKENS.surface;
    const darkest = sorted[sorted.length - 1];
    onSurface = relativeLuminance(darkest) < 0.3 ? darkest : DEFAULT_BRAND_TOKENS.onSurface;
    brandColor =
      hexes.find((h) => h !== surface && h !== onSurface)
      ?? hexes[0]
      ?? DEFAULT_BRAND_TOKENS.brand;
  }
  const brandLuminance = relativeLuminance(brandColor);
  const onBrand = brandLuminance < 0.5 ? '#FFFFFF' : '#000000';
  const brandSubtle = lighten(brandColor, 0.85);

  const accent = hexes.find((h) => h !== surface && h !== onSurface && h !== brandColor)
    ?? DEFAULT_BRAND_TOKENS.accent;

  // surfaceMuted: midrange-luminance hex zoeken in alle hexes (niet alleen sorted)
  const surfaceMuted = hexes.find(
    (h) => {
      const l = relativeLuminance(h);
      return l > 0.3 && l < 0.7;
    },
  ) ?? DEFAULT_BRAND_TOKENS.surfaceMuted;

  const surfaceBorder = lighten(surfaceMuted, 0.6);

  const headingFont = extractFontFromFonts(brand.brandFonts, /heading|display|h1/i)
    ?? DEFAULT_BRAND_TOKENS.headingFont;
  const bodyFont = extractFontFromFonts(brand.brandFonts, /body|paragraph|text/i)
    ?? DEFAULT_BRAND_TOKENS.bodyFont;

  // v3 design-system: fallback-pad gebruikt altijd DEFAULT_LAYOUT_STYLE
  // (geen styleguide = geen layoutStyle-info beschikbaar).
  const layoutStyle = DEFAULT_LAYOUT_STYLE;
  const designSystem = getDesignSystemForLayoutStyle(layoutStyle);

  return {
    // Legacy aliases
    primaryHex: brandColor,
    secondaryHex: onSurface,
    accentHex: accent,
    neutralHex: surfaceMuted,
    // Surface
    surface,
    onSurface,
    surfaceMuted,
    surfaceBorder,
    // Brand
    brand: brandColor,
    onBrand,
    brandSubtle,
    // Action
    action: brandColor,
    onAction: onBrand,
    // Accent
    accent,
    // v3 Design-system
    layoutStyle,
    designSystem,
    archetype: null,  // fallback-pad: geen archetype-info beschikbaar
    // Typography
    headingFont,
    bodyFont,
    // v4 Component-tokens (fallback-pad: geen scraper-data, gebruik defaults)
    button: DEFAULT_BRAND_TOKENS.button,
    elevation: DEFAULT_BRAND_TOKENS.elevation,
    iconography: DEFAULT_BRAND_TOKENS.iconography,
    sectionRhythm: DEFAULT_BRAND_TOKENS.sectionRhythm,
    motion: DEFAULT_BRAND_TOKENS.motion,
    photography: DEFAULT_BRAND_TOKENS.photography,
    text: DEFAULT_BRAND_TOKENS.text,
  };
}

function extractFontFromFonts(
  fonts: string | undefined,
  roleMatcher: RegExp,
): string | null {
  if (typeof fonts !== 'string') return null;
  // Wrap roleMatcher.source in een group zodat alternation niet per ongeluk
  // de `[^:]*:` suffix aan alleen de laatste alternative bindt.
  const match = fonts.match(new RegExp(`(?:${roleMatcher.source})[^:]*:\\s*([^,\\n]+)`, 'i'));
  if (!match || !match[1]) return null;
  return match[1].trim();
}
