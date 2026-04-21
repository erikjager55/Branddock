// =============================================================
// Multi-Page Brandstyle Scraper — Sprint 6D
//
// Scrapes the homepage plus a handful of prioritised internal
// pages (about, contact, services) and merges the results into a
// single ScrapedData record. Rationale:
//   - Link-heavy landing pages (e.g. Napking.nl) ship almost no
//     CTA markup on the homepage. Their real button variants,
//     form inputs, and service cards live on `/contact/`, the
//     services index, and about pages.
//   - Brand tokens (colours, fonts, CSS variables) are usually
//     shared across all pages, but some sites define extra tokens
//     on deep pages (pricing tiers, feature cards).
//   - Logo + favicon are preserved from the homepage — those are
//     the canonical brand assets.
//
// Gated by `BRANDSTYLE_MULTI_PAGE=1` so we can roll this out
// behind a flag and fall back to single-page scraping cleanly.
// =============================================================

import * as cheerio from 'cheerio';
import { scrapeUrl, type ScrapedData, type CssVariable, type ColorFrequency } from './url-scraper';
import { discoverInternalLinks } from '@/lib/products/url-scraper';
import { classifyAndPrioritize } from '@/lib/website-scanner/page-classifier';

export function isMultiPageEnabled(): boolean {
  return process.env.BRANDSTYLE_MULTI_PAGE === '1';
}

/** Max additional pages to scrape beyond the homepage. 8 covers
 *  about + services + contact + pricing + cases + team + faq +
 *  blog-index — enough breadth that component libraries (forms,
 *  cards, CTAs, pricing toggles, testimonials, FAQ accordions)
 *  all get sampled. Distribution is governed by
 *  classifyAndPrioritize's per-type quota. */
const MAX_EXTRA_PAGES = 8;

/** Total wall-clock budget — 8 extra pages scrape in parallel
 *  batches; each scrape is ~8-15s including linked stylesheets.
 *  120s gives comfortable headroom for slow hosts / CDN misses. */
const TOTAL_TIMEOUT_MS = 120_000;

/**
 * Scrape homepage and up to 3 prioritised internal pages, then
 * merge into a single ScrapedData record. On any failure during
 * sub-page scraping, falls back to just the homepage data.
 *
 * Returns both the merged data AND the list of subpage URLs that
 * were successfully scraped — downstream the screenshotter can
 * re-visit them for per-page component extraction.
 */
