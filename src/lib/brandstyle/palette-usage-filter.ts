/**
 * Usage-gedreven palet-filter (verbeterplan, 2026-06-05).
 *
 * Doel (user-eis): een kleur mag ALLEEN uit het palet vallen als hij
 * aantoonbaar NIET gebruikt wordt — niet op basis van een hardgecodeerde
 * hex-blocklist. De beslissing leunt op WERKELIJK RENDEREN, gemeten over
 * meerdere pagina's:
 *
 *   1. Multi-page computed-style aanwezigheid (`bulk-computed-styles`:
 *      `color` + `background-color` frequenties over álle zichtbare elementen
 *      op ~5 pagina's). Deterministisch, vangt ook kleine elementen (links,
 *      muted tekst) die een pixel-coverage-pass mist.
 *   2. Homepage pixel-pass usageEvidence (`color-usage-verifier`) als aanvulling.
 *
 * Regel:
 *   - Logo-kleuren en de structurele kleuren (donkerste tekst + lichtste
 *     surface) blijven ALTIJD.
 *   - Een framework-default-kleur (Bootstrap/WordPress — herkend via de
 *     bekende hex of een `framework`/`bootstrap`-tag) blijft alléén bij STERK
 *     gebruik (zwakke link-rendering van een default-kleur is geen merk-keuze).
 *   - Elke andere kleur blijft zodra hij ÉRGENS écht rendert (weak+).
 *   - Kleuren die op géén enkele geanalyseerde pagina renderen → drop.
 *   - Safety: nooit het hele palet wegfilteren.
 *
 * Pure module — deterministisch testbaar met fixtures.
 */
import { isFrameworkDefaultPrimary } from './framework-defaults';

export type RenderStrength = 'strong' | 'weak' | 'none';

export interface UsageFilterColor {
  hex: string;
  tags?: string[];
  detectorSource?: string | null;
}

/** Frequency-maps zoals `bulk-computed-styles` ze levert (waarde → count). */
export interface BulkColorStyles {
  color?: Record<string, number>;
  'background-color'?: Record<string, number>;
  'border-color'?: Record<string, number>;
}

/** RGB-Euclidische tolerantie voor "dezelfde kleur" (computed vs palet-hex).
 *  Gelijkgetrokken met color-usage-verifier (40) i.p.v. strenger 24, tegen
 *  logo-/quantisatie-drift (review-fix MINOR-2). */
const MATCH_TOLERANCE = 40;
/** Aandeel-drempel waarboven computed-aanwezigheid als STERK telt. */
const STRONG_SHARE = 0.02;
/** Minimum aantal computed-kleur-samples vóór 'strong' überhaupt mogelijk is.
 *  Zonder deze floor wordt op een dunne pagina (weinig elementen) een paar
 *  framework-button-renders al 'strong' (share-noemer te klein) → under-drop
 *  van precies de framework-ruis die we willen weren (review-fix MAJOR-3). */
const MIN_STRONG_SAMPLES = 60;
/** Framework-tags (exact-token) die framework-herkomst markeren. */
const FRAMEWORK_TAGS = ['framework', 'bootstrap', 'wordpress', 'gutenberg', 'synced'];

interface Rgb { r: number; g: number; b: number }

function parseRgb(value: string): Rgb | null {
  const v = value.trim().toLowerCase();
  const rgbMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
  }
  let hex = v.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  return null;
}

