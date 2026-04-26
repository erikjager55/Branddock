// =============================================================
// Semantic Role Resolver
//
// Afgeleide-tokens bouwer voor DESIGN.md-style exports.
//
// Neemt de ruwe analyzer output (StyleguideColor[], StyleguideComponent[],
// typeScale, cornerRadii, spacingScale, shadowSystem) en leidt semantic
// rollen af (primary/on-primary/surface/...), Material-esque typography
// roles, benoemde rounded/spacing/elevation scales, en component-variant
// classificaties.
//
// V1: heuristiek-only (geen Vision). Vision fallback volgt wanneer nodig.
// =============================================================

import { prisma } from '@/lib/prisma';
import { contrastRatio, hexToRgb } from '@/features/brandstyle/utils/color-utils';
import type {
  BrandStyleguide,
  StyleguideColor,
  StyleguideComponent,
  StyleguideFont,
} from '@prisma/client';

// ─── Types ─────────────────────────────────────────────

export type SemanticColorRole =
  | 'primary'
  | 'on-primary'
  | 'primary-container'
  | 'secondary'
  | 'on-secondary'
  | 'tertiary'
  | 'on-tertiary'
  | 'surface'
  | 'on-surface'
  | 'surface-variant'
  | 'outline'
  | 'error'
  | 'on-error'
  | 'success'
  | 'warning'
  | 'info';

export type TypeRole =
  | 'headline-display'
  | 'headline-lg'
  | 'headline-md'
  | 'headline-sm'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-lg'
  | 'label-md'
  | 'label-sm';

export type RoundedScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type SpacingScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ElevationLevel = '1' | '2' | '3' | '4' | '5';

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;       // "48px" | "3rem"
  fontWeight: number;
  lineHeight: string;     // "1.2" | "48px"
  letterSpacing?: string; // "-0.02em"
}

export interface SemanticTokensResolved {
  colors: Partial<Record<SemanticColorRole, string>>;           // hex
  typography: Partial<Record<TypeRole, TypographyToken>>;
  rounded: Partial<Record<RoundedScale, number>>;               // px
  spacing: Partial<Record<SpacingScale, number>>;               // px
  elevation: Partial<Record<ElevationLevel, string>>;           // box-shadow
  componentVariants: Record<string, string>;                    // componentId → "button-primary"
}

export interface WcagWarning {
  role: SemanticColorRole;
  message: string;
  contrastRatio?: number;
}

export interface SemanticTokensDiagnostics {
  source: Record<string, string>;                               // "primary" → "button-bg 3x"
  wcagWarnings: WcagWarning[];
  unresolvedRoles: SemanticColorRole[];
}

export interface SemanticTokens {
  resolved: SemanticTokensResolved;
  overrides?: Partial<SemanticTokensResolved>;
  diagnostics: SemanticTokensDiagnostics;
  resolvedAt: string;
  resolverVersion: string;
}

export const RESOLVER_VERSION = '1.0.0';

// ─── Public entry ─────────────────────────────────────

interface StyleguideWithData extends BrandStyleguide {
  colors: StyleguideColor[];
  components: StyleguideComponent[];
  fonts: StyleguideFont[];
}

/**
 * Resolve semantic tokens voor een styleguide. Leest alle relevante velden
 * uit de DB en voert heuristische rol-resolutie uit. Idempotent; kan
 * veilig meerdere keren draaien. Output is deterministisch voor dezelfde
 * input data.
 */
export async function resolveSemanticTokens(
  styleguideId: string,
): Promise<SemanticTokens> {
  const sg = await prisma.brandStyleguide.findUnique({
    where: { id: styleguideId },
    include: { colors: true, components: true, fonts: true },
  });
  if (!sg) {
    throw new Error(`Styleguide ${styleguideId} not found`);
  }

  return resolveSemanticTokensFromData(sg);
}

/**
 * In-memory variant — voor gebruik binnen de analyzer-pipeline waar we
 * al een volledig styleguide-record in de hand hebben en dubbele DB-hit
 * willen vermijden.
 */
