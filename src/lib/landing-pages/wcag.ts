/**
 * WCAG 2.1 contrast helper utility (Sprint 2 van
 * docs/specs/brand-styling-consistency-plan.md §3b).
 *
 * Pure functies, geen externe deps (eigen 2KB-implementatie ipv Color.js).
 * Gebruikt door:
 *   - brand-tokens.ts: pre-render validation in extractor
 *   - landing-page-quality.ts: F-VAL dimensie 7 (WCAG-compliance)
 *   - puck-config.tsx: runtime safety-net bij dynamic colors
 *
 * WCAG 2.1 thresholds:
 *   - AA normal text (< 18px regular OR < 14px bold): 4.5:1
 *   - AA large text  (≥ 18px regular OR ≥ 14px bold): 3:1
 *   - AAA normal text: 7:1
 *   - AAA large text:  4.5:1
 *   - Non-text contrast (UI components, borders, focus): 3:1
 */

import { relativeLuminance } from './brand-tokens';

// ─── Public types ─────────────────────────────────────────

export type WCAGLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large' | 'non-text';

export interface WCAGCheck {
  /** Foreground color hex */
  fg: string;
  /** Background color hex */
  bg: string;
  /** Berekende contrast-ratio (1:1 tot 21:1) */
  ratio: number;
  /** Minimum vereiste ratio voor opgegeven level + size */
  minRatio: number;
  /** Voldoet aan WCAG-criterium */
  passes: boolean;
  /** Welk level + size getest is */
  level: WCAGLevel;
  size: TextSize;
}

export interface WCAGValidationResult {
  /** Alle individuele checks die uitgevoerd zijn */
  checks: WCAGCheck[];
  /** Aantal failed checks */
  failureCount: number;
  /** Hoogste level dat alle checks haalt — null als zelfs AA niet gehaald */
  achievedLevel: WCAGLevel | null;
}

// ─── Constants ────────────────────────────────────────────

const MIN_RATIOS: Record<WCAGLevel, Record<TextSize, number>> = {
  AA: {
    normal: 4.5,
    large: 3,
    'non-text': 3,
  },
  AAA: {
    normal: 7,
    large: 4.5,
    'non-text': 3, // AAA heeft geen apart non-text-niveau; behoudt 3:1
  },
};

// ─── Core utilities ───────────────────────────────────────

/**
 * Bereken contrast-ratio tussen twee kleuren volgens WCAG 2.1 formule:
 *   (L1 + 0.05) / (L2 + 0.05)
 * waarbij L1 = lichtste en L2 = donkerste relative luminance.
 *
 * Returns 1.0 (no contrast) tot 21.0 (zwart op wit). Hogere is beter.
 */
export function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get minimum required ratio voor een level + size combinatie.
 */
export function getMinRatio(level: WCAGLevel, size: TextSize): number {
  return MIN_RATIOS[level][size];
}

/**
 * Test of een fg/bg pair WCAG-criteria haalt.
 */
export function meetsWCAG(
  fg: string,
  bg: string,
  opts: { level: WCAGLevel; size: TextSize },
): boolean {
  const ratio = contrastRatio(fg, bg);
  const minRatio = getMinRatio(opts.level, opts.size);
  return ratio >= minRatio;
}

/**
 * Volledige check met details (ratio + verdict).
 */
export function checkContrast(
  fg: string,
  bg: string,
  opts: { level: WCAGLevel; size: TextSize },
): WCAGCheck {
  const ratio = contrastRatio(fg, bg);
  const minRatio = getMinRatio(opts.level, opts.size);
  return {
    fg,
    bg,
    ratio,
    minRatio,
    passes: ratio >= minRatio,
    level: opts.level,
    size: opts.size,
  };
}

// ─── Token-pair validation ────────────────────────────────

export interface TokenPairValidationInput {
  /** Body-text op surface (≥ AA normal = 4.5:1). */
  onSurface?: { fg: string; bg: string };
  /** Sub-text op surface (≥ AA normal = 4.5:1, of large = 3:1 voor labels). */
  surfaceMuted?: { fg: string; bg: string };
  /** Text op brand-fill (≥ AA normal = 4.5:1). */
  onBrand?: { fg: string; bg: string };
  /** Text op action-fill (≥ AA normal = 4.5:1). */
  onAction?: { fg: string; bg: string };
  /** Border/divider (≥ 3:1 non-text). */
  surfaceBorder?: { fg: string; bg: string };
  /** Focus-ring (≥ 3:1 non-text). */
  accentFocusRing?: { fg: string; bg: string };
}

