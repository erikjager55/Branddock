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
}

// Chrome-like User-Agent to avoid bot blocking
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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

  const response = await fetch(url, {
    headers: {
      'User-Agent': CHROME_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

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

  // Fetch linked CSS files (max 5)
  const cssLinks: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) cssLinks.push(href);
  });

  const linkedCssParts: string[] = [];
  const baseUrl = new URL(url);
  for (const cssHref of cssLinks.slice(0, 5)) {
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
      if (cssResponse.ok) {
        linkedCssParts.push(await cssResponse.text());
      }
    } catch {
      // Skip failed CSS fetches (including SSRF blocks)
    }
  }
  const linkedCssContent = linkedCssParts.join('\n');

  // Combine all CSS sources
  const allCss = [inlineCss, linkedCssContent, ...styleAttrs].join('\n');

  // Extract data from combined CSS
  const cssColors = extractColorsFromCss(allCss);
  const cssFonts = extractFontsFromCss(allCss);
  const cssVariables = extractCssVariables(allCss);
  const colorFrequency = analyzeColorFrequency(allCss);
  const fontSizes = extractFontSizes(allCss);

  // Extract visual language heuristics from CSS
  const { extractVisualLanguageHeuristics } = await import('./css-visual-heuristics');
  const visualHeuristics = extractVisualLanguageHeuristics(allCss);

  // Find logo candidates
  const logoUrls = findLogoUrls($, baseUrl);

  // Find brand images (BEFORE removing elements for body text)
  const brandImages = findBrandImages($, baseUrl);

  // Extract body text (trimmed, limited)
  const bodyText = extractBodyText($);

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
    linkedStylesheetCount: cssLinks.length,
    brandImages,
    visualHeuristics,
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
      if (isColorRelatedVariable(name, value)) {
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
      if (isColorRelatedVariable(name, value)) {
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
    if (isColorRelatedVariableName(name)) {
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

  return variables;
}

/** Check if a CSS variable name + value suggest it's color-related */
function isColorRelatedVariable(name: string, value: string): boolean {
  if (isColorRelatedVariableName(name)) return true;
  // Check if the value looks like a color
  return /^#[0-9A-Fa-f]{3,8}\b/.test(value) ||
    /^rgba?\s*\(/.test(value) ||
    /^hsla?\s*\(/.test(value);
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

      // Extract hex colors from the value
      const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;
      let hexMatch;
      while ((hexMatch = hexPattern.exec(value)) !== null) {
        const hex = normalizeHex(hexMatch[0]);
        if (hex && !isNearBlackOrWhite(hex) && !isFrameworkColor(hex)) {
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
          if (!isNearBlackOrWhite(hex) && !isFrameworkColor(hex)) {
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
          if (!isNearBlackOrWhite(hex) && !isFrameworkColor(hex)) {
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

  // For Tailwind sites: utility classes mean each color typically appears only 1×
  // (one class definition per color). Real brand colors are used in multiple
  // contexts (background + text + border) or appear via CSS variables.
  // Raise the minimum frequency threshold to filter out unused utility colors.
  if (isTailwind && results.length > 20) {
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

/** Extract unique font families from CSS */
function extractFontsFromCss(css: string): string[] {
  const fontSet = new Set<string>();

  // Match font-family declarations
  const fontFamilyPattern = /font-family\s*:\s*([^;}"]+)/gi;
  let match;
  while ((match = fontFamilyPattern.exec(css)) !== null) {
    const fonts = match[1].split(',').map((f) =>
      f.trim().replace(/^["']|["']$/g, '')
    );
    for (const font of fonts) {
      const normalized = font.trim();
      if (
        normalized &&
        !GENERIC_FONT_FAMILIES.has(normalized.toLowerCase())
      ) {
        fontSet.add(normalized);
      }
    }
  }

  // Match @font-face declarations
  const fontFacePattern = /@font-face\s*\{[^}]*font-family\s*:\s*["']?([^"';}\s]+)/gi;
  while ((match = fontFacePattern.exec(css)) !== null) {
    fontSet.add(match[1].trim());
  }

  return Array.from(fontSet);
}

const GENERIC_FONT_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'inherit', 'initial', 'unset', 'revert',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'apple color emoji',
  'segoe ui emoji', 'segoe ui symbol', 'noto color emoji',
]);

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