export function resolveSemanticTokensFromData(
  sg: StyleguideWithData,
): SemanticTokens {
  const sourceMap: Record<string, string> = {};
  const warnings: WcagWarning[] = [];

  const colorRoles = resolveColorRoles(sg.colors, sg.components, sg.semanticColors, sourceMap);
  enforceOnColorPairs(colorRoles, warnings);

  const typography = mapTypographyRoles(sg.typeScale, sg.primaryFontName, sg.fonts);
  const rounded = clusterRoundedScale(sg.cornerRadii, sg.components);
  const spacing = clusterSpacingScale(sg.spacingScale, sg.components);
  const elevation = clusterElevation(sg.shadowSystem, sg.components);
  const componentVariants = classifyComponentVariants(sg.components, colorRoles);

  const unresolvedRoles = computeUnresolvedRoles(colorRoles);

  return {
    resolved: {
      colors: colorRoles,
      typography,
      rounded,
      spacing,
      elevation,
      componentVariants,
    },
    diagnostics: {
      source: sourceMap,
      wcagWarnings: warnings,
      unresolvedRoles,
    },
    resolvedAt: new Date().toISOString(),
    resolverVersion: RESOLVER_VERSION,
  };
}

// ─── Colors ───────────────────────────────────────────

const PRIMARY_REQUIRED: SemanticColorRole[] = ['primary', 'on-primary', 'surface', 'on-surface'];

function resolveColorRoles(
  colors: StyleguideColor[],
  components: StyleguideComponent[],
  semanticColorsJson: unknown,
  source: Record<string, string>,
): Partial<Record<SemanticColorRole, string>> {
  const result: Partial<Record<SemanticColorRole, string>> = {};

  const byCat = groupByCategory(colors);
  const buttonBgFreq = collectButtonBackgroundFrequency(components);

  // primary: meest voorkomende button-bg wanneer aanwezig, anders eerste PRIMARY-kleur
  const primary = pickPrimary(buttonBgFreq, byCat.PRIMARY ?? []);
  if (primary) {
    result.primary = primary.hex;
    source.primary = primary.source;
  }

  // secondary: tweede PRIMARY-kleur (als aanwezig) OF eerste SECONDARY
  const secondaryCandidates = (byCat.PRIMARY ?? [])
    .filter((c) => c.hex !== primary?.hex)
    .concat(byCat.SECONDARY ?? []);
  if (secondaryCandidates[0]) {
    result.secondary = secondaryCandidates[0].hex;
    source.secondary = `category ${secondaryCandidates[0].category}`;
  }

  // tertiary: eerste ACCENT
  const tertiary = (byCat.ACCENT ?? [])[0];
  if (tertiary) {
    result.tertiary = tertiary.hex;
    source.tertiary = 'category ACCENT';
  }

  // surface + on-surface uit NEUTRAL (lichtste vs donkerste)
  resolveSurfaceTokens(byCat.NEUTRAL ?? [], result, source);

  // outline: mid-light NEUTRAL (L ∈ [70, 90])
  const outline = pickOutline(byCat.NEUTRAL ?? []);
  if (outline) {
    result.outline = outline.hex;
    source.outline = `neutral L=${outline.lightness}`;
  }

  // semantic tokens uit semanticColors Json OF SEMANTIC category
  resolveSemanticFromJson(semanticColorsJson, result, source);
  if (!result.error) fallbackSemanticFromCategory(byCat.SEMANTIC ?? [], result, source);

  return result;
}

function groupByCategory(colors: StyleguideColor[]): Record<string, StyleguideColor[]> {
  const byCat: Record<string, StyleguideColor[]> = {};
  for (const c of colors) {
    const key = String(c.category);
    (byCat[key] ??= []).push(c);
  }
  // sorteer NEUTRAL op lichtheid (lichtste eerst) zodat pickers deterministisch zijn
  if (byCat.NEUTRAL) {
    byCat.NEUTRAL = [...byCat.NEUTRAL].sort(
      (a, b) => getLightness(b.hex) - getLightness(a.hex),
    );
  }
  return byCat;
}

