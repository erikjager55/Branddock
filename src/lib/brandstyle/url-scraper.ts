// =============================================================
// URL Scraper — Fetch HTML + extract CSS colors, fonts, metadata
// Enhanced: CSS variables, color frequency, framework filtering,
// font sizes, improved logo detection, SSRF protection.
// =============================================================

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { assertSafeUrl, assertSafeRedirect } from '@/lib/utils/ssrf';
import {
  isTrackingPixel,
  resolveImageUrl,
  bestFromSrcset,
  addImageSafe,
} from '@/lib/utils/image-scraper';

// ─── Types ────────────────────────────────────────────

export interface CssVariable {
  name: string;
  value: string;
  context: 'root' | 'usage';
}

export interface ColorFrequency {
  hex: string;
  count: number;
  contexts: string[];
}

export interface FontSizeEntry {
  value: string;
  selector: string;
}

export type BrandImageContext = 'hero' | 'lifestyle' | 'product' | 'team' | 'general';

export interface ScrapedBrandImage {
  url: string;
  alt: string | null;
  context: BrandImageContext;
}

export interface ScrapedData {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  cssColors: string[];
  cssFonts: string[];
  /** Font used for body text (html/body selector). Used to assign UI role. */
  bodyFont?: string | null;
  /** Font used for headings (h1-h3). Used to assign DISPLAY role. */
  headingFont?: string | null;
  logoUrls: string[];
  ogImage: string | null;
  favicon: string | null;
  inlineCss: string;
  linkedCssContent: string;
  cssVariables: CssVariable[];
  colorFrequency: ColorFrequency[];
  fontSizes: FontSizeEntry[];
  linkedStylesheetCount: number;
  brandImages: ScrapedBrandImage[];
  visualHeuristics?: import('./visual-language.types').CssVisualHeuristics;
  components?: import('./component-extractor').DetectedComponent[];
  /** Adobe Fonts / Typekit detection result. `detected: true` means the
   *  site serves webfonts via Typekit; `kitId` is populated when we could
   *  extract it from the classic URL shape. */
  adobeFonts?: { detected: boolean; kitId: string | null };
  /** Dominant colours extracted from the primary logo bitmap or SVG.
   *  Populated by `logo-color-extractor` when at least one fetchable logo
   *  URL is available. Empty on failure or placeholder-only logos. */
  logoColors?: import('./logo-color-extractor').LogoColor[];
  /** Button-styling samples uit CSS (Fase A1 verbeterplan). Per primary/
   *  secondary/ghost match: padding/font/transform/letter-spacing/radius/
   *  background/color/transition + hover-state. Leeg wanneer geen
   *  button-CSS gevonden. */
  buttonStyles?: import('./button-extractor').ScrapedButtonStyle[];
  /** Typography per rol (display/heading/subheading/body/label/button) —
   *  Fase A2 verbeterplan. Brand-specifieke font-styling per element-rol
   *  i.p.v. de generic display/body uit een layoutStyle-preset. */
  typographyByRole?: import('./typography-extractor').ScrapedTypographyByRole;
  /** Spacing-profile per element-context (section/card/button/input) —
   *  Fase A3 verbeterplan. Renderer gebruikt typical padding voor section-
   *  padding / card-padding zonder layoutStyle-preset fallback. */
  spacingProfile?: import('./spacing-elevation-extractor').SpacingProfile;
  /** Elevation-profile met box-shadow categorisatie (none/subtle/medium/
   *  strong) — Fase A3. Renderer gebruikt dominant category voor cards. */
  elevationProfile?: import('./spacing-elevation-extractor').ElevationProfile;
  /** Border-radius samples per context — Fase A3. */
  radiusProfile?: import('./spacing-elevation-extractor').RadiusProfile;
  /** Motion-signature (transition + animation duration + easing) — Fase A4
   *  verbeterplan. Renderer gebruikt voor hover-transitions + section-fades. */
  motionProfile?: import('./motion-extractor').MotionProfile;
}

// Chrome-like User-Agent to avoid bot blocking
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Cap on linked stylesheets fetched per scrape. WordPress / Shopify / Webflow
 *  sites routinely link 15-25 sheets where brand tokens may not appear until
 *  position 6+. We still cap to keep payload bounded and the AI prompt in budget. */
const MAX_LINKED_STYLESHEETS = 15;

/**
 * Score a stylesheet by likely brand-relevance using id and href hints.
 * Higher = fetch first. Used to pick the top N sheets within MAX_LINKED_STYLESHEETS.
 *
 * Strategy:
 * - Brand-token files (palettes, themes, ACSS, Tailwind, design systems) score highest.
 * - Main theme stylesheets (framework.css, style.css, overide-styles.css, button.css) medium-high.
 * - Generic main stylesheets score medium.
 * - **Plugin chrome (shadowbox, datepicker, club widgets, advertenties, animations)
 *   score low** so they don't crowd out real brand files on WordPress sites that
 *   ship 20+ link tags.
 * - Admin / cookie-consent / icon-font files score lowest.
 *
 * Works across WordPress (rich id attrs), Shopify (theme.css), Webflow (webflow.css),
 * and Next.js (path patterns like /globals.css).
 */
// Plugin/widget decorative stylesheets that rarely contain brand tokens.
// Matched against `id` and `href` combined. Match order in scoreLink() must
// happen BEFORE the generic "has 'style' in id" rule, otherwise e.g.
// `nxs-shadowbox-style-css` would score 70 (generic style) instead of being
// demoted to plugin chrome.
const PLUGIN_CHROME_PATTERNS = [
  'shadowbox', 'lightbox', 'modal', 'carousel', 'popup',
  'slider-wd', 'slider_wd', 'wds_frontend', 'wds_effects',
  'datepicker', 'ui-datepicker',
  'advertenti', 'mainsponsor', 'widgetarchive',
  'club-stats', 'club-countdown', 'countdown',
  'wedstrijdverslag', 'events-widget', 'clublogos',
  'eventskalender', 'agenda-widget',
  'animation_', 'style-animation',
  'rfwbs', 'recent-comments',
];

