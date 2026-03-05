// =============================================================
// URL Scraper — Fetch HTML + extract CSS colors, fonts, metadata
// =============================================================

import * as cheerio from 'cheerio';

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
}

/**
 * Scrape a URL and extract brand-relevant data:
 * - HTML meta (title, description, OG image, favicon)
 * - CSS colors from inline styles and linked stylesheets
 * - Font families from CSS
 * - Logo image candidates
 * - Body text content for tone analysis
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Branddock-StyleAnalyzer/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });

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
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    null;
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

  // Fetch linked CSS files (max 5 to avoid excessive requests)
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
      const cssResponse = await fetch(cssUrl, {
        headers: { 'User-Agent': 'Branddock-StyleAnalyzer/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (cssResponse.ok) {
        linkedCssParts.push(await cssResponse.text());
      }
    } catch {
      // Skip failed CSS fetches
    }
  }
  const linkedCssContent = linkedCssParts.join('\n');

  // Combine all CSS sources
  const allCss = [inlineCss, linkedCssContent, ...styleAttrs].join('\n');

  // Extract colors from CSS
  const cssColors = extractColorsFromCss(allCss);

  // Extract font families from CSS
  const cssFonts = extractFontsFromCss(allCss);

  // Find logo candidates
  const logoUrls = findLogoUrls($, baseUrl);

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
  };
}

/**
 * Extract unique hex colors from CSS content
 */
function extractColorsFromCss(css: string): string[] {
  const colorSet = new Set<string>();

  // Match hex colors: #RGB, #RRGGBB
  const hexPattern = /#([0-9A-Fa-f]{3}){1,2}\b/g;
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

/**
 * Extract unique font families from CSS
 */
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
      // Skip generic font families
      if (
        normalized &&
        !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'initial', 'unset'].includes(
          normalized.toLowerCase()
        )
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

/**
 * Find logo image candidates from HTML
 */
function findLogoUrls($: cheerio.CheerioAPI, baseUrl: URL): string[] {
  const logos: string[] = [];

  // Images with "logo" in src, alt, class, or id
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    const combined = `${src} ${alt} ${className} ${id}`.toLowerCase();

    if (combined.includes('logo') || combined.includes('brand')) {
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      logos.push(fullUrl);
    }
  });

  // SVG elements with logo-related attributes
  $('svg').each((_, el) => {
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    if (className.toLowerCase().includes('logo') || id.toLowerCase().includes('logo')) {
      logos.push('[SVG logo found in HTML]');
    }
  });

  return logos.slice(0, 5);
}

/**
 * Extract body text content for tone-of-voice analysis
 */
function extractBodyText($: cheerio.CheerioAPI): string {
  // Remove script, style, nav, footer, header elements
  $('script, style, nav, footer, noscript, iframe').remove();

  // Get text from headings and paragraphs
  const parts: string[] = [];

  $('h1, h2, h3, p, li, blockquote, figcaption').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      parts.push(text);
    }
  });

  // Limit to ~3000 chars for AI prompt efficiency
  return parts.join('\n').slice(0, 3000);
}

// ─── Helpers ──────────────────────────────────────────

function normalizeHex(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Filter out near-black (#000-#111) and near-white (#EEE-#FFF) colors
 * to avoid cluttering results with common CSS reset/base colors
 */
function isNearBlackOrWhite(hex: string): boolean {
  const clean = hex.replace('#', '').toUpperCase();
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const avg = (r + g + b) / 3;
  return avg < 20 || avg > 240;
}