function collectButtonBackgroundFrequency(
  components: StyleguideComponent[],
): Map<string, number> {
  const freq = new Map<string, number>();
  for (const c of components) {
    if (String(c.type) !== 'BUTTON') continue;
    const styles = c.extractedStyles as { background?: string } | null;
    const bg = normalizeHex(styles?.background);
    if (!bg) continue;
    freq.set(bg, (freq.get(bg) ?? 0) + 1);
  }
  return freq;
}

function pickPrimary(
  buttonBgFreq: Map<string, number>,
  primaryCategory: StyleguideColor[],
): { hex: string; source: string } | null {
  // Meest-voorkomende button-bg met lage-lichtheid (CTA's zijn zelden wit)
  const sorted = [...buttonBgFreq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [hex, count] of sorted) {
    const L = getLightness(hex);
    if (L < 88) {
      return { hex, source: `button-bg ${count}x` };
    }
  }
  const first = primaryCategory[0];
  if (first) return { hex: first.hex, source: 'category PRIMARY' };
  return null;
}

function resolveSurfaceTokens(
  neutrals: StyleguideColor[],
  result: Partial<Record<SemanticColorRole, string>>,
  source: Record<string, string>,
): void {
  if (neutrals.length === 0) {
    result.surface = '#FFFFFF';
    result['on-surface'] = '#1A1C1E';
    source.surface = 'default white fallback';
    source['on-surface'] = 'default dark fallback';
    return;
  }
  // neutrals is desc-gesorteerd op lichtheid
  const lightest = neutrals[0];
  const darkest = neutrals[neutrals.length - 1];
  result.surface = lightest.hex;
  source.surface = `neutral L=${getLightness(lightest.hex)}`;

  // on-surface: kies de donkerste neutral met voldoende contrast
  const candidate = darkest.hex;
  const ratio = contrastRatio(lightest.hex, candidate);
  if (ratio >= 4.5) {
    result['on-surface'] = candidate;
    source['on-surface'] = `neutral L=${getLightness(candidate)}`;
  } else {
    result['on-surface'] = '#1A1C1E';
    source['on-surface'] = 'fallback dark (neutral contrast too low)';
  }

  if (neutrals.length >= 3) {
    const midIdx = Math.floor(neutrals.length / 2);
    result['surface-variant'] = neutrals[midIdx].hex;
    source['surface-variant'] = `neutral mid L=${getLightness(neutrals[midIdx].hex)}`;
  }
}

function pickOutline(neutrals: StyleguideColor[]): { hex: string; lightness: number } | null {
  for (const n of neutrals) {
    const L = getLightness(n.hex);
    if (L >= 70 && L <= 90) return { hex: n.hex, lightness: L };
  }
  return null;
}

