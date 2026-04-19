// =============================================================
// Playwright Headless Fallback for Brandstyle Scraping
//
// When the static scraper finds no high-confidence brand tokens (typical for
// CSS-in-JS sites, Framer/Webflow rendered apps, or sites that block plain
// HTTP scraping), this fallback launches a headless Chromium browser, lets
// the JS execute, and reads the *computed* styles of brand-anchor elements
// (body, headings, buttons, links).
//
// Computed styles are the source of truth — what the user actually sees,
// regardless of how the CSS got there (variables, in-JS injection, runtime
// theming, dark mode). This catches the brand tokens that pure static
// scraping cannot.
//
// Cost / risk:
//   - Cold launch: ~1-2s extra
//   - Page load: 5-10s with `networkidle`
//   - Requires Chromium binary (`npx playwright install chromium`)
//   - Memory spike per call (~150-300MB)
//
// Used as a LAST RESORT only — after the static scraper + Gemini fallback
// both fail to surface enough brand colors. Disabled by default; enable via
// `BRANDSTYLE_HEADLESS_FALLBACK=1` env var.
// =============================================================

import type { ScrapedData } from './url-scraper';

/** Configurable via env var so an operator can toggle the fallback without
 *  redeploying. Default OFF — pulls Chromium binary, adds latency. */
export function isHeadlessFallbackEnabled(): boolean {
  return process.env.BRANDSTYLE_HEADLESS_FALLBACK === '1';
}

/** Selector list scanned for brand colors via getComputedStyle. Each anchor
 *  contributes its background-color and color (text). Order matters loosely
 *  — earlier selectors signal stronger brand intent (header, hero) while
 *  later ones add coverage. */
const BRAND_ANCHOR_SELECTORS = [
  'header', 'main > section:first-of-type',
  'h1', 'h2', 'h3',
  'button', '.button', '[class*="cta"]', '[class*="primary-button"]',
  'a[href]:not([href^="#"])',
  'nav', 'footer',
  '.hero', '[class*="hero"]', '[class*="banner"]',
  '[class*="badge"]', '[class*="card"]',
];

interface HeadlessExtraction {
  colors: Array<{ hex: string; source: string; count: number }>;
  fonts: string[];
  bodyFont: string | null;
  headingFont: string | null;
  primaryColor: string | null;
  pageTitle: string | null;
}

/**
 * Run a Chromium headless render against the URL and read computed styles.
 *
 * Throws if Playwright is unavailable (graceful degradation — the analysis
 * engine catches and continues). 30s navigation timeout. Returns extracted
 * brand tokens plus inferred body/heading fonts.
 */
async function extractWithChromium(url: string): Promise<HeadlessExtraction> {
  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    throw new Error(
      `Headless fallback unavailable: playwright package not installed (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Run extraction inside the browser. The whole script is one inline arrow
    // — no nested const-arrow helpers, because esbuild/tsx may inject `__name`
    // calls on those that aren't defined inside `page.evaluate`'s sandbox.
    const extracted = (await page.evaluate((selectors: string[]) => {
      const colorCounts: Record<string, { source: string; count: number }> = {};
      const fontSet: Record<string, true> = {};
      const generic: Record<string, true> = {
        serif: true, 'sans-serif': true, monospace: true, cursive: true, fantasy: true,
        'system-ui': true, 'ui-sans-serif': true, 'ui-serif': true, 'ui-monospace': true,
        inherit: true, '-apple-system': true, blinkmacsystemfont: true,
      };

      const allSelectors = selectors.concat(['__BODY__', '__H1__']);
      let bodyFont: string | null = null;
      let headingFont: string | null = null;

      for (const sel of allSelectors) {
        let els: Element[];
        if (sel === '__BODY__') {
          els = document.body ? [document.body] : [];
        } else if (sel === '__H1__') {
          const h1 = document.querySelector('h1');
          els = h1 ? [h1] : [];
        } else {
          els = Array.from(document.querySelectorAll(sel)).slice(0, 10);
        }

        for (const el of els) {
          const cs = window.getComputedStyle(el);

          // Inline color recording — no helper function
          const colorProps = [cs.backgroundColor, cs.color, cs.borderColor];
          for (const raw of colorProps) {
            if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') continue;
            const m = raw.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
            if (!m) continue;
            const r = parseInt(m[1]);
            const g = parseInt(m[2]);
            const b = parseInt(m[3]);
            if (!isFinite(r + g + b)) continue;
            const sum = r + g + b;
            if (sum < 30 || sum > 735) continue;
            const hex =
              '#' +
              r.toString(16).padStart(2, '0') +
              g.toString(16).padStart(2, '0') +
              b.toString(16).padStart(2, '0');
            const upper = hex.toUpperCase();
            const entry = colorCounts[upper];
            if (entry) {
              entry.count += 1;
            } else {
              colorCounts[upper] = { source: sel, count: 1 };
            }
          }

          // Inline font recording — no helper function
          const family = cs.fontFamily;
          if (family) {
            const first = (family.split(',')[0] || '').trim().replace(/^["']|["']$/g, '');
            if (first && !generic[first.toLowerCase()]) {
              fontSet[first] = true;
              if (sel === '__BODY__' && !bodyFont) bodyFont = first;
              if (sel === '__H1__' && !headingFont) headingFont = first;
            }
          }
        }
      }

      const colorEntries = Object.keys(colorCounts).map((hex) => ({
        hex,
        source: colorCounts[hex].source,
        count: colorCounts[hex].count,
      }));

      // Primary color: highest-count from button/cta/hero context
      const primary = colorEntries
        .filter((c) => /button|cta|primary|hero/.test(c.source))
        .sort((a, b) => b.count - a.count)[0];

      return {
        colors: colorEntries,
        fonts: Object.keys(fontSet),
        bodyFont,
        headingFont,
        primaryColor: primary ? primary.hex : null,
        pageTitle: document.title || null,
      };
    }, BRAND_ANCHOR_SELECTORS)) as HeadlessExtraction;

    return extracted;
  } finally {
    await browser.close();
  }
}

/**
 * Scrape a URL via headless browser as a fallback to the static scraper.
 * Returns a ScrapedData object compatible with the existing analysis pipeline.
 *
 * The visual heuristics, CSS variables, and brand image scraping are all set
 * to empty/defaults — only colors, fonts, and basic metadata come back. The
 * downstream pipeline still works (frequency/detector tokens are populated).
 */
export async function scrapeUrlViaHeadless(url: string): Promise<ScrapedData> {
  const extracted = await extractWithChromium(url);

  // Sort colors by count (most-used first) and cap at 16 — keeps the
  // authoritative palette manageable.
  const colorFrequency = extracted.colors
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map((c) => ({ hex: c.hex, count: c.count, contexts: [c.source] }));

  // Order fonts: body first, then heading, then the rest (mirrors the
  // priority chain used by the static scraper's mergeFontsByPriority).
  const orderedFonts: string[] = [];
  const seen = new Set<string>();
  const push = (f: string | null): void => {
    if (!f) return;
    const k = f.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    orderedFonts.push(f);
  };
  push(extracted.bodyFont);
  push(extracted.headingFont);
  for (const f of extracted.fonts) push(f);

  return {
    url,
    title: extracted.pageTitle,
    description: null,
    bodyText: '',
    cssColors: extracted.colors.map((c) => c.hex),
    cssFonts: orderedFonts,
    logoUrls: [],
    ogImage: null,
    favicon: null,
    inlineCss: '',
    linkedCssContent: '',
    cssVariables: [],
    colorFrequency,
    fontSizes: [],
    linkedStylesheetCount: 0,
    brandImages: [],
  };
}