function dist(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function lightness(rgb: Rgb): number {
  // Perceptueel-gewogen luminantie (0-255).
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Bouwt een totaal-frequentie + een lijst van (rgb, count) uit de computed
 * `color` + `background-color` maps. Niet-parsebare/transparante waarden worden
 * overgeslagen.
 */
export function buildRenderedColorIndex(bulk: BulkColorStyles | null | undefined): {
  entries: Array<{ rgb: Rgb; count: number }>;
  total: number;
} {
  const entries: Array<{ rgb: Rgb; count: number }> = [];
  let total = 0;
  for (const map of [bulk?.color, bulk?.['background-color'], bulk?.['border-color']]) {
    if (!map) continue;
    for (const [value, count] of Object.entries(map)) {
      if (!count || count <= 0) continue;
      const lower = value.trim().toLowerCase();
      // Skip alléén `transparent` + rgba met ALPHA 0 — NIET rgb(r,g,0) waar het
      // blauw-kanaal toevallig 0 is (bv. oranje rgb(224,96,0) is volledig opaak!).
      if (lower === 'transparent') continue;
      const rgbaAlpha = lower.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/);
      if (rgbaAlpha && parseFloat(rgbaAlpha[1]) === 0) continue;
      const rgb = parseRgb(value);
      if (!rgb) continue;
      entries.push({ rgb, count });
      total += count;
    }
  }
  return { entries, total };
}

/**
 * Renderkracht van een palet-hex op basis van de multi-page computed-aanwezigheid:
 * sommeert de counts van alle computed-kleuren binnen RGB-tolerantie en
 * vergelijkt het aandeel met STRONG_SHARE. Geen match → 'none'.
 */
export function renderStrength(
  hex: string,
  index: { entries: Array<{ rgb: Rgb; count: number }>; total: number },
): RenderStrength {
  const target = parseRgb(hex);
  if (!target || index.total === 0) return 'none';
  let matched = 0;
  for (const e of index.entries) {
    if (dist(e.rgb, target) <= MATCH_TOLERANCE) matched += e.count;
  }
  if (matched === 0) return 'none';
  // 'strong' vereist een aandeel ÉN voldoende samples — anders is een hoog
  // aandeel op te weinig data (dunne pagina) misleidend.
  if (index.total >= MIN_STRONG_SAMPLES && matched / index.total >= STRONG_SHARE) return 'strong';
  return 'weak';
}

const STRENGTH_RANK: Record<RenderStrength, number> = { none: 0, weak: 1, strong: 2 };
function strongest(a: RenderStrength, b: RenderStrength): RenderStrength {
  return STRENGTH_RANK[a] >= STRENGTH_RANK[b] ? a : b;
}

// Bootstrap's complete neutrale grijs-schaal ($gray-100..$gray-900). Deze
// renderen op een puur-Bootstrap-site als default tekst/muted/border-grijs
// zónder dat het bewuste merk-kleuren zijn (Zwarthout: #6C757D = gray-600 =
// text-muted). Door ze als framework-default te herkennen moeten ze de STERKE-
// gebruik-lat halen; de echte tekst/surface (#212529/#F8F9FA) overleven sowieso
// via de structurele bescherming + sterk gebruik, maar een incidentele
// muted-grijs valt. Deterministisch, geen brittle blocklist: het auto-dropt
// niet — het verhoogt alleen de bewijslast naar "sterk gebruikt".
const FRAMEWORK_NEUTRAL_HEXES = new Set(
  ['#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D', '#495057', '#343A40', '#212529'].map((h) =>
    h.toLowerCase(),
  ),
);

function isFrameworkOrigin(c: UsageFilterColor): boolean {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  return (
    isFrameworkDefaultPrimary(c.hex) ||
    FRAMEWORK_NEUTRAL_HEXES.has(c.hex.toLowerCase()) ||
    tags.some((t) => FRAMEWORK_TAGS.includes(t))
  );
}

function isLogoColor(c: UsageFilterColor): boolean {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  return /logo/.test((c.detectorSource ?? '').toLowerCase()) || tags.some((t) => t.includes('logo'));
}

export interface UsageFilterSignals {
  /** Multi-page computed `color`/`background-color` frequenties (of null als de
   *  component-screenshotter uit staat — dan telt alleen `usageEvidenceByHex`). */
  bulkColorStyles: BulkColorStyles | null;
  /** Homepage pixel-pass verdict per (genormaliseerde, uppercase) hex. */
  usageEvidenceByHex: Map<string, RenderStrength | undefined>;
}

/**
 * Bepaalt per kleur of hij behouden wordt, gegeven de multi-page usage-signalen.
 * Geeft de behouden kleuren terug (volgorde behouden). Nooit leeg: als alles zou
 * vallen, geeft het de originele lijst terug (safety).
 */
export function applyUsageDrivenPaletteFilter<T extends UsageFilterColor>(
  colors: T[],
  signals: UsageFilterSignals,
): T[] {
  if (colors.length === 0) return colors;
  const index = buildRenderedColorIndex(signals.bulkColorStyles);

  // Was er überhaupt usage-DATA? (multi-page scan gedraaid, of homepage pixel-
  // pass verdict aanwezig). Zonder data droppen we niets — afwezigheid van
  // bewijs is geen bewijs van afwezigheid.
  const hasMultiPage = index.total > 0;
  const usageOf = (hex: string): { strength: RenderStrength; known: boolean } => {
    const computed = hasMultiPage ? renderStrength(hex, index) : 'none';
    const pixel = signals.usageEvidenceByHex.get(hex.toUpperCase());
    const known = hasMultiPage || pixel !== undefined;
    return { strength: strongest(computed, pixel ?? 'none'), known };
  };
  const usageCache = new Map<string, { strength: RenderStrength; known: boolean }>();
  for (const c of colors) usageCache.set(c.hex.toUpperCase(), usageOf(c.hex));

  // Structurele bescherming: donkerste (tekst) + lichtste (surface) blijven
  // altijd — dat zijn de basis-leespaar-kleuren. Bepaald over de GERENDERDE
  // subset (review-fix MINOR-1) zodat een ongebruikte framework-extreme
  // (#000/#FFF) niet als "donkerste/lichtste" gered wordt; fallback op het
  // hele palet als niets rendert.
  const rendered = colors.filter((c) => usageCache.get(c.hex.toUpperCase())?.strength !== 'none');
  const structuralPool = rendered.length > 0 ? rendered : colors;
  let darkest = { hex: '', l: Infinity };
  let lightest = { hex: '', l: -Infinity };
  for (const c of structuralPool) {
    const rgb = parseRgb(c.hex);
    if (!rgb) continue;
    const l = lightness(rgb);
    if (l < darkest.l) darkest = { hex: c.hex.toUpperCase(), l };
    if (l > lightest.l) lightest = { hex: c.hex.toUpperCase(), l };
  }

  const keep = (c: T): boolean => {
    const hexU = c.hex.toUpperCase();
    if (isLogoColor(c)) return true;
    if (hexU === darkest.hex || hexU === lightest.hex) return true;
    const { strength, known } = usageCache.get(hexU) ?? { strength: 'none' as RenderStrength, known: false };
    if (!known) return true;                              // geen bewijs → behouden
    if (strength === 'none') return false;                // rendert aantoonbaar nergens → drop
    if (isFrameworkOrigin(c)) return strength === 'strong'; // default-kleur: alleen bij sterk gebruik
    return true;                                          // niet-framework + rendert (weak+) → behouden
  };

  const kept = colors.filter(keep);
  return kept.length > 0 ? kept : colors;
}
