/**
 * Structural brand-token extraction for the web-page builder (per ADR
 * 2026-05-22-landing-page-builder-architectuur, Phase 2).
 *
 * Two extraction routes:
 *  - `extractBrandTokensFromStyleguide(...)` — reads structured
 *    BrandStyleguide records (colors per ColorCategory, fonts per
 *    FontRole). Server-side, requires Prisma includes.
 *  - `extractBrandTokensFromContext(brand)` — fallback regex-parse of
 *    the flat-string `BrandContextBlock` fields (brandColors / brandFonts),
 *    used when the styleguide isn't loaded yet. This mirrors the spike
 *    pattern so PuckPageBuilder never crashes on a missing brandTokens.
 *
 * Both routes return the same `BrandTokens` shape so Puck component render
 * functions only have to consume one API.
 */

import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

export interface BrandTokens {
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  neutralHex: string;
  /** CSS font-family value for headings + hero text. */
  headingFont: string;
  /** CSS font-family value for body text. */
  bodyFont: string;
}

export const DEFAULT_BRAND_TOKENS: BrandTokens = {
  primaryHex: '#1FD1B2',
  secondaryHex: '#0F172A',
  accentHex: '#F59E0B',
  neutralHex: '#64748B',
  headingFont: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  bodyFont: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

interface StyleguideColorLike {
  hex: string;
  category: string;
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

/**
 * Extract brand tokens from a structurally-loaded BrandStyleguide. Prefers
 * the lowest sortOrder match per category/role; falls back to defaults when
 * a category is missing. Pure function — testable without DB.
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

  const colorByCategory = (category: string): string | null => {
    const match = colors.find((c) => c.category === category);
    return match?.hex ?? null;
  };

  const fontByRole = (role: string): string | null => {
    const match = fonts.find((f) => f.role === role);
    if (!match) return null;
    return match.fontFamily ?? match.name;
  };

  return {
    primaryHex: colorByCategory('PRIMARY') ?? DEFAULT_BRAND_TOKENS.primaryHex,
    secondaryHex: colorByCategory('SECONDARY') ?? DEFAULT_BRAND_TOKENS.secondaryHex,
    accentHex: colorByCategory('ACCENT') ?? DEFAULT_BRAND_TOKENS.accentHex,
    neutralHex: colorByCategory('NEUTRAL') ?? DEFAULT_BRAND_TOKENS.neutralHex,
    headingFont:
      fontByRole('DISPLAY')
      ?? styleguide.primaryFontName
      ?? DEFAULT_BRAND_TOKENS.headingFont,
    bodyFont:
      fontByRole('BODY')
      ?? styleguide.primaryFontName
      ?? DEFAULT_BRAND_TOKENS.headingFont,
  };
}

/**
 * Fallback: regex-extract from the flat BrandContextBlock string fields.
 * Used client-side when CanvasContextStack.brandTokens isn't populated yet
 * (e.g. server hasn't loaded the styleguide). Mirrors the spike behaviour
 * so PuckPageBuilder always has *something* to render.
 */
export function extractBrandTokensFromContext(
  brand: BrandContextBlock | undefined | null,
): BrandTokens {
  if (!brand) return { ...DEFAULT_BRAND_TOKENS };

  const hexes = typeof brand.brandColors === 'string'
    ? (brand.brandColors.match(/#[0-9A-Fa-f]{6}/g) ?? [])
    : [];
  const headingFont = extractFontFromFonts(brand.brandFonts, /heading|display|h1/i)
    ?? DEFAULT_BRAND_TOKENS.headingFont;
  const bodyFont = extractFontFromFonts(brand.brandFonts, /body|paragraph|text/i)
    ?? DEFAULT_BRAND_TOKENS.bodyFont;

  return {
    primaryHex: hexes[0] ?? DEFAULT_BRAND_TOKENS.primaryHex,
    secondaryHex: hexes[1] ?? DEFAULT_BRAND_TOKENS.secondaryHex,
    accentHex: hexes[2] ?? DEFAULT_BRAND_TOKENS.accentHex,
    neutralHex: hexes[3] ?? DEFAULT_BRAND_TOKENS.neutralHex,
    headingFont,
    bodyFont,
  };
}

function extractFontFromFonts(
  fonts: string | undefined,
  roleMatcher: RegExp,
): string | null {
  if (typeof fonts !== 'string') return null;
  // Wrap roleMatcher.source in a group so alternation doesn't accidentally
  // bind the `[^:]*:` suffix to only the last alternative (regex precedence).
  const match = fonts.match(new RegExp(`(?:${roleMatcher.source})[^:]*:\\s*([^,\\n]+)`, 'i'));
  if (!match || !match[1]) return null;
  return match[1].trim();
}
