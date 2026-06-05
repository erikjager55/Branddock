/**
 * Kleurcombinatie-generator voor de brandstyle (verbeterplan Fase 5,
 * audit 2026-06-05). De pijplijn leverde losse swatches maar GEEN
 * fg/bg-combinaties — user-symptoom "geen kleurcombinaties".
 *
 * `buildColorPairings` leidt uit het geclassificeerde palet WCAG-geverifieerde,
 * rol-gelabelde combinaties af (knop-fills, merk-op-surface, basis-leespaar).
 * Pure functie — testbaar zonder DB/scrape.
 */
import { contrastRatio } from '@/features/brandstyle/utils/color-utils';

export interface PaletteColorLike {
  hex: string;
  // `string` zodat zowel de 5-value ResolvedColor-categorie als de bredere
  // Prisma ColorCategory-enum (incl. legacy BACKGROUND e.d.) passen; byCat
  // matcht alleen PRIMARY/SECONDARY/ACCENT/NEUTRAL exact — de rest wordt
  // genegeerd.
  category: string;
}

export interface ColorPairing {
  /** Mensvriendelijk rol-label, bv. "Primaire knop", "Accent op licht". */
  label: string;
  background: string;
  foreground: string;
  contrastRatio: number;
  wcag: 'AAA' | 'AA' | 'AA-large' | 'fail';
  usage: 'button' | 'text-on-surface' | 'surface-pair';
}

const WHITE = '#FFFFFF';
const BLACK = '#000000';

function wcagLevel(ratio: number): ColorPairing['wcag'] {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

/** Beste (hoogste-contrast) foreground uit kandidaten voor een achtergrond. */
function bestForeground(bg: string, candidates: string[]): { hex: string; ratio: number } | null {
  let best: { hex: string; ratio: number } | null = null;
  for (const c of candidates) {
    if (c.toLowerCase() === bg.toLowerCase()) continue;
    const ratio = contrastRatio(bg, c);
    if (!best || ratio > best.ratio) best = { hex: c, ratio };
  }
  return best;
}

const CATEGORY_LABEL: Record<string, string> = {
  PRIMARY: 'Primair',
  SECONDARY: 'Secundair',
  ACCENT: 'Accent',
};

// Expliciete knop-labels (geen "+e"-afleiding — "Accente" is fout NL).
const BUTTON_LABEL: Record<string, string> = {
  PRIMARY: 'Primaire knop',
  SECONDARY: 'Secundaire knop',
  ACCENT: 'Accentknop',
};

/**
 * Genereert kleurcombinaties uit een geclassificeerd palet. Combineert
 * PRIMARY/SECONDARY/ACCENT-fills met leesbare foregrounds (uit de eigen
 * neutrals + wit/zwart) en het basis-leespaar (donkerste tekst op lichtste
 * surface). Alleen combinaties met minimaal AA-large (≥3:1) worden bewaard.
 */
export function buildColorPairings(colors: PaletteColorLike[]): ColorPairing[] {
  if (colors.length === 0) return [];
  const byCat = (cat: PaletteColorLike['category']) =>
    colors.filter((c) => c.category === cat).map((c) => c.hex);
  const neutrals = byCat('NEUTRAL');
  // Lichte surfaces (hoog contrast t.o.v. zwart) en donkere tekst-kleuren.
  // Donkere NEUTRALs gesorteerd op donkerheid (donkerste eerst) zodat het
  // basis-leespaar de WERKELIJKE merk-tekstkleur gebruikt (#1A1A1A), met zwart
  // alleen als fallback — niet altijd hardcoded #000000.
  const darkNeutrals = neutrals
    .filter((h) => contrastRatio(h, WHITE) >= 9)
    .sort((a, b) => contrastRatio(b, WHITE) - contrastRatio(a, WHITE));
  const lights = [WHITE, ...neutrals.filter((h) => contrastRatio(h, BLACK) >= 9)];
  const darks = [...darkNeutrals, BLACK];
  const fgPool = Array.from(new Set([...darks, ...lights]));
  const lightestSurface = lights[0] ?? WHITE;
  // De WERKELIJKE donkerste merk-neutral als donkere surface (Zwarthout:
  // #212529) en de werkelijke lichte merk-neutral (Soft White) als tekst
  // daarop. Undefined wanneer het merk geen donkere neutral voert.
  const darkSurface = darkNeutrals[0];
  const lightOnDark = lights.find((h) => h !== WHITE) ?? WHITE;
  const darkText = darks[0];

  const out: ColorPairing[] = [];
  const seen = new Set<string>();
  const push = (label: string, bg: string, fg: string, usage: ColorPairing['usage'], minRatio: number) => {
    const key = `${bg.toLowerCase()}|${fg.toLowerCase()}`;
    if (seen.has(key)) return;
    const ratio = contrastRatio(bg, fg);
    if (ratio < minRatio) return;
    seen.add(key);
    out.push({ label, background: bg, foreground: fg, contrastRatio: Math.round(ratio * 100) / 100, wcag: wcagLevel(ratio), usage });
  };

  // Knoppen — fill als achtergrond met de best leesbare foreground.
  for (const cat of ['PRIMARY', 'SECONDARY', 'ACCENT'] as const) {
    for (const fill of byCat(cat)) {
      const fg = bestForeground(fill, fgPool);
      if (fg) push(BUTTON_LABEL[cat], fill, fg.hex, 'button', 3);
    }
  }

  // Surface-combinaties voor zowel een LICHTE als (indien aanwezig) een DONKERE
  // merk-surface. Een donker-thema-merk (zwarthout: charcoal-achtergrond met
  // witte/oranje tekst) krijgt zo zijn dominante dark-mode-combinaties, die in
  // de oude licht-only-generatie volledig ontbraken.
  const surfaces: Array<{ bg: string; suffix: string; text: string | undefined }> = [
    { bg: lightestSurface, suffix: 'op licht', text: darkText },
  ];
  if (darkSurface) surfaces.push({ bg: darkSurface, suffix: 'op donker', text: lightOnDark });

  for (const s of surfaces) {
    // Basis-leespaar: merk-tekstkleur op deze surface.
    if (s.text) {
      push(s.suffix === 'op licht' ? 'Tekst op surface' : 'Tekst op donker', s.bg, s.text, 'surface-pair', 4.5);
    }
    // Merk-fills (primary/secondary/accent) als tekst/accent op deze surface.
    for (const cat of ['PRIMARY', 'SECONDARY', 'ACCENT'] as const) {
      for (const fill of byCat(cat)) {
        push(`${CATEGORY_LABEL[cat]} ${s.suffix}`, s.bg, fill, 'text-on-surface', 3);
      }
    }
  }

  return out;
}
