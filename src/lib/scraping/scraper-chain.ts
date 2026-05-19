// =============================================================
// Scraper Chain — 3-step fallback voor competitor URL-scraping
//
// Volgorde van goedkoop naar duur:
//   (a) scrapeProductUrl     — rauwe fetch + cheerio, ~800ms, gratis
//   (b) scrapeViaApify       — Firefox + residential proxy, ~30s, ~$0.002
//   (c) scrapeUrlViaGemini   — Gemini browse-tool, $$$, laatste redmiddel
//
// Tussen elke stap een `MIN_BODY_TEXT_CHARS`-check; we schakelen door
// op zowel throw als te-dunne content. Spike-bevindingen in
// `docs/specs/apify-integration-options.md` SPIKE-RESULTATEN sectie.
//
// DI-vriendelijk: scrapers zijn injectable via `opts.scrapers` zodat
// smoke-tests de chain-orchestratie kunnen verifiëren zonder echte
// netwerk-IO. Default-implementatie pakt de productie-scrapers.
// =============================================================
import { scrapeProductUrl } from '@/lib/products/url-scraper';
import { scrapeUrlViaGemini } from '@/lib/products/gemini-url-fallback';
import type { ScrapedProductData } from '@/lib/products/url-scraper';

import { scrapeViaApify } from './apify-client';

export const MIN_BODY_TEXT_CHARS = 500;

export type ScraperFn = (url: string) => Promise<ScrapedProductData>;

export interface ScraperChainOptions {
  scrapers?: {
    current?: ScraperFn;
    apify?: ScraperFn;
    gemini?: ScraperFn;
  };
}

export interface ScraperChainResult {
  scraped: ScrapedProductData;
  /** Welke scraper het FINAL teruggegeven resultaat produceerde. `none`
   *  betekent: alle 3 stappen faalden of leverden lege content. Caller
   *  beslist of dat een 422-error rechtvaardigt. */
  scraperUsed: 'current' | 'apify' | 'gemini' | 'none';
}

/**
 * Voer de 3-step scraper-chain uit. Returnt het eerste resultaat met
 * ≥ MIN_BODY_TEXT_CHARS body-text. Throws alleen als alle 3 stappen
 * gefaald hebben (zowel exceptions als ondergrens-misses).
 *
 * Logt per fail-step naar `console.info` voor observability — Vercel
 * logs zijn de primaire telemetry-bron voor scrape-success-rate.
 */
export async function runScraperChain(
  url: string,
  opts: ScraperChainOptions = {},
): Promise<ScraperChainResult> {
  const current = opts.scrapers?.current ?? scrapeProductUrl;
  const apify = opts.scrapers?.apify ?? scrapeViaApify;
  const gemini = opts.scrapers?.gemini ?? scrapeUrlViaGemini;

  // Houd het beste resultaat-tot-nu-toe bij, met label welke scraper het
  // produceerde. Zo retourneren we bij alle-3-failed niet ten onrechte
  // `scraperUsed: 'current'` als apify nog een dun resultaat had geleverd.
  let best: ScrapedProductData = {
    url,
    title: null,
    description: null,
    bodyText: '',
    images: [],
  };
  let bestSource: 'current' | 'apify' | 'gemini' | 'none' = 'none';

  // Step (a) — current
  try {
    const result = await current(url);
    if (result.bodyText.length >= MIN_BODY_TEXT_CHARS) {
      return { scraped: result, scraperUsed: 'current' };
    }
    if (result.bodyText.length > best.bodyText.length) {
      best = result;
      bestSource = 'current';
    }
    console.info(
      `[scraper-chain] current returned ${result.bodyText.length} chars (< ${MIN_BODY_TEXT_CHARS}) for ${url} — trying apify`,
    );
  } catch (err) {
    console.info(
      `[scraper-chain] current threw for ${url}: ${err instanceof Error ? err.message : String(err)} — trying apify`,
    );
  }

  // Step (b) — apify
  try {
    const result = await apify(url);
    if (result.bodyText.length >= MIN_BODY_TEXT_CHARS) {
      return { scraped: result, scraperUsed: 'apify' };
    }
    if (result.bodyText.length > best.bodyText.length) {
      best = result;
      bestSource = 'apify';
    }
    console.info(
      `[scraper-chain] apify returned ${result.bodyText.length} chars (< ${MIN_BODY_TEXT_CHARS}) for ${url} — trying gemini`,
    );
  } catch (err) {
    console.info(
      `[scraper-chain] apify threw for ${url}: ${err instanceof Error ? err.message : String(err)} — trying gemini`,
    );
  }

  // Step (c) — gemini. Geen threshold-check meer: dit is last-resort, dus
  // accept whatever gemini produced (caller beslist via eigen content-check
  // of het bruikbaar is). Bij gemini-throw vallen we terug op het beste
  // resultaat dat we tot nu toe gezien hebben.
  try {
    const result = await gemini(url);
    return { scraped: result, scraperUsed: 'gemini' };
  } catch (err) {
    console.info(
      `[scraper-chain] gemini threw for ${url}: ${err instanceof Error ? err.message : String(err)} — returning best-so-far (${bestSource})`,
    );
    return { scraped: best, scraperUsed: bestSource };
  }
}