function resolveSemanticFromJson(
  raw: unknown,
  result: Partial<Record<SemanticColorRole, string>>,
  source: Record<string, string>,
): void {
  if (!raw || typeof raw !== 'object') return;
  const obj = raw as Record<string, unknown>;
  const mapping: Array<[string, SemanticColorRole]> = [
    ['danger', 'error'],
    ['error', 'error'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['info', 'info'],
  ];
  for (const [jsonKey, role] of mapping) {
    const val = obj[jsonKey];
    if (!val || typeof val !== 'object') continue;
    const base = (val as Record<string, unknown>).base;
    const hex = normalizeHex(typeof base === 'string' ? base : undefined);
    if (hex && !result[role]) {
      result[role] = hex;
      source[role] = `semanticColors.${jsonKey}.base`;
    }
  }
}

function fallbackSemanticFromCategory(
  semanticColors: StyleguideColor[],
  result: Partial<Record<SemanticColorRole, string>>,
  source: Record<string, string>,
): void {
  for (const c of semanticColors) {
    const tag = (c.tags ?? []).map((t) => t.toLowerCase());
    const nameLower = c.name.toLowerCase();
    const role = inferSemanticRole(nameLower, tag);
    if (role && !result[role]) {
      result[role] = c.hex;
      source[role] = `SEMANTIC category (${c.name})`;
    }
  }
}

function inferSemanticRole(name: string, tags: string[]): SemanticColorRole | null {
  const haystack = [name, ...tags].join(' ');
  if (/error|danger|alert/.test(haystack)) return 'error';
  if (/success|confirm|ok|positive/.test(haystack)) return 'success';
  if (/warning|warn|caution/.test(haystack)) return 'warning';
  if (/info|note/.test(haystack)) return 'info';
  return null;
}

// ─── On-color enforcement ─────────────────────────────

function enforceOnColorPairs(
  colors: Partial<Record<SemanticColorRole, string>>,
  warnings: WcagWarning[],
): void {
  const pairs: Array<[SemanticColorRole, SemanticColorRole]> = [
    ['primary', 'on-primary'],
    ['secondary', 'on-secondary'],
    ['tertiary', 'on-tertiary'],
    ['error', 'on-error'],
  ];
  for (const [bg, fg] of pairs) {
    const bgHex = colors[bg];
    if (!bgHex) continue;
    const chosen = pickForegroundForBackground(bgHex);
    colors[fg] = chosen.hex;
    if (chosen.ratio < 4.5) {
      warnings.push({
        role: fg,
        message: `Contrast ratio ${chosen.ratio.toFixed(2)}:1 fails WCAG AA (4.5:1) against ${bg} (${bgHex})`,
        contrastRatio: chosen.ratio,
      });
    }
  }
}

function pickForegroundForBackground(bgHex: string): { hex: string; ratio: number } {
  const white = contrastRatio(bgHex, '#FFFFFF');
  const black = contrastRatio(bgHex, '#000000');
  return white >= black
    ? { hex: '#FFFFFF', ratio: white }
    : { hex: '#000000', ratio: black };
}

// ─── Typography ───────────────────────────────────────

function mapTypographyRoles(
  typeScaleJson: unknown,
  primaryFont: string | null,
  fonts: StyleguideFont[],
): Partial<Record<TypeRole, TypographyToken>> {
  const result: Partial<Record<TypeRole, TypographyToken>> = {};
  const scale = parseTypeScale(typeScaleJson);
  if (scale.length === 0) return result;

  const family =
    primaryFont
    ?? fonts.find((f) => f.role === 'DISPLAY')?.name
    ?? fonts.find((f) => f.role === 'BODY')?.name
    ?? fonts[0]?.name
    ?? 'sans-serif';

  // Sorteer op fontSize desc
  const sorted = [...scale].sort((a, b) => b.sizePx - a.sizePx);

  // Deterministische mapping: headlines boven ~24px, labels onder ~14px, body daartussen
  const headlines: TypeRole[] = ['headline-display', 'headline-lg', 'headline-md', 'headline-sm'];
  const bodies: TypeRole[] = ['body-lg', 'body-md', 'body-sm'];
  const labels: TypeRole[] = ['label-lg', 'label-md', 'label-sm'];

  let hi = 0;
  let bi = 0;
  let li = 0;
  for (const entry of sorted) {
    const token: TypographyToken = {
      fontFamily: family,
      fontSize: entry.size,
      fontWeight: entry.weight,
      lineHeight: entry.lineHeight,
    };
    if (entry.sizePx >= 24 && hi < headlines.length) {
      result[headlines[hi++]] = token;
    } else if (entry.sizePx <= 13 && li < labels.length) {
      result[labels[li++]] = token;
    } else if (bi < bodies.length) {
      result[bodies[bi++]] = token;
    } else if (li < labels.length) {
      result[labels[li++]] = token;
    }
  }
  return result;
}

interface ParsedTypeScale {
  size: string;
  sizePx: number;
  weight: number;
  lineHeight: string;
}

function parseTypeScale(raw: unknown): ParsedTypeScale[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedTypeScale[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const size = typeof e.size === 'string' ? e.size : null;
    if (!size) continue;
    const sizePx = parseToPx(size);
    if (!Number.isFinite(sizePx) || sizePx <= 0) continue;
    const weight = Number(e.weight);
    out.push({
      size,
      sizePx,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 400,
      lineHeight: typeof e.lineHeight === 'string' ? e.lineHeight : '1.4',
    });
  }
  return out;
}

// ─── Rounded scale ────────────────────────────────────

function clusterRoundedScale(
  cornerRadiiJson: unknown,
  components: StyleguideComponent[],
): Partial<Record<RoundedScale, number>> {
  const observed = new Set<number>();
  for (const r of collectNumericValues(cornerRadiiJson)) observed.add(r);
  for (const c of components) {
    const styles = c.extractedStyles as { borderRadius?: string } | null;
    const px = parseToPx(styles?.borderRadius);
    if (Number.isFinite(px) && px >= 0) observed.add(px);
  }

  const buckets: Array<{ key: RoundedScale; min: number; max: number; defaultPx: number }> = [
    { key: 'none', min: 0, max: 0, defaultPx: 0 },
    { key: 'sm', min: 1, max: 5, defaultPx: 4 },
    { key: 'md', min: 6, max: 10, defaultPx: 8 },
    { key: 'lg', min: 11, max: 18, defaultPx: 16 },
    { key: 'xl', min: 19, max: 48, defaultPx: 24 },
    { key: 'full', min: 100, max: Infinity, defaultPx: 9999 },
  ];
  return bucketize(observed, buckets);
}

// ─── Spacing scale ────────────────────────────────────

function clusterSpacingScale(
  spacingScaleJson: unknown,
  components: StyleguideComponent[],
): Partial<Record<SpacingScale, number>> {
  const observed = new Set<number>();
  for (const v of collectNumericValues(spacingScaleJson)) observed.add(v);
  for (const c of components) {
    const styles = c.extractedStyles as { padding?: string } | null;
    for (const px of splitPaddingShorthand(styles?.padding)) {
      if (Number.isFinite(px) && px > 0) observed.add(px);
    }
  }

  const buckets: Array<{ key: SpacingScale; min: number; max: number; defaultPx: number }> = [
    { key: 'xs', min: 2, max: 6, defaultPx: 4 },
    { key: 'sm', min: 7, max: 12, defaultPx: 8 },
    { key: 'md', min: 13, max: 20, defaultPx: 16 },
    { key: 'lg', min: 21, max: 36, defaultPx: 24 },
    { key: 'xl', min: 37, max: Infinity, defaultPx: 48 },
  ];
  return bucketize(observed, buckets);
}

function splitPaddingShorthand(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map(parseToPx)
    .filter((n) => Number.isFinite(n));
}

// ─── Elevation ────────────────────────────────────────

function clusterElevation(
  shadowSystemJson: unknown,
  components: StyleguideComponent[],
): Partial<Record<ElevationLevel, string>> {
  const observed: string[] = [];
  if (Array.isArray(shadowSystemJson)) {
    for (const entry of shadowSystemJson) {
      if (!entry || typeof entry !== 'object') continue;
      const v = (entry as Record<string, unknown>).value;
      if (typeof v === 'string' && v.trim().length > 0) observed.push(v.trim());
    }
  }
  for (const c of components) {
    const styles = c.extractedStyles as { boxShadow?: string } | null;
    const s = styles?.boxShadow?.trim();
    if (s && s !== 'none') observed.push(s);
  }

  // Dedup en sorteer op geschatte intensiteit (aantal komma's = stacked shadows)
  const unique = [...new Set(observed)];
  unique.sort((a, b) => estimateShadowIntensity(a) - estimateShadowIntensity(b));

  const result: Partial<Record<ElevationLevel, string>> = {};
  const levels: ElevationLevel[] = ['1', '2', '3', '4', '5'];
  for (let i = 0; i < Math.min(unique.length, levels.length); i++) {
    result[levels[i]] = unique[i];
  }
  return result;
}

function estimateShadowIntensity(shadow: string): number {
  // Meer blur-radius + grotere offsets = hogere intensiteit.
  const numbers = shadow.match(/-?\d+(\.\d+)?/g) ?? [];
  const sum = numbers.map(Number).filter(Number.isFinite).reduce((a, b) => a + Math.abs(b), 0);
  return sum + shadow.split(',').length * 5;
}

// ─── Component variants ───────────────────────────────

function classifyComponentVariants(
  components: StyleguideComponent[],
  colors: Partial<Record<SemanticColorRole, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const c of components) {
    if (String(c.type) !== 'BUTTON') continue;
    const styles = c.extractedStyles as { background?: string } | null;
    const bg = normalizeHex(styles?.background);
    const variant = matchButtonVariant(bg, colors);
    if (variant) result[c.id] = variant;
  }
  return result;
}