export async function scrapeUrlMultiPage(
  url: string,
): Promise<{ merged: ScrapedData; subpageUrls: string[] }> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  // Phase 1: scrape the homepage. This is the anchor — all other
  // data merges INTO this base (homepage wins ties).
  const homepage = await scrapeUrl(url);

  // Phase 2: discover internal links from the homepage HTML we
  // already have. We re-parse to run the link discovery without
  // re-fetching the page. (The ScrapedData doesn't expose the raw
  // HTML; we could add it but re-parsing is cheap.)
  const internalLinks = await discoverInternalLinksFromHomepage(url, homepage);
  if (internalLinks.length === 0) return { merged: homepage, subpageUrls: [] };

  const prioritised = classifyAndPrioritize(internalLinks, MAX_EXTRA_PAGES);
  if (prioritised.length === 0) return { merged: homepage, subpageUrls: [] };

  console.log(
    `[multi-page-scraper] Discovered ${internalLinks.length} internal links, scraping ${prioritised.length} extras: ${prioritised.map((p) => p.pageType).join(', ')}`,
  );

  // Phase 3: scrape extras in parallel with a per-page soft timeout.
  // Any page that fails is skipped — we never let a slow contact
  // page kill the whole pipeline.
  const extraResults = await Promise.allSettled(
    prioritised.map(({ url: pageUrl, pageType }) => scrapeWithBudget(pageUrl, pageType, deadline)),
  );

  const extraScraped: Array<{ data: ScrapedData; pageType: string; url: string }> = [];
  for (let i = 0; i < extraResults.length; i++) {
    const r = extraResults[i];
    const pageType = prioritised[i].pageType;
    if (r.status === 'fulfilled' && r.value) {
      extraScraped.push({ data: r.value, pageType, url: prioritised[i].url });
    } else if (r.status === 'rejected') {
      console.warn(
        `[multi-page-scraper] ${prioritised[i].url} failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
      );
    }
  }

  if (extraScraped.length === 0) return { merged: homepage, subpageUrls: [] };

  console.log(
    `[multi-page-scraper] Merging homepage + ${extraScraped.length} extra pages`,
  );

  return {
    merged: mergeScrapedData(homepage, extraScraped),
    subpageUrls: extraScraped.map((e) => e.url),
  };
}

// ─── Helpers ──────────────────────────────────────────────────

/** Re-parse the homepage HTML to discover internal links. We
 *  already have all the data in `ScrapedData` except the raw
 *  HTML, so we re-fetch just that (cached by most sites). */
async function discoverInternalLinksFromHomepage(
  url: string,
  _homepage: ScrapedData,
): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    return discoverInternalLinks($, url);
  } catch {
    return [];
  }
}

/** Scrape a single page, aborting if we're already past the
 *  shared deadline. Returns null on failure. */
async function scrapeWithBudget(
  url: string,
  pageType: string,
  deadline: number,
): Promise<ScrapedData | null> {
  if (Date.now() >= deadline) {
    console.warn(`[multi-page-scraper] Skipping ${pageType} ${url} — deadline exceeded`);
    return null;
  }
  try {
    return await scrapeUrl(url);
  } catch (err) {
    console.warn(
      `[multi-page-scraper] Scrape failed for ${pageType} ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Merge homepage + extras into a single ScrapedData. Strategy per
 * field:
 *   - url, title, description, ogImage, favicon, logoUrls: keep
 *     homepage values (canonical brand).
 *   - bodyText: concat homepage first, then extras (for AI tone).
 *   - cssColors / cssFonts: union, homepage order preserved.
 *   - inlineCss / linkedCssContent: concat homepage + extras so
 *     downstream token extraction sees every page's rules.
 *   - cssVariables: union by name (homepage wins ties).
 *   - colorFrequency: sum counts across pages by hex; more
 *     occurrences = higher confidence.
 *   - fontSizes: union, homepage first.
 *   - brandImages: union, homepage first, capped.
 *   - visualHeuristics: keep homepage's (rare that these differ
 *     meaningfully page-to-page, and merging is non-trivial).
 *   - components: merged across all pages via a shape+class hash.
 */
function mergeScrapedData(
  homepage: ScrapedData,
  extras: Array<{ data: ScrapedData; pageType: string }>,
): ScrapedData {
  const allPages = [homepage, ...extras.map((e) => e.data)];

  // ─── Simple unions ───────────────────────
  const mergedColors = dedupPreserveOrder(allPages.flatMap((p) => p.cssColors));
  const mergedFonts = dedupPreserveOrder(allPages.flatMap((p) => p.cssFonts));
  const mergedFontSizes = dedupBy(
    allPages.flatMap((p) => p.fontSizes),
    (f) => `${f.value}|${f.selector}`,
  );
  const mergedLogoUrls = dedupPreserveOrder([
    ...homepage.logoUrls,
    ...extras.flatMap((e) => e.data.logoUrls),
  ]);
  const mergedBrandImages = dedupBy(
    allPages.flatMap((p) => p.brandImages),
    (img) => img.url,
  ).slice(0, 20); // keep storage bounded

  // ─── CSS concatenation ─────────────────
  const mergedInlineCss = allPages.map((p) => p.inlineCss).filter(Boolean).join('\n');
  const mergedLinkedCss = allPages.map((p) => p.linkedCssContent).filter(Boolean).join('\n');

  // ─── CSS variables (unique by name) ────
  const variableMap = new Map<string, CssVariable>();
  for (const page of allPages) {
    for (const v of page.cssVariables) {
      if (!variableMap.has(v.name)) variableMap.set(v.name, v);
    }
  }
  const mergedCssVariables = Array.from(variableMap.values());

  // ─── Color frequency (sum across pages) ─
  const freqMap = new Map<string, ColorFrequency>();
  for (const page of allPages) {
    for (const f of page.colorFrequency) {
      const existing = freqMap.get(f.hex);
      if (existing) {
        existing.count += f.count;
        // Merge context sets
        for (const ctx of f.contexts) {
          if (!existing.contexts.includes(ctx)) existing.contexts.push(ctx);
        }
      } else {
        freqMap.set(f.hex, { ...f, contexts: [...f.contexts] });
      }
    }
  }
  const mergedColorFrequency = Array.from(freqMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  // ─── Body text: homepage first, extras appended ─
  const mergedBodyText = allPages
    .map((p, i) => (i === 0 ? p.bodyText : p.bodyText.slice(0, 2000))) // cap extras
    .filter(Boolean)
    .join('\n\n');

  // ─── Components: merge with structural dedup ─
  const mergedComponents = mergeComponents(allPages);

  // Adobe Fonts detection: any page detecting Typekit is enough to
  // classify the brand's fonts as served via Adobe. Prefer a kit id
  // from any page that has one (homepage first, extras after).
  const mergedAdobeFonts = (() => {
    for (const p of allPages) {
      if (p.adobeFonts?.detected) {
        return p.adobeFonts;
      }
    }
    return { detected: false, kitId: null };
  })();

  return {
    url: homepage.url,
    title: homepage.title,
    description: homepage.description,
    bodyText: mergedBodyText,
    cssColors: mergedColors,
    cssFonts: mergedFonts,
    bodyFont: homepage.bodyFont,
    headingFont: homepage.headingFont,
    logoUrls: mergedLogoUrls,
    ogImage: homepage.ogImage,
    favicon: homepage.favicon,
    inlineCss: mergedInlineCss,
    linkedCssContent: mergedLinkedCss,
    cssVariables: mergedCssVariables,
    colorFrequency: mergedColorFrequency,
    fontSizes: mergedFontSizes,
    linkedStylesheetCount: homepage.linkedStylesheetCount,
    brandImages: mergedBrandImages,
    visualHeuristics: homepage.visualHeuristics,
    components: mergedComponents,
    adobeFonts: mergedAdobeFonts,
  };
}

function dedupPreserveOrder<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function dedupBy<T>(items: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Merge DetectedComponent arrays from all pages. Dedup on a
 *  structural fingerprint so the same "Primary Button" captured
 *  on both the homepage and the contact page collapses to one
 *  entry. Confidence is boosted for components that appear on
 *  multiple pages (they're almost certainly real brand components,
 *  not one-off decorations). */
function mergeComponents(
  pages: ScrapedData[],
): ScrapedData['components'] {
  const byHash = new Map<string, {
    component: NonNullable<ScrapedData['components']>[number];
    seenCount: number;
  }>();

  for (const page of pages) {
    if (!page.components) continue;
    for (const c of page.components) {
      const s = c.extractedStyles;
      const hash = [
        c.type,
        (s.background ?? '').replace(/\s+/g, ''),
        s.borderRadius ?? '',
        s.padding ?? '',
      ].join('|');
      const existing = byHash.get(hash);
      if (existing) {
        existing.seenCount++;
        // Boost confidence: components seen on 2+ pages get a
        // small bump (capped at 1.0). Real brand components recur
        // across pages; one-off decorations don't.
        existing.component.confidence = Math.min(
          existing.component.confidence + 0.1,
          1,
        );
      } else {
        byHash.set(hash, { component: { ...c }, seenCount: 1 });
      }
    }
  }

  return Array.from(byHash.values())
    .sort((a, b) => b.component.confidence - a.component.confidence)
    .map((x) => x.component);
}