function rankStylesheets(links: Array<{ href: string; id: string }>): string[] {
  const scoreLink = (link: { href: string; id: string }): number => {
    const id = link.id.toLowerCase();
    const href = link.href.toLowerCase();
    const combined = `${id} ${href}`;

    // ── Low-value chrome (check first so decorative ids don't leak into medium) ──
    if (/cookie|consent|gdpr|translatepress|trp-/.test(combined)) return 10;
    if (/font-awesome|fontawesome|ionicons|material-icons|glyphicon|icomoon|googlefonts?|webfont/.test(combined)) return 15;
    if (/wp-admin|wp-block-library|gutenberg|jquery-ui|bootstrap-icons/.test(combined)) return 20;
    if (PLUGIN_CHROME_PATTERNS.some((p) => combined.includes(p))) return 30;

    // ── High value: explicit brand / token / palette / design-system files ──
    if (/color|palette|theme|brand|skin|globals|tokens|design-system/.test(id)) return 100;
    if (/acss|bricks-frontend|bricks-color|tailwind|shadcn/.test(id)) return 95;
    if (/automaticcss|elementor-frontend|webflow/.test(id)) return 90;

    // ── Medium-high: main theme stylesheet filenames (framework.css, button.css,
    //    overide-styles.css, form-styles.css) — these carry the actual brand
    //    typography/colour tokens on WP themes without CSS variables.
    if (
      /\/(framework|style|overide-styles|override-styles|form-styles|button|globals|main|app|index)[._-]?[a-z0-9]*\.css/.test(href)
      && !/admin|plugin|gutenberg/.test(combined)
    ) {
      return 85;
    }

    // ── Medium: generic style/main/app/index ids (not clearly brand/plugin) ──
    if (/style|main|app|index/.test(id) && !/admin|plugin|gutenberg/.test(id)) return 70;
    if (id === '' && /\/(style|main|app|globals|tokens)[._-]?[a-z0-9]*\.css/.test(href)) return 65;

    return 50; // unknown / default — keep middle priority
  };

  return links
    .map((link, originalIndex) => ({ link, score: scoreLink(link), originalIndex }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map((entry) => entry.link.href);
}

// ─── Public API ───────────────────────────────────────

/**
 * Scrape a URL and extract brand-relevant data:
 * - HTML meta (title, description, OG image, favicon)
 * - CSS colors (hex + rgb), CSS variables, color frequency analysis
 * - Font families + font sizes from CSS
 * - Logo image candidates (img, svg, JSON-LD, apple-touch-icon)
 * - Body text content for tone analysis
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // SSRF protection: block private IPs
  assertSafeUrl(url);

  // Fetch HTML with retry on timeout/network errors (max 2 attempts)
  let response: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': CHROME_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'DNT': '1',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(30000),
        redirect: 'follow',
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTimeout = lastError.name === 'AbortError' || lastError.message.includes('aborted');
      // Only retry on timeout/network errors, not on SSRF blocks
      if (!isTimeout || attempt >= 1) break;
      // Wait 2s before retry
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (lastError || !response) {
    const msg = lastError?.message ?? 'Unknown fetch error';
    const isTimeout = msg.includes('aborted') || lastError?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? `Website took too long to respond (>30s). The site may be slow or blocking automated access.`
        : `Failed to fetch URL: ${msg}`,
    );
  }

  // Check for SSRF after redirect
  assertSafeRedirect(url, response.url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract metadata
  const title = $('title').first().text().trim() || null;
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;
  const favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    null;

  // Collect inline CSS from <style> tags
  const inlineCssParts: string[] = [];
  $('style').each((_, el) => {
    const text = $(el).text();
    if (text) inlineCssParts.push(text);
  });
  const inlineCss = inlineCssParts.join('\n');

  // Collect inline style attributes
  const styleAttrs: string[] = [];
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style) styleAttrs.push(style);
  });

  // Fetch linked CSS files. Many WordPress / Shopify / Webflow sites have
  // 15-25 stylesheets where brand tokens live in non-first files. We fetch up
  // to 15 in parallel, prioritised by likely brand-relevance via id/href hints.
  const allLinks: Array<{ href: string; id: string }> = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) allLinks.push({ href, id: $(el).attr('id') || '' });
  });

  const baseUrl = new URL(url);
  const rankedHrefs = rankStylesheets(allLinks).slice(0, MAX_LINKED_STYLESHEETS);

  const linkedCssParts: string[] = await Promise.all(
    rankedHrefs.map(async (cssHref) => {
      try {
        const cssUrl = cssHref.startsWith('http')
          ? cssHref
          : new URL(cssHref, baseUrl).toString();
        // SSRF protection on linked stylesheet URLs
        assertSafeUrl(cssUrl);
        const cssResponse = await fetch(cssUrl, {
          headers: { 'User-Agent': CHROME_USER_AGENT },
          signal: AbortSignal.timeout(8000),
        });
        if (cssResponse.ok) return await cssResponse.text();
      } catch {
        // Skip failed CSS fetches (including SSRF blocks, timeouts)
      }
      return '';
    }),
  );
  const linkedCssContent = linkedCssParts.filter(Boolean).join('\n');

  // Combine all CSS sources
  const allCss = [inlineCss, linkedCssContent, ...styleAttrs].join('\n');

  // Extract data from combined CSS
  const cssColors = extractColorsFromCss(allCss);
  const cssVariables = extractCssVariables(allCss);
  const colorFrequency = analyzeColorFrequency(allCss);
  const fontSizes = extractFontSizes(allCss);

  // Font priority chain (strongest signal first):
  //   1. Preloaded webfonts (`<link rel="preload" as="font">`)
  //   2. Body font (`body { font-family: ... }`)
  //   3. Heading font (`h1, h2, h3 { font-family: ... }`)
  //   4. Remaining font-family declarations + @font-face
  const preloadedFonts = extractPreloadedFonts($);
  const { bodyFont, headingFont } = extractSemanticFonts(allCss);
  const remainingFonts = extractFontsFromCss(allCss);
  const cssFonts = mergeFontsByPriority(
    preloadedFonts,
    bodyFont,
    headingFont,
    remainingFonts,
  );

  // Extract visual language heuristics from CSS
  const { extractVisualLanguageHeuristics } = await import('./css-visual-heuristics');
  const visualHeuristics = extractVisualLanguageHeuristics(allCss);

  // Fase A1 — button-styling samples uit CSS.
  // Universal-fix laag: CSS-vars meegeven voor var(--btn-radius) resolution
  // + cheerio `$` voor DOM-presence filter (drop unused WP-core stylesheets).
  const { extractButtonStyles } = await import('./button-extractor');
  const buttonStyles = extractButtonStyles(allCss, {
    cssVariables: cssVariables.map((v) => ({ name: v.name, value: v.value })),
    $,
  });

  // Fase A2 — typography per rol (display/heading/subheading/body/label/button)
  const { extractTypographyByRole } = await import('./typography-extractor');
  const typographyByRole = extractTypographyByRole(allCss);

  // Fase A3 — spacing + elevation + radius profiles per context
  const { extractSpacingElevationProfile } = await import('./spacing-elevation-extractor');
  const { spacingProfile, elevationProfile, radiusProfile } =
    extractSpacingElevationProfile(allCss);

  // Fase A4 — motion-signature (transition + animation duration + easing)
  const { extractMotionProfile } = await import('./motion-extractor');
  const motionProfile = extractMotionProfile(allCss);

  // Extract component samples (buttons, inputs, chips, cards, nav, etc.) from the DOM + CSS
  const { extractComponents } = await import('./component-extractor');
  const components = extractComponents($, allCss);

  // Find logo candidates
  const logoUrls = findLogoUrls($, baseUrl);

  // Find brand images (BEFORE removing elements for body text)
  const brandImages = findBrandImages($, baseUrl);

  // Extract body text (trimmed, limited)
  const bodyText = extractBodyText($);

  // Detect Adobe Fonts / Typekit presence + kit id. Searches the raw
  // HTML AND the combined CSS so we catch both `<link>` tags and
  // `@import url('https://use.typekit.net/...')` inside stylesheets.
  const { detectAdobeFonts } = await import('./adobe-fonts-detector');
  const adobeFonts = detectAdobeFonts(html, allCss);

  // Extract dominant colours from the primary logo. For many WordPress /
  // small-business sites the brand's primary colour lives only in the
  // bitmap logo — not in CSS — so this is the strongest signal available.
  // Safe-by-default: returns [] on any failure so the rest of the pipeline
  // isn't blocked.
  const { extractLogoColors } = await import('./logo-color-extractor');
  const primaryLogoUrl = logoUrls.find((u) => /^https?:\/\//i.test(u));
  const logoColors = primaryLogoUrl ? await extractLogoColors(primaryLogoUrl) : [];

  return {
    url,
    title,
    description,
    bodyText,
    cssColors,
    cssFonts,
    logoUrls,
    ogImage,
    favicon,
    inlineCss,
    linkedCssContent,
    cssVariables,
    colorFrequency,
    fontSizes,
    linkedStylesheetCount: allLinks.length,
    brandImages,
    visualHeuristics,
    components,
    bodyFont,
    headingFont,
    adobeFonts,
    logoColors,
    buttonStyles,
    typographyByRole,
    spacingProfile,
    elevationProfile,
    radiusProfile,
    motionProfile,
  };
}

// ─── CSS Variable Extraction ──────────────────────────

/**
 * Extract CSS custom properties (variables) related to colors.
 * CSS variables are the strongest signal for intentional brand colors.
 */
export function extractCssVariables(css: string): CssVariable[] {
  const variables: CssVariable[] = [];
  const seen = new Set<string>();

  // Ghost-variable filter: before accepting a `:root { --primary: #xyz }`
  // definition as a brand signal, verify it's actually referenced somewhere
  // via `var(--primary)`. Otherwise we're just reading template boilerplate,
  // legacy declarations, or unused page-builder presets — a common source of
  // false positives where "--primary" is purple but the real brand button
  // is actually blue.
  const usedVarNames = new Set<string>();
  const usageScanPattern = /var\(\s*(--[\w-]+)/g;
  let usageScanMatch;
  while ((usageScanMatch = usageScanPattern.exec(css)) !== null) {
    usedVarNames.add(usageScanMatch[1].trim());
  }

  // ACSS brand tokens (--primary-hex, --secondary-hex, …) are explicit by
  // convention — keep them even if not directly referenced. Other variables
  // must have actual usage to be trusted as brand tokens.
  const keepDefinitionSideVar = (name: string): boolean => {
    if (isAcssBrandToken(name)) return true;
    return usedVarNames.has(name);
  };

  // Match :root { --var: value; } declarations
  const rootBlockPattern = /:root\s*\{([^}]+)\}/g;
  let rootMatch;
  while ((rootMatch = rootBlockPattern.exec(css)) !== null) {
    const block = rootMatch[1];
    const varPattern = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let varMatch;
    while ((varMatch = varPattern.exec(block)) !== null) {
      const name = varMatch[1].trim();
      const value = varMatch[2].trim();
      if (isColorRelatedVariable(name, value) && keepDefinitionSideVar(name)) {
        const key = `root:${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          variables.push({ name, value, context: 'root' });
        }
      }
    }
  }

  // Match non-:root blocks that define CSS variables (e.g. .dark, [data-theme], *, html)
  // This catches theme variants, component-scoped colors, and framework color tokens
  const anyBlockPattern = /([^{}]+)\{([^}]+)\}/g;
  let blockMatch;
  while ((blockMatch = anyBlockPattern.exec(css)) !== null) {
    const selector = blockMatch[1].trim();
    // Skip :root (already handled above)
    if (/^:root\s*$/.test(selector)) continue;
    const block = blockMatch[2];
    const varPattern = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let varMatch;
    while ((varMatch = varPattern.exec(block)) !== null) {
      const name = varMatch[1].trim();
      const value = varMatch[2].trim();
      if (isColorRelatedVariable(name, value) && keepDefinitionSideVar(name)) {
        const key = `usage:${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          variables.push({ name, value, context: 'usage' });
        }
      }
    }
  }

  // Match var(--name) usage to discover variables defined elsewhere
  const usagePattern = /var\((--[\w-]+)\)/g;
  let usageMatch;
  while ((usageMatch = usagePattern.exec(css)) !== null) {
    const name = usageMatch[1].trim();
    if (isColorRelatedVariableName(name) && !isCmsPresetVariable(name)) {
      const key = `usage:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Try to find the value in the CSS
        const defPattern = new RegExp(`${escapeRegex(name)}\\s*:\\s*([^;]+)`, 'g');
        const defMatch = defPattern.exec(css);
        const value = defMatch ? defMatch[1].trim() : '(referenced)';
        variables.push({ name, value, context: 'usage' });
      }
    }
  }

  // Promote ACSS canonical brand tokens to the front of the list. They are
  // explicit by-convention brand declarations (e.g. --primary-hex:#B59032)
  // and must outrank generic page-builder defaults (e.g. --bricks-color-primary)
  // when the authoritative palette is built downstream.
  variables.sort((a, b) => {
    const aIsAcss = isAcssBrandToken(a.name);
    const bIsAcss = isAcssBrandToken(b.name);
    if (aIsAcss && !bIsAcss) return -1;
    if (!aIsAcss && bIsAcss) return 1;
    return 0; // keep original relative order otherwise
  });

  return variables;
}

/** Check if a CSS variable name + value suggest it's color-related */
function isColorRelatedVariable(name: string, value: string): boolean {
  // Skip CMS/framework preset variables — these are default palettes, not brand colors
  if (isCmsPresetVariable(name)) return false;
  if (isColorRelatedVariableName(name)) return true;
  // Check if the value looks like a color
  return /^#[0-9A-Fa-f]{3,8}\b/.test(value) ||
    /^rgba?\s*\(/.test(value) ||
    /^hsla?\s*\(/.test(value);
}

/**
 * Detect CMS framework preset CSS variables that contain default color palettes.
 * These pollute brand color extraction because they define 12-20 standard colors
 * that are not part of the brand identity.
 */
function isCmsPresetVariable(name: string): boolean {
  const lower = name.toLowerCase();
  // WordPress/Gutenberg preset colors (--wp--preset--color--*)
  if (lower.startsWith('--wp--preset--')) return true;
  // WordPress global styles
  if (lower.startsWith('--wp--style--')) return true;
  // Elementor default colors
  if (/^--e-global-color-/.test(lower)) return true;
  // Squarespace system colors
  if (lower.startsWith('--sqs-')) return true;
  // Wix system colors
  if (lower.startsWith('--wix-')) return true;
  // Shopify Dawn theme defaults
  if (lower.startsWith('--color-base-') || lower.startsWith('--color-badge-')) return true;
  // Bricks Builder default theme palette (--bricks-color-primary, --bricks-text-dark, etc.)
  // These are page-builder presets, NOT brand tokens. ACSS sites override them
  // with --primary-hex / --secondary-hex which we want to surface instead.
  if (lower.startsWith('--bricks-color-') || lower.startsWith('--bricks-text-')) return true;
  // Bricks element defaults (button, heading, link colors from the builder UI)
  if (/^--bricks-(button|heading|link|body|background)/.test(lower)) return true;
  // Tailwind internal utility variables (--tw-ring-*, --tw-prose-*, --tw-shadow-*, etc.)
  // These are set by Tailwind's reset + plugins (@tailwindcss/typography especially),
  // never brand tokens. On betterbrands.nl they pushed real brand colors off the top
  // of the authoritative palette.
  if (lower.startsWith('--tw-')) return true;
  return false;
}

/**
 * Recognise ACSS-style canonical brand token names.
 * AutomaticCSS uses `--primary-hex`, `--secondary-hex`, `--base-hex`,
 * `--neutral-hex`, `--accent-hex` as the explicit brand-color tokens.
 * These are by-convention brand-defining and should outrank any other
 * `--primary` / `--brand-*` variables in the same stylesheet.
 */
function isAcssBrandToken(name: string): boolean {
  return /^--(primary|secondary|base|neutral|accent)-hex$/i.test(name);
}

/** Check if a variable name suggests color usage */
function isColorRelatedVariableName(name: string): boolean {
  const lower = name.toLowerCase();
  const colorKeywords = [
    'color', 'colour', 'primary', 'secondary', 'accent', 'brand',
    'bg', 'background', 'text', 'foreground', 'border', 'surface',
    'muted', 'destructive', 'warning', 'success', 'info', 'error',
    'ring', 'input', 'card', 'popover', 'sidebar',
  ];
  return colorKeywords.some((kw) => lower.includes(kw));
}

// ─── Color Frequency Analysis ─────────────────────────

/**
 * Analyze how frequently each color appears in CSS.
 * Returns colors sorted by frequency (most used first).
 * Filters out known CSS framework colors.
 * For Tailwind sites: applies stricter filtering since Tailwind CSS includes
 * hundreds of utility classes with colors that aren't actually used on the page.
 */
export function analyzeColorFrequency(css: string): ColorFrequency[] {
  const freq = new Map<string, { count: number; contexts: Set<string> }>();
  const isTailwind = isTailwindCss(css);
  const isWordPress = isWordPressCss(css);

  // Properties that contain colors
  const colorProps = [
    'background-color', 'background', 'color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow',
    'border', 'text-decoration-color', 'caret-color', 'accent-color',
  ];

  for (const prop of colorProps) {
    // Match property: value declarations
    const propPattern = new RegExp(`${escapeRegex(prop)}\\s*:\\s*([^;}{]+)`, 'gi');
    let propMatch;
    while ((propMatch = propPattern.exec(css)) !== null) {
      const value = propMatch[1];

      // Extract hex colors from the value.
      // NOTE: framework colors (Tailwind/Bootstrap palette) are no longer hard-
      // filtered here — if a brand genuinely uses a Tailwind token as their
      // primary color, we'd throw it away. Instead we count them like any other
      // color and apply a stricter usage threshold downstream (see isFrameworkColor
      // filter after dedup).
      const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;
      let hexMatch;
      while ((hexMatch = hexPattern.exec(value)) !== null) {
        const hex = normalizeHex(hexMatch[0]);
        if (hex && !isNearBlackOrWhite(hex)) {
          const upper = hex.toUpperCase();
          const entry = freq.get(upper) || { count: 0, contexts: new Set<string>() };
          entry.count++;
          entry.contexts.add(prop);
          freq.set(upper, entry);
        }
      }

      // Extract rgb colors from the value
      const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
      let rgbMatch;
      while ((rgbMatch = rgbPattern.exec(value)) !== null) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        if (r <= 255 && g <= 255 && b <= 255) {
          const hex = rgbToHex(r, g, b).toUpperCase();
          if (!isNearBlackOrWhite(hex)) {
            const entry = freq.get(hex) || { count: 0, contexts: new Set<string>() };
            entry.count++;
            entry.contexts.add(prop);
            freq.set(hex, entry);
          }
        }
      }

      // Extract modern CSS color syntax: rgb(31 209 178), rgb(31 209 178 / 0.5)
      const rgbModernPattern = /rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/g;
      let rgbModernMatch;
      while ((rgbModernMatch = rgbModernPattern.exec(value)) !== null) {
        const r = parseInt(rgbModernMatch[1]);
        const g = parseInt(rgbModernMatch[2]);
        const b = parseInt(rgbModernMatch[3]);
        if (r <= 255 && g <= 255 && b <= 255) {
          const hex = rgbToHex(r, g, b).toUpperCase();
          if (!isNearBlackOrWhite(hex)) {
            const entry = freq.get(hex) || { count: 0, contexts: new Set<string>() };
            entry.count++;
            entry.contexts.add(prop);
            freq.set(hex, entry);
          }
        }
      }
    }
  }

  let results = Array.from(freq.entries())
    .map(([hex, data]) => ({
      hex,
      count: data.count,
      contexts: Array.from(data.contexts),
    }))
    .sort((a, b) => b.count - a.count);

  // Framework-color threshold: when a color matches a Tailwind/Bootstrap
  // palette token AND is only weakly used, assume it's incidental styling
  // noise rather than a brand color. When the same token is used prominently
  // (≥3 times and in ≥2 contexts) it's likely the brand genuinely adopted
  // that palette — keep it.
  const filteredFramework = results.filter(
    (c) => !isFrameworkColor(c.hex) || (c.count >= 3 && c.contexts.length >= 2),
  );
  if (filteredFramework.length >= 3) {
    results = filteredFramework;
  }

  // For Tailwind/WordPress sites: many colors appear once via utility classes
  // or in admin/plugin chrome. Real brand colors are used in multiple contexts
  // (background + text + border) or via CSS variables. Apply a stricter
  // frequency threshold to filter out incidental colors.
  if ((isTailwind || isWordPress) && results.length > 20) {
    // Keep colors used ≥2× or in ≥2 property contexts
    const filtered = results.filter(
      (c) => c.count >= 2 || c.contexts.length >= 2,
    );
    // Only apply filter if it leaves at least 3 colors
    if (filtered.length >= 3) {
      results = filtered;
    }
  }

  return results;
}

/**
 * Detect WordPress / Gutenberg / common-plugin CSS patterns.
 * Used to apply stricter frequency thresholds since many WP sites bundle
 * plugin and admin-bar chrome that pollutes brand color extraction.
 */
function isWordPressCss(css: string): boolean {
  return (
    /--wp--preset--/.test(css) ||
    /--wp--style--/.test(css) ||
    /\.wp-block-/.test(css) ||
    /\.gutenberg-/.test(css) ||
    /\.elementor-/.test(css) ||
    /\.brxe-/.test(css) || // Bricks Builder
    /\.is-style-/.test(css)
  );
}

// ─── Framework Color Filtering ────────────────────────

/** Known framework/utility colors that pollute extraction results */
const FRAMEWORK_COLORS = new Set([
  // Tailwind default gray/slate/zinc/neutral/stone
  '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', // slate
  '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827', // gray
  '#FAFAFA', '#F4F4F5', '#E4E4E7', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B', // zinc
  '#FAFAFA', '#F5F5F5', '#E5E5E5', '#D4D4D4', '#A3A3A3', '#737373', '#525252', '#404040', '#262626', '#171717', // neutral
  '#FAFAF9', '#F5F5F4', '#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C', '#57534E', '#44403C', '#292524', '#1C1917', // stone
  // Tailwind default chromatic colors (full palette — these are ALL framework defaults, not brand colors)
  '#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', // red
  '#FFF7ED', '#FFEDD5', '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12', // orange
  '#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', // amber
  '#FEFCE8', '#FEF9C3', '#FEF08A', '#FDE047', '#FACC15', '#EAB308', '#CA8A04', '#A16207', '#854D0E', '#713F12', // yellow
  '#F7FEE7', '#ECFCCB', '#D9F99D', '#BEF264', '#A3E635', '#84CC16', '#65A30D', '#4D7C0F', '#3F6212', '#365314', // lime
  '#F0FDF4', '#DCFCE7', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#15803D', '#166534', '#14532D', // green
  '#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', // emerald
  '#F0FDFA', '#CCFBF1', '#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A', // teal
  '#ECFEFF', '#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4', '#0891B2', '#0E7490', '#155E75', '#164E63', // cyan
  '#F0F9FF', '#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E', // sky
  '#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', // blue
  '#EEF2FF', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81', // indigo
  '#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', // violet
  '#FAF5FF', '#F3E8FF', '#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87', // purple
  '#FDF4FF', '#FAE8FF', '#F5D0FE', '#F0ABFC', '#E879F9', '#D946EF', '#C026D3', '#A21CAF', '#86198F', '#701A75', // fuchsia
  '#FDF2F8', '#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843', // pink
  '#FFF1F2', '#FFE4E6', '#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#9F1239', '#881337', // rose
  // Bootstrap defaults
  '#0D6EFD', '#6C757D', '#198754', '#DC3545', '#FFC107', '#0DCAF0', '#212529', '#6610F2', '#D63384', '#FD7E14', '#20C997',
  // WordPress / Gutenberg default editor palette
  '#ABB8C3', '#F78DA7', '#CF2E2E', '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', '#9B51E0',
  // WordPress admin color scheme + dashboard chrome (these polluted linfi.nl extraction)
  '#0073AA', '#006799', '#00669B', '#135E96', '#2271B1', '#0085BA', '#4C6066', '#32373C', '#222222',
  '#23282D', '#191E23', '#F0F0EE', '#EDEDED', '#E1E1E1', '#F7F7F7', '#F9F9F9',
  // Material Design baseline (often shipped by Material Icons / MDC)
  '#6200EE', '#3700B3', '#03DAC6', '#018786', '#B00020', '#BB86FC',
  // Foundation defaults
  '#1779BA', '#3ADB76', '#FFAE00', '#CC4B37',
  // jQuery UI
  '#E78F08', '#F6A828', '#FBD850',
  // Cookie consent / GDPR libraries
  '#0F4FFF', '#3F46AD',
  // Webflow editor / form chrome
  '#3898EC', '#3898EB',
  // Common CSS resets
  '#TRANSPARENT', '#INHERIT',
]);

/**
 * Check if a hex color is a known framework/utility color.
 * Also detects Tailwind-compiled CSS by checking for utility class patterns,
 * and filters accordingly.
 */
export function isFrameworkColor(hex: string): boolean {
  return FRAMEWORK_COLORS.has(hex.toUpperCase());
}

/**
 * Detect if CSS content likely comes from a Tailwind build.
 * Used by analyzeColorFrequency to apply smarter filtering.
 */
function isTailwindCss(css: string): boolean {
  // Tailwind compiled CSS contains characteristic patterns
  return (
    css.includes('--tw-') ||
    css.includes('.text-\\[') ||
    css.includes('.bg-\\[') ||
    /\.(bg|text|border)-(red|blue|green|yellow|purple|pink|indigo|teal|cyan|emerald|orange|amber|lime|sky|violet|fuchsia|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/.test(css)
  );
}

// ─── Font Size Extraction ─────────────────────────────

/**
 * Extract font-size declarations from CSS.
 * Replaces hallucinated AI type scales with real observed data.
 * Supports simple values (36px, 2rem), clamp(), calc(), and var() references.
 */
export function extractFontSizes(css: string): FontSizeEntry[] {
  const sizes: FontSizeEntry[] = [];
  const seen = new Set<string>();

  // Match selector { ... font-size: value; ... }
  const rulePattern = /([^{}]+)\{([^}]+)\}/g;
  let ruleMatch;
  while ((ruleMatch = rulePattern.exec(css)) !== null) {
    const selector = ruleMatch[1].trim();
    const block = ruleMatch[2];

    const fontSizePattern = /font-size\s*:\s*([^;!]+)/gi;
    let sizeMatch;
    while ((sizeMatch = fontSizePattern.exec(block)) !== null) {
      const rawValue = sizeMatch[1].trim();
      const resolved = resolveFontSizeValue(rawValue, css);
      if (resolved) {
        const key = `${selector}:${resolved}`;
        if (!seen.has(key)) {
          seen.add(key);
          const cleanSelector = selector.length > 60 ? selector.slice(0, 57) + '...' : selector;
          sizes.push({ value: resolved, selector: cleanSelector });
        }
      }
    }
  }

  return sizes;
}

/**
 * Resolve a font-size CSS value to a displayable string.
 * - Simple values: "36px", "2rem" → returned as-is
 * - clamp(): extract the preferred (middle) value
 * - calc(): extract the dominant size value
 * - var(): attempt to resolve the variable from the CSS
 *
 * @param depth - recursion guard (max 5) to prevent infinite loops on circular CSS vars
 */
function resolveFontSizeValue(value: string, fullCss: string, depth = 0): string | null {
  if (depth > 5) return null;
  // Simple unit value
  if (/^[\d.]+(?:px|rem|em|pt|%|vw|vh|vi|svw|dvw|cqi)$/.test(value)) {
    return value;
  }

  // clamp(min, preferred, max) → extract the preferred (middle) value
  const clampMatch = value.match(/clamp\(\s*[^,]+,\s*([^,]+),/);
  if (clampMatch) {
    const preferred = clampMatch[1].trim();
    const resolved = resolveFontSizeValue(preferred, fullCss, depth + 1);
    if (resolved) return `${resolved} (clamp)`;
    return value;
  }

  // calc() → extract the largest numeric+unit part
  const calcMatch = value.match(/calc\((.+)\)/);
  if (calcMatch) {
    const inner = calcMatch[1];
    const tokens = inner.match(/[\d.]+(?:px|rem|em|pt|%|vw|vh)/g);
    if (tokens && tokens.length > 0) {
      return `${tokens[0]} (calc)`;
    }
  }

  // var(--name) or var(--name, fallback) → resolve from CSS
  const varMatch = value.match(/var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\)/);
  if (varMatch) {
    const varName = varMatch[1];
    const fallback = varMatch[2]?.trim();
    const defPattern = new RegExp(`${escapeRegex(varName)}\\s*:\\s*([^;]+)`, 'g');
    const defMatch = defPattern.exec(fullCss);
    if (defMatch) {
      const resolved = resolveFontSizeValue(defMatch[1].trim(), fullCss, depth + 1);
      if (resolved) return resolved;
    }
    if (fallback) {
      const resolved = resolveFontSizeValue(fallback, fullCss, depth + 1);
      if (resolved) return resolved;
    }
  }

  return null;
}

// ─── Color Extraction ─────────────────────────────────

/** Extract unique hex colors from CSS content (simple dedup, no framework filter) */
function extractColorsFromCss(css: string): string[] {
  const colorSet = new Set<string>();

  // Match hex colors: #RGB, #RRGGBB
  const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;
  let match;
  while ((match = hexPattern.exec(css)) !== null) {
    const hex = normalizeHex(match[0]);
    if (hex && !isNearBlackOrWhite(hex)) {
      colorSet.add(hex.toUpperCase());
    }
  }

  // Match rgb/rgba colors
  const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((match = rgbPattern.exec(css)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = rgbToHex(r, g, b);
      if (!isNearBlackOrWhite(hex)) {
        colorSet.add(hex.toUpperCase());
      }
    }
  }

  return Array.from(colorSet);
}

// ─── Font Extraction ──────────────────────────────────

/** Extract unique font families from CSS, excluding generic + web-safe fallbacks.
 *  Exported zodat de brandstyle-smoke de fallback-chain-filter (Fase 3c) kan
 *  asserteren. */
export function extractFontsFromCss(css: string): string[] {
  const fontSet = new Set<string>();

  // Match font-family declarations
  const fontFamilyPattern = /font-family\s*:\s*([^;}"]+)/gi;
  let match;
  while ((match = fontFamilyPattern.exec(css)) !== null) {
    const fonts = match[1].split(',').map((f) => f.trim());
    for (const rawFont of fonts) {
      const resolved = resolveFontFamilyValue(rawFont, css);
      if (
        resolved &&
        !GENERIC_FONT_FAMILIES.has(resolved.toLowerCase()) &&
        !isWebSafeFallbackFont(resolved) &&
        !isIconFont(resolved)
      ) {
        fontSet.add(resolved);
        // Fase 3c: alleen de EERSTE echte familie per declaratie is de
        // bedoelde font; de rest van de komma-keten is fallback-ruis
        // (Roboto/Oxygen/Ubuntu) — geen extra merk-fonts.
        break;
      }
    }
  }

  // Match @font-face declarations (these are always intentional)
  const fontFacePattern = /@font-face\s*\{[^}]*font-family\s*:\s*["']?([^"';}\s]+)/gi;
  while ((match = fontFacePattern.exec(css)) !== null) {
    const name = match[1].trim();
    if (!isWebSafeFallbackFont(name) && !isIconFont(name)) fontSet.add(name);
  }

  return Array.from(fontSet);
}

/**
 * Resolve a single font-family value to a clean font name.
 * Handles: `!important` flags, surrounding quotes, `var(--name)` references
 * (recursively resolved from the surrounding CSS), and unresolvable references.
 *
 * @param depth - recursion guard to prevent infinite var() loops
 * @returns the clean font name, or null if the value is unresolvable / a CSS var
 */
function resolveFontFamilyValue(
  rawValue: string,
  fullCss: string,
  depth = 0,
): string | null {
  if (depth > 5) return null;

  // Strip !important and surrounding whitespace
  let value = rawValue.replace(/!important/i, '').trim();
  // Strip surrounding quotes
  value = value.replace(/^["']|["']$/g, '').trim();
  // Decode CSS identifier escapes. The common case we see in the wild is
  // `Font Awesome\ 6 Brands` — the backslash-before-space is a CSS escape
  // for unquoted identifiers that persists when the value was already
  // quoted. Collapse `\<space>` → ` ` and `\\` → `\`. We don't attempt
  // full \<hex> codepoint decoding; it's vanishingly rare in font names.
  value = value.replace(/\\ /g, ' ').replace(/\\\\/g, '\\').trim();
  if (!value) return null;

  // var(--name) or var(--name, fallback) → resolve from CSS
  const varMatch = value.match(/^var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)$/);
  if (varMatch) {
    const varName = varMatch[1];
    const fallback = varMatch[2]?.trim();
    // Fase 3a: een var() resolvet vaak naar een hele font-STACK
    // (`system-ui,-apple-system,'Brand',…`). De recursie gaf voorheen de
    // complete komma-stack als één bogus font terug (symptoom: primaryFontName
    // = "system-ui,-apple-system,…"). Resolve i.p.v. naar de EERSTE echte
    // familie — sla generic/web-safe/icon-fallbacks over.
    const resolveStack = (stack: string): string | null => {
      for (const part of stack.split(',')) {
        const r = resolveFontFamilyValue(part.trim(), fullCss, depth + 1);
        if (
          r
          && !GENERIC_FONT_FAMILIES.has(r.toLowerCase())
          && !isWebSafeFallbackFont(r)
          && !isIconFont(r)
        ) {
          return r;
        }
      }
      return null;
    };
    const defPattern = new RegExp(`${escapeRegex(varName)}\\s*:\\s*([^;}]+)`, 'g');
    const defMatch = defPattern.exec(fullCss);
    if (defMatch) {
      const resolved = resolveStack(defMatch[1].trim());
      if (resolved) return resolved;
    }
    if (fallback) {
      const resolved = resolveStack(fallback);
      if (resolved) return resolved;
    }
    // Couldn't resolve var() — drop it rather than persisting "var(--xxx)" literal
    return null;
  }

  // Drop any remaining var() / function references that slipped through
  if (value.includes('var(') || value.includes('(')) return null;

  return value;
}

const GENERIC_FONT_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'inherit', 'initial', 'unset', 'revert', 'normal', 'auto', 'none',
  // CSS placeholder / shorthand that some themes emit unquoted (seen on
  // linfi.nl: `font-family: Font;` resolved to literal "Font"). Always noise.
  'font', 'webfont', 'webfonts', 'text', 'body',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'apple color emoji',
  'segoe ui emoji', 'segoe ui symbol', 'noto color emoji',
]);

/**
 * Web-safe / system fallback fonts that appear in CSS as `font-family` fallbacks
 * (e.g. `font-family: 'Oranienbaum', Georgia, serif;`). They are never the
 * intentional brand font — keeping them in the output adds noise like "Times New
 * Roman" in the additionalFonts list. We filter them out at merge time.
 *
 * Note: includes lowercase variants because some CSS uses `roboto` instead of
 * `Roboto` as a fallback declaration.
 */
const WEB_SAFE_FALLBACK_FONTS = new Set([
  'georgia', 'times', 'times new roman', 'helvetica', 'helvetica neue',
  'arial', 'arial black', 'verdana', 'tahoma', 'trebuchet ms',
  'courier', 'courier new', 'lucida console', 'lucida sans unicode',
  'palatino', 'palatino linotype', 'book antiqua', 'garamond', 'impact',
  'comic sans ms', 'monaco', 'consolas',
]);

/** Check if a font name is a system / web-safe fallback (not an intentional brand font). */
function isWebSafeFallbackFont(name: string): boolean {
  return WEB_SAFE_FALLBACK_FONTS.has(name.toLowerCase().trim());
}

/**
 * Filename / font-family fragments that indicate icon fonts rather than
 * typography. Stored without whitespace/hyphens so normalised comparison
 * below matches spaced variants ("Font Awesome 6 Brands" → "fontawesome…").
 */
const ICON_FONT_FRAGMENTS = [
  'icomoon', 'fontawesome', 'ionicon', 'materialicons', 'materialsymbols',
  'feather', 'lucide', 'dashicons', 'themify', 'eicons', 'glyphicon',
  'webflowicons', 'bricksicons',
  // Fase 3b: WooCommerce + Elementor shippen een eigen icon-font (cart/ster/
  // social-glyphs) die als font-family lekt op WP/Woo-sites (symptoom op
  // zwarthout.com: "WooCommerce" in de font-lijst).
  'woocommerce', 'elementoricons',
];

/**
 * Check whether a font name looks like an icon font (not real typography).
 * Normalises both sides by stripping whitespace / hyphens / underscores so
 * "Font Awesome 6 Brands" matches the `fontawesome` fragment. We also
 * special-case the "icon"/"icons" suffix — looser than substring match so
 * brand names like "Iconic Display" don't get filtered.
 */
function isIconFont(name: string): boolean {
  const normalised = name.toLowerCase().replace(/[\s_-]/g, '');
  if (ICON_FONT_FRAGMENTS.some((frag) => normalised.includes(frag))) return true;
  // "…icons" suffix is almost always an icon font (Material Icons, Web
  // Icons, Dash Icons, etc.) without false-positive risk.
  if (/icons?$/.test(normalised)) return true;
  return false;
}

/**
 * Extract font family names from `<link rel="preload" as="font">` tags.
 * Modern sites use preload as a performance signal — the font that's preloaded
 * is almost always the primary brand font (body or display). Stronger signal
 * than CSS-extracted fonts because preload is explicit prioritisation by the dev.
 *
 * Heuristic: parse the filename portion of the href, which typically follows
 * patterns like `poppins-v23-latin-400.woff2` or `Poppins-Regular.woff2`.
 */
function extractPreloadedFonts($: cheerio.CheerioAPI): string[] {
  const fonts = new Set<string>();
  $('link[rel="preload"][as="font"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href) return;

    // Get the last path segment
    const segment = href.split('/').pop() || href;
    // Strip extension
    const base = segment.replace(/\.(woff2?|ttf|otf|eot)(\?.*)?$/i, '');
    // Strip query/cache suffix and trailing timestamps
    const clean = base.replace(/-\d{8,}$/, '').replace(/\?.*$/, '');
    if (!clean) return;

    // Common patterns:
    //   "google-fonts-poppins-v23-latin-400-normal" → "poppins"
    //   "Poppins-Regular" → "Poppins"
    //   "inter-var" → "inter"
    //   "MaterialIcons-Regular" → skip (icon font)
    const stripPrefix = clean.replace(/^(google-fonts?|gf|webfont)-/i, '');
    const firstWord = stripPrefix.split(/[-_.]/)[0] || stripPrefix;
    if (!firstWord) return;

    if (isIconFont(firstWord)) return;

    // Capitalize first letter (most font names are PascalCase)
    const fontName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    fonts.add(fontName);
  });
  return Array.from(fonts);
}

/**
 * Extract the body font and heading font from CSS.
 *
 * Two extraction paths, in priority order:
 *   1. Framework-style CSS variable conventions (highest signal): ACSS uses
 *      `--h1-font-family`, `--h2-font-family`, `--body-font-family`. WordPress
 *      themes often expose `--wp--preset--font-family--*`. These are explicit
 *      brand typography declarations.
 *   2. Direct selector rules: `body { font-family }` and `h1, h2, h3 { font-family }`.
 *      The fallback path for sites that don't use a token system.
 *
 * Web-safe fallbacks (Georgia, Times, Arial, etc.) are skipped — they're never
 * the intentional brand font, just CSS fallback chain noise.
 *
 * Returns `null` for either if no targeted signal was found.
 *
 * Exported so the brandstyle smoke-tests can assert var-pattern coverage
 * (incl. the Bootstrap `--bs-*` font vars, Fase 4).
 */
export function extractSemanticFonts(css: string): {
  bodyFont: string | null;
  headingFont: string | null;
} {
  let bodyFont: string | null = null;
  let headingFont: string | null = null;

  // ── Path 1: framework-style font-family variables ─────
  // ACSS heading vars: --h1-font-family … --h6-font-family; Bootstrap 5 sets
  // --bs-headings-font-family. A vanilla Bootstrap value resolves to a
  // system stack and is correctly dropped by the generic/web-safe filters
  // below; only a brand-customised value (e.g. a real display font) survives.
  const headingVarMatch = css.match(/--(?:h[1-6]|bs-headings?)-font-family\s*:\s*([^;}!]+)/i);
  if (headingVarMatch) {
    const resolved = resolveFontFamilyValue(
      headingVarMatch[1].split(',')[0]?.trim() || '',
      css,
    );
    if (resolved && !GENERIC_FONT_FAMILIES.has(resolved.toLowerCase()) && !isWebSafeFallbackFont(resolved) && !isIconFont(resolved)) {
      headingFont = resolved;
    }
  }

  // Body / paragraph / text vars (ACSS, Tailwind, Bootstrap --bs-body-*,
  // common conventions). Same filtering caveat as the heading path: a
  // vanilla Bootstrap system stack is dropped, a brand value survives.
  const bodyVarMatch = css.match(
    /--(?:bs-body|body|paragraph|text|p|font-(?:body|primary))-font-family\s*:\s*([^;}!]+)/i,
  );
  if (bodyVarMatch) {
    const resolved = resolveFontFamilyValue(
      bodyVarMatch[1].split(',')[0]?.trim() || '',
      css,
    );
    if (resolved && !GENERIC_FONT_FAMILIES.has(resolved.toLowerCase()) && !isWebSafeFallbackFont(resolved) && !isIconFont(resolved)) {
      bodyFont = resolved;
    }
  }

  if (bodyFont && headingFont) return { bodyFont, headingFont };

  // ── Path 2: direct selector rules ─────────────────────
  const rulePattern = /([^{}]+)\{([^}]+)\}/g;
  let ruleMatch: RegExpExecArray | null;
  while ((ruleMatch = rulePattern.exec(css)) !== null) {
    const selector = ruleMatch[1].trim().toLowerCase();
    const block = ruleMatch[2];

    const familyMatch = block.match(/font-family\s*:\s*([^;}!]+)(?:!important)?/i);
    if (!familyMatch) continue;

    const firstFontRaw = familyMatch[1].split(',')[0]?.trim() || '';
    const resolved = resolveFontFamilyValue(firstFontRaw, css);
    if (
      !resolved
      || GENERIC_FONT_FAMILIES.has(resolved.toLowerCase())
      || isWebSafeFallbackFont(resolved)
      || isIconFont(resolved)
    ) continue;

    if (!bodyFont && /(^|[\s,])(html|body)([\s,.{]|$)/.test(selector)) {
      bodyFont = resolved;
    }

    if (!headingFont && /(^|[\s,])(h1|h2|h3)([\s,.{]|$)/.test(selector)) {
      headingFont = resolved;
    }

    if (bodyFont && headingFont) break;
  }

  return { bodyFont, headingFont };
}

/**
 * Merge font lists by priority into a single deduplicated list.
 * Earlier sources outrank later ones — the first font is used as `primaryFontName`
 * downstream, so its placement matters.
 *
 * Subtle priority rule: when a preloaded font exists, it wins over `bodyFont`
 * derived from a `body{font-family}` selector. Preload is an explicit
 * developer-placed performance signal (the brand body font), whereas the body
 * selector often resolves to a framework default like `roboto` (Bricks Builder)
 * or `system-ui` that's NOT the actual brand typography.
 */
function mergeFontsByPriority(
  preloaded: string[],
  bodyFont: string | null,
  headingFont: string | null,
  remaining: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (font: string | null | undefined): void => {
    if (!font) return;
    const key = font.toLowerCase().replace(/['"]/g, '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(font);
  };

  preloaded.forEach(push);
  // bodyFont only matters when no preloaded font signalled the body typography
  if (preloaded.length === 0) push(bodyFont);
  push(headingFont);
  remaining.forEach(push);

  return out;
}

// ─── Logo Detection ───────────────────────────────────

/**
 * Find logo image candidates from HTML.
 * Enhanced: JSON-LD, apple-touch-icon, og:image fallback, inline SVG, aria-label.
 */
function findLogoUrls($: cheerio.CheerioAPI, baseUrl: URL): string[] {
  const logos: string[] = [];
  const seen = new Set<string>();

  const addLogo = (url: string): void => {
    if (logos.length >= 8 || seen.has(url)) return;
    seen.add(url);
    logos.push(url);
  };

  // 1. JSON-LD structured data with logo field
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const logoUrl = item.logo ?? item.image;
        if (typeof logoUrl === 'string' && logoUrl.startsWith('http')) {
          addLogo(logoUrl);
        } else if (logoUrl && typeof logoUrl === 'object' && logoUrl.url) {
          addLogo(logoUrl.url);
        }
        // Check @graph
        if (Array.isArray(item['@graph'])) {
          for (const node of item['@graph']) {
            const nodeLogo = node.logo ?? (node['@type'] === 'Organization' ? node.image : null);
            if (typeof nodeLogo === 'string' && nodeLogo.startsWith('http')) {
              addLogo(nodeLogo);
            } else if (nodeLogo && typeof nodeLogo === 'object' && nodeLogo.url) {
              addLogo(nodeLogo.url);
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  });

  // 2. Apple touch icon
  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      addLogo(fullUrl);
    }
  });

  // 3. Images with "logo" or "brand" in src/alt/class/id/aria-label (case-insensitive)
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const ariaLabel = $(el).attr('aria-label') || '';
    const combined = `${src} ${alt} ${className} ${id} ${ariaLabel}`.toLowerCase();

    if (combined.includes('logo') || combined.includes('brand')) {
      if (src && !src.startsWith('data:')) {
        const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
        addLogo(fullUrl);
      }
    }
  });

  // 4. SVG elements with logo-related attributes (inline SVGs)
  $('svg').each((_, el) => {
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const ariaLabel = $(el).attr('aria-label') || '';
    const combined = `${className} ${id} ${ariaLabel}`.toLowerCase();
    if (combined.includes('logo') || combined.includes('brand')) {
      addLogo('[SVG logo found in HTML]');
    }
  });

  // 5. Links in header/nav that wrap images (common logo pattern)
  $('header a img, nav a img, [role="banner"] a img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && !src.startsWith('data:')) {
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      addLogo(fullUrl);
    }
  });

  // 6. OG image as last-resort fallback
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && logos.length === 0) {
    addLogo(ogImage.startsWith('http') ? ogImage : new URL(ogImage, baseUrl).toString());
  }

  return logos;
}

// ─── Brand Image Extraction ──────────────────────────

/**
 * Find brand-relevant images from HTML for visual reference.
 * Extracts hero banners, lifestyle photos, team images — skips logos, icons, tracking pixels.
 * Max 12 images to keep payload manageable.
 */
function findBrandImages($: cheerio.CheerioAPI, baseUrl: URL): ScrapedBrandImage[] {
  const images: ScrapedBrandImage[] = [];
  const seen = new Set<string>();
  const MAX_IMAGES = 12;

  // Collect logo URLs so we can skip them (already handled by logo detection)
  const logoSeen = new Set<string>();
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const combined = `${src} ${alt} ${className} ${id}`.toLowerCase();
    if (combined.includes('logo') || combined.includes('brand-logo')) {
      if (src && !src.startsWith('data:')) {
        const resolved = resolveImageUrl(src, baseUrl.toString());
        if (resolved) logoSeen.add(resolved);
      }
    }
  });

  // Helper: skip logo URLs
  const isLogo = (url: string): boolean => logoSeen.has(url);

  // 1. OG image → context: hero
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    const resolved = resolveImageUrl(ogImage, baseUrl.toString());
    if (resolved && !isLogo(resolved)) {
      addImageSafe(
        images, seen, resolved,
        $('meta[property="og:image:alt"]').attr('content') ?? null,
        'hero', MAX_IMAGES,
      );
    }
  }

  // 2. Hero/banner images in header, hero sections
  const heroSelectors = [
    'header img',
    '[class*="hero"] img',
    '[class*="banner"] img',
    '[class*="masthead"] img',
    '[class*="jumbotron"] img',
    '[id*="hero"] img',
    '[id*="banner"] img',
    'section:first-of-type img',
  ];
  for (const selector of heroSelectors) {
    $(selector).each((_, el) => {
      if (images.length >= MAX_IMAGES) return false;
      const src = getImageSrc($, el, baseUrl.toString());
      if (!src || isLogo(src)) return;
      const alt = $(el).attr('alt')?.trim() || null;
      addImageSafe(images, seen, src, alt, 'hero', MAX_IMAGES);
    });
  }

  // 3. Team images
  $('img').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false;
    const alt = $(el).attr('alt') || '';
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const parentClass = $(el).parent().attr('class') || '';
    const combined = `${alt} ${className} ${id} ${parentClass}`.toLowerCase();

    if (
      combined.includes('team') ||
      combined.includes('people') ||
      combined.includes('staff') ||
      combined.includes('about-us') ||
      combined.includes('founder')
    ) {
      const src = getImageSrc($, el, baseUrl.toString());
      if (src && !isLogo(src)) {
        addImageSafe(images, seen, src, alt.trim() || null, 'team', MAX_IMAGES);
      }
    }
  });

  // 4. General content images — larger images in main content
  $('main img, article img, [role="main"] img, .content img, #content img').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false;
    const src = getImageSrc($, el, baseUrl.toString());
    if (!src || isLogo(src)) return;

    // Skip tiny images
    const width = parseInt($(el).attr('width') ?? '0', 10);
    const height = parseInt($(el).attr('height') ?? '0', 10);
    if ((width > 0 && width < 80) || (height > 0 && height < 80)) return;

    const alt = $(el).attr('alt')?.trim() || null;
    addImageSafe(images, seen, src, alt, 'lifestyle', MAX_IMAGES);
  });

  // 5. Remaining large <img> tags not yet captured
  $('img').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false;
    const src = getImageSrc($, el, baseUrl.toString());
    if (!src || isLogo(src)) return;

    // Skip tiny images
    const width = parseInt($(el).attr('width') ?? '0', 10);
    const height = parseInt($(el).attr('height') ?? '0', 10);
    if ((width > 0 && width < 80) || (height > 0 && height < 80)) return;

    // Skip images in nav/footer/sidebar
    const closestParent = $(el).closest('nav, footer, aside, [class*="sidebar"], [class*="footer"], [class*="nav"]');
    if (closestParent.length > 0) return;

    const alt = $(el).attr('alt')?.trim() || null;
    addImageSafe(images, seen, src, alt, 'general', MAX_IMAGES);
  });

  return images;
}

/**
 * Get the best image source from an element, preferring srcset for higher resolution.
 * Skips tracking pixels, data URIs, and SVGs.
 */
function getImageSrc($: cheerio.CheerioAPI, el: AnyNode, baseUrl: string): string | null {
  // Try srcset first
  const srcset = $(el).attr('srcset') ?? $(el).attr('data-srcset');
  if (srcset) {
    const best = bestFromSrcset(srcset, baseUrl);
    if (best && !isTrackingPixel(best) && !best.endsWith('.svg')) return best;
  }

  // Fallback to src / data-src variants
  const rawSrc =
    $(el).attr('src') ??
    $(el).attr('data-src') ??
    $(el).attr('data-lazy-src') ??
    $(el).attr('data-original');

  if (!rawSrc || rawSrc.startsWith('data:') || rawSrc.endsWith('.svg')) return null;
  if (isTrackingPixel(rawSrc)) return null;

  return resolveImageUrl(rawSrc, baseUrl);
}

// ─── Body Text Extraction ─────────────────────────────

/** Extract body text content for tone-of-voice analysis */
function extractBodyText($: cheerio.CheerioAPI): string {
  // Remove non-content elements
  $('script, style, nav, footer, header, noscript, iframe, .cookie-banner, .gdpr, #cookie-consent').remove();

  const parts: string[] = [];

  $('h1, h2, h3, p, li, blockquote, figcaption').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      parts.push(text);
    }
  });

  // Increased limit for better tone analysis
  return parts.join('\n').slice(0, 5000);
}

// ─── Helpers ──────────────────────────────────────────

function normalizeHex(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  // CSS4: 4-char hex (#RGBA) → strip alpha, expand to 6
  if (clean.length === 4) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  // CSS4: 8-char hex (#RRGGBBAA) → strip alpha
  if (clean.length === 8) {
    return `#${clean.slice(0, 6)}`;
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Filter out near-black and near-white colors to avoid cluttering results
 * with common CSS reset/base colors. Uses tight thresholds to preserve
 * dark brand colors (e.g. deep navy #1B2A4A) and light brand colors
 * (e.g. cream #F5E6C8).
 */
function isNearBlackOrWhite(hex: string): boolean {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const avg = (r + g + b) / 3;
  // Tight thresholds: only filter true black/white, not dark/light brand colors
  return avg < 15 || avg > 245;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
