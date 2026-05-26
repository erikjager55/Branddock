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
  // Tagged "surface" of "background" + light (L > 0.85)
  const tagged = colors.filter(
    (c) => hasAnyTag(c, ['surface']) || hasAnyTag(c, ['background', 'light']),
  );
  const lightTagged = tagged.find((c) => relativeLuminance(c.hex) > 0.85);
  if (lightTagged) return lightTagged;
  // Lightest color overall
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

  return {
    // Legacy aliases (semantisch correct na v2-mapping)
    primaryHex: brand,
    secondaryHex: onSurface,
    accentHex: accent,
    neutralHex: surfaceMuted,
    // Surface roles
    surface,
    onSurface,
    surfaceMuted,
    surfaceBorder,
    // Brand roles
    brand,
    onBrand,
    brandSubtle,
    // Action roles (default = brand)
    action: brand,
    onAction: onBrand,
    // Accent
    accent,
    // Typography
    headingFont,
    bodyFont,
  };
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
    // Typography
    headingFont,
    bodyFont,
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
