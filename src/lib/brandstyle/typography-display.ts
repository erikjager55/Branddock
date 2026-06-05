/**
 * Pure typografie-display-helpers voor de Brandstyle Typography-UI.
 *
 * Geëxtraheerd uit TypographySection.tsx zodat ze (a) herbruikbaar zijn en (b)
 * in smoke-tests importeerbaar zonder de hele React/Zustand/TanStack-keten mee
 * te trekken. Geen DOM, geen React — puur string/number-logica.
 */

/**
 * Normaliseer een font-naam naar PascalCase zoals Google Fonts verwacht.
 * Google Fonts-URLs zijn case-sensitive: `roboto` → 400, `Roboto` → 200.
 *   - "roboto"    → "Roboto"
 *   - "open sans" → "Open Sans"
 *   - "PT Sans"   → "PT Sans" (korte all-caps codes blijven)
 */
export function normaliseFontName(font: string): string {
  return font
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Bouw een CSS font-family-stack: de echte merk-font eerst, dan (optioneel) een
 * metric-substitute Google Font, dan de system-fallback. Zo rendert een
 * commerciële font die nergens geladen is alsnog in de substitute i.p.v. de
 * browser-default serif.
 *
 * `normalise` (default true) PascalCased de display-naam. Zet op `false` voor
 * UPLOADED/ADOBE-fonts waar de @font-face-registratienaam verbatim moet blijven.
 */
export function buildFontFamilyStack(
  displayFamily: string | null | undefined,
  substituteGoogleFont?: string | null,
  opts?: { normalise?: boolean },
): string | undefined {
  if (!displayFamily || !displayFamily.trim()) return undefined;
  const primary = opts?.normalise === false ? displayFamily.trim() : normaliseFontName(displayFamily);
  return [
    `"${primary}"`,
    substituteGoogleFont ? `"${substituteGoogleFont}"` : null,
    'system-ui',
    '-apple-system',
    'sans-serif',
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Kies de juiste font-family-stack voor een type-scale-niveau. Headings (H1-H6)
 * gebruiken de display/heading-font (`additionalFonts[0]`), body/overig de
 * primary-font. `substituteFor` levert per font-naam een metric-substitute
 * (of null) zodat de stack óók de substitute bevat. Valt terug op primary
 * wanneer geen heading-font gedetecteerd is.
 */
export function getFontForLevel(
  level: string,
  primaryFont: string | null,
  additionalFonts: string[],
  substituteFor?: (name: string) => string | null,
): string | undefined {
  const isHeading = /^h[1-6]$/i.test(level.trim());
  const headingFont = additionalFonts[0];
  const chosen = isHeading && headingFont ? headingFont : primaryFont;
  if (!chosen) return undefined;
  return buildFontFamilyStack(chosen, substituteFor?.(chosen) ?? null);
}

/**
 * Bepaal het font-weight voor een type-scale-niveau in previews. Gebruikt het
 * gescrapte weight wanneer aanwezig; anders een zinnige rol-default (H1 bold,
 * H2-H6 semibold, body/overig normaal) zodat de Type-Scale- en In-Context-
 * previews dezelfde rol identiek renderen i.p.v. te divergeren bij lege scrape.
 * Retourneert `undefined` voor normaal gewicht (caller laat het aan de browser).
 */
export function weightForLevel(
  level: string,
  scrapedWeight?: string | null,
): string | number | undefined {
  if (scrapedWeight && String(scrapedWeight).trim()) return scrapedWeight;
  const l = level.trim().toLowerCase();
  if (l === 'h1') return 700;
  if (/^h[2-6]$/.test(l)) return 600;
  return undefined;
}

const PREVIEW_MAX_PX = 48;
const PREVIEW_FALLBACK_PX = 24;

/** Converteer een eenvoudige CSS-lengte (`36px`, `2rem`, `1.5em`, `16pt`) naar px. */
export function resolveToPx(value: string): number | null {
  const m = value.trim().match(/^([\d.]+)(px|rem|em|pt|%)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  switch ((m[2] || 'px').toLowerCase()) {
    case 'px': return n;
    case 'rem':
    case 'em': return n * 16;
    case 'pt': return n * (96 / 72);
    case '%': return (n / 100) * 16;
    default: return null;
  }
}

/**
 * Cap een CSS font-size voor type-scale-previews zodat grote/responsive
 * declaraties (`clamp(...)`) de rij-hoogte niet opblazen. Resolvet naar een
 * concrete px-waarde, gecapt op PREVIEW_MAX_PX. De Size-kolom toont de
 * originele waarde — deze cap raakt alleen de gerenderde preview-span.
 */
export function capPreviewSize(rawSize: string): string {
  if (!rawSize) return `${PREVIEW_FALLBACK_PX}px`;
  const clampMatch = rawSize.match(/clamp\(\s*([^,]+),/i);
  if (clampMatch) {
    const px = resolveToPx(clampMatch[1].trim());
    return `${Math.min(px ?? PREVIEW_FALLBACK_PX, PREVIEW_MAX_PX)}px`;
  }
  const calcMatch = rawSize.match(/calc\(([^)]+)\)/i);
  if (calcMatch) {
    const firstToken = calcMatch[1].match(/[\d.]+(?:px|rem|em|pt|%)/i)?.[0];
    const px = firstToken ? resolveToPx(firstToken) : null;
    return `${Math.min(px ?? PREVIEW_FALLBACK_PX, PREVIEW_MAX_PX)}px`;
  }
  const px = resolveToPx(rawSize);
  if (px === null) return `${PREVIEW_FALLBACK_PX}px`;
  return `${Math.min(px, PREVIEW_MAX_PX)}px`;
}
