/**
 * Observed-kleurcombinaties (2026-06-05). Bouwt de kleurcombinaties uit de
 * WERKELIJK op de pagina's voorkomende (tekstkleur | effectieve-achtergrond)-
 * paren (`bulk-computed-styles.colorPairs`, multi-page) i.p.v. ze te genereren
 * uit palet-categorieën. Zo tonen we precies de combinaties die écht gebruikt
 * worden — bv. een donker-thema-merk (zwart bg + witte/oranje tekst).
 *
 * Elke geobserveerde fg/bg wordt op het FINALE palet gemapt (nearest binnen
 * tolerantie). Combinaties tussen twee palet-kleuren met voldoende contrast
 * blijven, gelabeld op rol en gesorteerd op frequentie. Pure functie.
 */
import { contrastRatio } from '@/features/brandstyle/utils/color-utils';
import type { ColorPairing, PaletteColorLike } from './color-pairings';

/** RGB-tolerantie voor "dezelfde kleur" (consistent met palette-usage-filter). */
const MATCH_TOLERANCE = 40;
/** Minimale contrast om een combinatie te tonen (onbruikbaar lager). */
const MIN_CONTRAST = 3;
/** Max aantal combinaties. */
const MAX_PAIRINGS = 8;

const CATEGORY_LABEL: Record<string, string> = {
  PRIMARY: 'Primair',
  SECONDARY: 'Secundair',
  ACCENT: 'Accent',
};
const BUTTON_LABEL: Record<string, string> = {
  PRIMARY: 'Primaire knop',
  SECONDARY: 'Secundaire knop',
  ACCENT: 'Accentknop',
};

interface Rgb { r: number; g: number; b: number }

function parseRgb(value: string): Rgb | null {
  const v = value.trim().toLowerCase();
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
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

function wcagLevel(ratio: number): ColorPairing['wcag'] {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

function lightness(rgb: Rgb): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/** Map een gerenderde css-kleur naar de dichtstbijzijnde palet-kleur (of null). */
function matchPalette(value: string, palette: Array<{ hex: string; rgb: Rgb; category: string }>): { hex: string; category: string } | null {
  const rgb = parseRgb(value);
  if (!rgb) return null;
  let best: { hex: string; category: string; d: number } | null = null;
  for (const p of palette) {
    const d = dist(rgb, p.rgb);
    if (d <= MATCH_TOLERANCE && (!best || d < best.d)) best = { hex: p.hex, category: p.category, d };
  }
  return best ? { hex: best.hex, category: best.category } : null;
}

function labelFor(fgCat: string, bgCat: string, bgRgb: Rgb): { label: string; usage: ColorPairing['usage'] } {
  const brand = (c: string) => c === 'PRIMARY' || c === 'SECONDARY' || c === 'ACCENT';
  // Gevuld vlak (bg = merk-kleur): knop/badge.
  if (brand(bgCat)) return { label: BUTTON_LABEL[bgCat] ?? 'Knop', usage: 'button' };
  const onDark = lightness(bgRgb) < 128;
  // Merk-kleur als tekst/accent op een neutrale surface.
  if (brand(fgCat)) return { label: `${CATEGORY_LABEL[fgCat]} op ${onDark ? 'donker' : 'licht'}`, usage: 'text-on-surface' };
  // Neutrale tekst op neutrale surface (basis-leespaar).
  return { label: `Tekst op ${onDark ? 'donker' : 'surface'}`, usage: 'surface-pair' };
}

/**
 * Bouwt kleurcombinaties uit de geobserveerde paren. Lege/onbruikbare input →
 * lege lijst (de caller valt dan terug op de gegenereerde `buildColorPairings`).
 */
export function buildObservedColorPairings(
  pairFreq: Record<string, number> | null | undefined,
  palette: PaletteColorLike[],
): ColorPairing[] {
  if (!pairFreq || palette.length === 0) return [];
  const pal = palette
    .map((c) => ({ hex: c.hex, category: c.category, rgb: parseRgb(c.hex) }))
    .filter((p): p is { hex: string; category: string; rgb: Rgb } => p.rgb !== null);
  if (pal.length === 0) return [];

  // Aggregeer per (palet-hex-fg | palet-hex-bg), opgeteld over alle gerenderde
  // varianten die op hetzelfde palet-paar mappen.
  const agg = new Map<string, { fg: string; bg: string; fgCat: string; bgCat: string; bgRgb: Rgb; count: number }>();
  for (const [pair, count] of Object.entries(pairFreq)) {
    const sep = pair.split('|');
    if (sep.length !== 2) continue;
    const fgMatch = matchPalette(sep[0], pal);
    const bgMatch = matchPalette(sep[1], pal);
    if (!fgMatch || !bgMatch) continue;
    if (fgMatch.hex.toLowerCase() === bgMatch.hex.toLowerCase()) continue;
    const ratio = contrastRatio(bgMatch.hex, fgMatch.hex);
    if (ratio < MIN_CONTRAST) continue;
    const key = `${bgMatch.hex.toLowerCase()}|${fgMatch.hex.toLowerCase()}`;
    const bgRgb = parseRgb(bgMatch.hex)!;
    const cur = agg.get(key);
    if (cur) cur.count += count;
    else agg.set(key, { fg: fgMatch.hex, bg: bgMatch.hex, fgCat: fgMatch.category, bgCat: bgMatch.category, bgRgb, count });
  }

  const out: ColorPairing[] = [];
  const seenLabel = new Set<string>();
  for (const e of [...agg.values()].sort((a, b) => b.count - a.count)) {
    const { label, usage } = labelFor(e.fgCat, e.bgCat, e.bgRgb);
    if (seenLabel.has(label)) continue; // één representant per rol-label
    seenLabel.add(label);
    const ratio = contrastRatio(e.bg, e.fg);
    out.push({ label, background: e.bg, foreground: e.fg, contrastRatio: Math.round(ratio * 100) / 100, wcag: wcagLevel(ratio), usage });
    if (out.length >= MAX_PAIRINGS) break;
  }
  return out;
}