function matchButtonVariant(
  bg: string | null,
  colors: Partial<Record<SemanticColorRole, string>>,
): string | null {
  if (!bg) return 'button-ghost';
  if (colors.primary && hexRoughlyEqual(bg, colors.primary)) return 'button-primary';
  if (colors.secondary && hexRoughlyEqual(bg, colors.secondary)) return 'button-secondary';
  if (colors.tertiary && hexRoughlyEqual(bg, colors.tertiary)) return 'button-tertiary';
  // Witte/transparante bg → ghost
  const L = getLightness(bg);
  if (L >= 95) return 'button-ghost';
  return 'button-other';
}

// ─── Diagnostics ──────────────────────────────────────

function computeUnresolvedRoles(
  colors: Partial<Record<SemanticColorRole, string>>,
): SemanticColorRole[] {
  return PRIMARY_REQUIRED.filter((role) => !colors[role]);
}

// ─── Helpers ──────────────────────────────────────────

function parseToPx(raw: string | undefined): number {
  if (!raw) return NaN;
  const trimmed = raw.trim();
  const m = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/);
  if (!m) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }
  const value = Number(m[1]);
  const unit = m[2];
  if (unit === 'rem' || unit === 'em') return value * 16;
  return value;
}

function collectNumericValues(raw: unknown): number[] {
  const out: number[] = [];
  if (!raw) return out;
  const walk = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
    else if (typeof v === 'string') {
      const px = parseToPx(v);
      if (Number.isFinite(px)) out.push(px);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(raw);
  return out;
}

function bucketize<K extends string>(
  observed: Set<number>,
  buckets: Array<{ key: K; min: number; max: number; defaultPx: number }>,
): Partial<Record<K, number>> {
  const result: Partial<Record<K, number>> = {};
  const values = [...observed].sort((a, b) => a - b);
  for (const bucket of buckets) {
    const matches = values.filter((v) => v >= bucket.min && v <= bucket.max);
    if (matches.length > 0) {
      // mediaan
      result[bucket.key] = Math.round(matches[Math.floor(matches.length / 2)]);
    }
  }
  // Als er helemaal geen observed waarden matchen, fall back op defaults voor required keys
  if (Object.keys(result).length === 0) {
    for (const bucket of buckets) {
      if (bucket.key === 'sm' || bucket.key === 'md' || bucket.key === 'lg') {
        result[bucket.key] = bucket.defaultPx;
      }
    }
  }
  return result;
}

function normalizeHex(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  // CSS values kunnen "rgb(...)" of "transparent" of "#RGB" zijn
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'transparent' || trimmed === 'none' || trimmed === 'inherit') return null;
  if (trimmed.startsWith('rgb')) {
    const m = trimmed.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
    if (!m) return null;
    return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  const hex = trimmed.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`.toUpperCase();
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getLightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 50;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return Math.round(((max + min) / 2 / 255) * 100);
}

function hexRoughlyEqual(a: string, b: string): boolean {
  // Tolerantie: Euclidische afstand in RGB ≤ 24 — buttons met subtiele tint-variaties
  // (bijv. hover-shade) blijven correct gemapped op hun basis-rol.
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return false;
  const dr = ra.r - rb.r;
  const dg = ra.g - rb.g;
  const db = ra.b - rb.b;
  return Math.sqrt(dr * dr + dg * dg + db * db) <= 24;
}
