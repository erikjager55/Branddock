/**
 * Gedeelde font-load-resolutie voor de Brandstyle Typography-UI.
 *
 * Eén bron-of-truth voor (a) wélke bron een font serveert (upload / Adobe-kit /
 * Google Fonts / metric-substitute) en (b) het injecteren van de bijbehorende
 * stylesheet in <head>. Vervangt de twee divergerende load-paden (FontCard's
 * eigen injectie + TypographySection's blinde Google-Fonts-<link>) zodat alle
 * previews consistent renderen.
 *
 * De inject-functies guarden op `typeof document` zodat dit module veilig
 * importeerbaar is in SSR én in pure smoke-tests (geen top-level DOM-toegang).
 */
import {
  findFontSubstitute,
  buildSubstituteCssUrl,
  type FontSubstitute,
} from '@/lib/brandstyle/font-substitutes';

export type FontAvailability =
  | 'UPLOADED'
  | 'GOOGLE_FONTS'
  | 'ADOBE_FONTS'
  | 'COMMERCIAL'
  | 'UNKNOWN'
  | null;

export type FontRenderSource = 'UPLOADED' | 'ADOBE_FONTS' | 'GOOGLE_FONTS' | 'SUBSTITUTE';

export interface FontRenderPlan {
  /** Bronnaam waar de font vandaan komt — drijft de injectie + badge. */
  source: FontRenderSource;
  /** Metric-substitute Google Font wanneer de echte font niet direct rendert. */
  substitute: FontSubstitute | null;
}

// Dedup-Sets zodat dezelfde stylesheet nooit dubbel in <head> komt.
const injectedKits = new Set<string>();
const injectedSubstitutes = new Set<string>();
const injectedGoogleFonts = new Set<string>();

/** Injecteer een Adobe Typekit-kit stylesheet (workspace-kit, serveert hier). */
export function injectTypekitCss(kitId: string | null | undefined): void {
  if (typeof document === 'undefined' || !kitId) return;
  if (injectedKits.has(kitId)) return;
  injectedKits.add(kitId);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://use.typekit.net/${kitId}.css`;
  link.dataset.brandstyleTypekit = kitId;
  document.head.appendChild(link);
}

// Dedup-Set + gedeelde <style>-tag voor uploaded @font-face-regels.
const injectedUploads = new Set<string>();

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, (c) => '\\' + c);
}
function urlEscape(url: string): string {
  return url.replace(/["\s]/g, (c) => encodeURIComponent(c));
}

/**
 * Injecteer een @font-face voor een geüploade brand-font (availability
 * UPLOADED). Dedupt op fileUrl; meerdere fonts delen één <style>-tag.
 * Spiegelt useCustomFonts (Typography-UI) zodat canvas + UI identiek laden.
 */
export function injectUploadedFontFace(
  family: string | null | undefined,
  fileUrl: string | null | undefined,
  fileType: string | null | undefined,
): void {
  if (typeof document === 'undefined' || !family || !fileUrl) return;
  if (injectedUploads.has(fileUrl)) return;
  injectedUploads.add(fileUrl);
  const format =
    fileType === 'woff2' ? 'woff2'
    : fileType === 'woff' ? 'woff'
    : fileType === 'otf' ? 'opentype'
    : 'truetype';
  const styleId = 'brandstyle-uploaded-fonts';
  let tag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = styleId;
    document.head.appendChild(tag);
  }
  tag.textContent += `\n@font-face {\n  font-family: "${cssEscape(family)}";\n  src: url("${urlEscape(fileUrl)}") format("${format}");\n  font-display: swap;\n}`;
}

/** Injecteer een metric-substitute Google Font (Inter e.d.). */
export function injectSubstituteCss(family: string): void {
  if (typeof document === 'undefined' || !family) return;
  if (injectedSubstitutes.has(family)) return;
  injectedSubstitutes.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildSubstituteCssUrl(family);
  link.dataset.brandstyleSubstitute = family;
  document.head.appendChild(link);
}

/** Injecteer een ÉCHTE Google Font (availability GOOGLE_FONTS) — conservatieve
 *  wght-set, identiek aan de substitute-URL-vorm. */
export function injectGoogleFontCss(family: string): void {
  if (typeof document === 'undefined' || !family) return;
  if (injectedGoogleFonts.has(family)) return;
  injectedGoogleFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildSubstituteCssUrl(family);
  link.dataset.brandstyleGoogleFont = family;
  document.head.appendChild(link);
}

/**
 * Bepaal hoe een font gerenderd moet worden — PURE functie (geen DOM).
 * Beslisvolgorde (identiek aan FontCard): UPLOADED → ADOBE_FONTS (alleen mét
 * workspace-kit, want de per-font source-kit is domain-locked) → GOOGLE_FONTS →
 * anders een metric-substitute. De substitute wordt UITSLUITEND op een
 * exact-match opgezocht zodat legitieme Google-Fonts-namen geen valse Inter
 * krijgen (geen fuzzy includes/startsWith).
 */
export function resolveFontRender(
  name: string | null | undefined,
  availability: FontAvailability,
  opts: { workspaceKitId?: string | null; isUploaded?: boolean },
): FontRenderPlan {
  if (!name) return { source: 'SUBSTITUTE', substitute: null };
  if (opts.isUploaded || availability === 'UPLOADED') {
    return { source: 'UPLOADED', substitute: null };
  }
  const hasWorkspaceKit = availability === 'ADOBE_FONTS' && !!opts.workspaceKitId?.trim();
  if (hasWorkspaceKit) return { source: 'ADOBE_FONTS', substitute: null };
  if (availability === 'GOOGLE_FONTS') return { source: 'GOOGLE_FONTS', substitute: null };
  // Rows-less (availability null = pure AI-inferentie): GEEN fuzzy substitute —
  // findFontSubstitute matcht op includes/startsWith en zou een legitieme
  // Google Font ('Markazi Text' bevat 'mark') ten onrechte naar Inter
  // degraderen. Laat die naar het echte-Google-Font-pad vallen.
  if (availability == null) return { source: 'SUBSTITUTE', substitute: null };
  // Gedetecteerde commerciële/onbekende font → metric-substitute (Inter e.d.).
  return { source: 'SUBSTITUTE', substitute: findFontSubstitute(name) };
}