/**
 * Valideer alle relevante token-pairs voor een landing-page tegen WCAG AA.
 * Returns details over welke pairs falen + welk niveau bereikt is.
 */
export function validateTokenPairs(
  input: TokenPairValidationInput,
): WCAGValidationResult {
  const checks: WCAGCheck[] = [];

  if (input.onSurface) {
    checks.push(checkContrast(input.onSurface.fg, input.onSurface.bg, { level: 'AA', size: 'normal' }));
  }
  if (input.surfaceMuted) {
    // surfaceMuted wordt vaak voor labels/meta gebruikt — minder strict (large)
    checks.push(checkContrast(input.surfaceMuted.fg, input.surfaceMuted.bg, { level: 'AA', size: 'normal' }));
  }
  if (input.onBrand) {
    checks.push(checkContrast(input.onBrand.fg, input.onBrand.bg, { level: 'AA', size: 'normal' }));
  }
  if (input.onAction) {
    checks.push(checkContrast(input.onAction.fg, input.onAction.bg, { level: 'AA', size: 'normal' }));
  }
  if (input.surfaceBorder) {
    checks.push(checkContrast(input.surfaceBorder.fg, input.surfaceBorder.bg, { level: 'AA', size: 'non-text' }));
  }
  if (input.accentFocusRing) {
    checks.push(checkContrast(input.accentFocusRing.fg, input.accentFocusRing.bg, { level: 'AA', size: 'non-text' }));
  }

  const failureCount = checks.filter((c) => !c.passes).length;
  let achievedLevel: WCAGLevel | null = null;
  if (failureCount === 0) {
    // Check of ook AAA gehaald wordt (re-run met AAA-thresholds)
    const aaaChecks = checks.map((c) =>
      checkContrast(c.fg, c.bg, { level: 'AAA', size: c.size }),
    );
    achievedLevel = aaaChecks.every((c) => c.passes) ? 'AAA' : 'AA';
  }

  return { checks, failureCount, achievedLevel };
}

// ─── Color picking helpers ────────────────────────────────

/**
 * Kies de safer optie tussen 2 candidates (hoogste contrast op bg).
 * Gebruikt door extractor als fallback wanneer primaire keuze faalt.
 */
export function pickHigherContrast(
  candidate1: string,
  candidate2: string,
  bg: string,
): string {
  return contrastRatio(candidate1, bg) >= contrastRatio(candidate2, bg)
    ? candidate1
    : candidate2;
}

/**
 * Force black-or-white als safe text-color op een gegeven bg.
 * Returns #000000 of #FFFFFF — welke de hoogste contrast geeft.
 */
export function blackOrWhiteFor(bg: string): '#000000' | '#FFFFFF' {
  return contrastRatio('#000000', bg) >= contrastRatio('#FFFFFF', bg)
    ? '#000000'
    : '#FFFFFF';
}

/**
 * Behoud een voorkeurskleur als die voldoende contrasteert met `bg`; val anders
 * terug op `fallback` (indien leesbaar) en dan op zwart/wit. `minRatio` default
 * 5.0 (iets boven AA 4.5 — een grijs dat net 4.5 haalt oogt faint voor body).
 */
export function readableTextColor(fg: string, bg: string, fallback: string, minRatio = 5.0): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  if (contrastRatio(fallback, bg) >= minRatio) return fallback;
  return blackOrWhiteFor(bg);
}

/**
 * Forceer een leesbare tekstkleur tegen de WERKELIJK gerenderde achtergrond.
 * Lost de LP-render-bug op waarbij een per-rol gescrapte kleur uit een ándere
 * bron-context (zwarthout's donkere hero → witte h1) op de uiteindelijke lichte
 * sectie-achtergrond belandde, of een tegen `tokens.surface` gevalideerde kleur
 * op een zwarte card werd gerenderd. ALTIJD de echte blok-achtergrond meegeven.
 *
 * `minRatio`: 3.0 voor grote kop/display-tekst (AA-large — houdt bv. een merk-
 * oranje kop leesbaar-genoeg), 5.0 (default) voor body/kleine tekst.
 */
/**
 * Normaliseer een CSS-kleur naar 6-digit hex voor contrast-meting. `contrastRatio`
 * leunt op `hexToRgb` dat ALLEEN 6-digit hex parst — een gescrapte `rgb(...)` /
 * 3-digit-hex card-bg werd anders als zwart (luminance 0) gemeten → witte tekst
 * op een witte card. Returnt null voor niet-solide/onbekende waarden (named,
 * gradient, url(...)) zodat de caller dan NIET blind flipt.
 */
export function normalizeColorToHex(c: string): string | null {
  const s = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  const m3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (m3) return `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
  const mrgb = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (mrgb) {
    const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${h(+mrgb[1])}${h(+mrgb[2])}${h(+mrgb[3])}`;
  }
  return null;
}

export function resolveOnColor(
  fg: string | null | undefined,
  bg: string,
  opts?: { fallback?: string | null; minRatio?: number },
): string {
  const minRatio = opts?.minRatio ?? 5.0;
  const hexBg = normalizeColorToHex(bg);
  // Onmeetbare bg (gradient/named/url) → niet blind flippen: behoud de
  // voorkeurskleur (fg, dan fallback) i.p.v. een verkeerde zwart-aanname.
  if (!hexBg) return fg ?? opts?.fallback ?? blackOrWhiteFor(bg);
  if (fg && contrastRatio(normalizeColorToHex(fg) ?? fg, hexBg) >= minRatio) return fg;
  if (opts?.fallback && contrastRatio(normalizeColorToHex(opts.fallback) ?? opts.fallback, hexBg) >= minRatio) return opts.fallback;
  return blackOrWhiteFor(hexBg);
}

/**
 * Detecteert of een gescrapte card-achtergrond uit een tégengestelde licht/
 * donker-context komt dan de sectie waar hij nu op staat. Een puur-zwarte
 * gescrapte PRODUCT_CARD op een lichte feature-sectie (zwarthout: het sample
 * kwam uit een donkere sectie van de bronsite) leest als een misplaatst blok.
 * Alleen EXTREME inversies triggeren — subtiele grijstinten op wit (een legit
 * licht-grijze card) blijven gerespecteerd, en onmeetbare waarden (gradient/
 * named/url) → false zodat we de scraped-fidelity niet onterecht weggooien.
 */
export function isCardContextMismatch(
  cardBg: string | null | undefined,
  sectionBg: string | null | undefined,
): boolean {
  if (!cardBg || !sectionBg) return false;
  const c = normalizeColorToHex(cardBg);
  const s = normalizeColorToHex(sectionBg);
  if (!c || !s) return false;
  const cl = relativeLuminance(c);
  const sl = relativeLuminance(s);
  // Streng: alleen near-black (cl < 0.12) op licht, of near-white (cl > 0.85)
  // op donker. Een mid-grijze card (#6C757D, L≈0.18) op wit is een legitiem
  // design, geen mis-scrape — die mag blijven.
  return (cl < 0.12 && sl > 0.55) || (cl > 0.85 && sl < 0.18);
}

/** RGB-afstand-vergelijk (genormaliseerd naar hex). Tol 44 ≈ palette-MATCH. */
export function isCloseColor(a: string, b: string, tol = 44): boolean {
  const ha = normalizeColorToHex(a);
  const hb = normalizeColorToHex(b);
  if (!ha || !hb) return false;
  const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = rgb(ha);
  const [r2, g2, b2] = rgb(hb);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) <= tol;
}

/**
 * "Luide" kleur — verzadigd genoeg dat overmatig gebruik als heading de CTA
 * verzwakt (HSL S > 0.65, L in [0.25,0.65]). Gedempte/luxe accenten (Luxe-Goud
 * #B59032 S≈0.57) of near-neutrale charcoal-accenten zijn NIET luid: die gaven
 * nooit het "accent-everywhere"-probleem en hoeven niet gereserveerd te worden.
 */
export function isLoudColor(hex: string): boolean {
  const h = normalizeColorToHex(hex);
  if (!h) return false;
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (l < 0.5 ? max + min : 2 - max - min);
  return s > 0.65 && l >= 0.25 && l <= 0.65;
}

/**
 * Accent-reservering (60-30-10 / P8): wanneer een (gescrapte) kop-kleur ≈ de
 * merk-accent, reserveer de accent voor CTA's/active-states en geef de kop de
 * neutrale charcoal i.p.v. accent. Voorkomt "orange-everywhere" dat de CTA als
 * luidste element verzwakt. Een kop met een eigen (niet-accent) kleur blijft
 * ongemoeid. Eyebrows + CTA-knoppen + stat-cijfers houden bewust de accent.
 *
 * Review-fix: reserveer ALLEEN voor een LUIDE accent (isLoudColor). Een gedempt
 * accent (luxe-goud, charcoal-monochroom) gaf nooit het probleem → zijn koppen
 * blijven (merk-fideliteit; voorkomt over-reach + no-op-churn).
 */
export function reserveAccentForHeading(
  headingColor: string | null | undefined,
  accent: string,
  onSurface: string,
): string {
  if (!headingColor) return onSurface;
  if (!isLoudColor(accent)) return headingColor;
  return isCloseColor(headingColor, accent) ? onSurface : headingColor;
}
