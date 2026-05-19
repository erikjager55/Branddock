// =============================================================
// Apify Client — Singleton + scrapeViaApify wrapper
//
// Drop-in compat met `scrapeProductUrl()` voor seamless substitution
// in de refresh-route fallback-chain. Returnt ScrapedProductData met
// dezelfde shape (title / description / bodyText / images).
//
// Wordt gebruikt als middle-tier fallback wanneer `scrapeProductUrl`
// onvoldoende content levert (< 500 chars) — typisch op JS-heavy SPAs
// zoals Snowflake, waar de raw fetch geen browser-runtime heeft.
// Spike-evidence: probe v2/v3 op `spike/apify-url-crawler` branch.
//
// Config-keuze rationale:
// - `playwright:firefox` — meest compat met anti-bot heuristics
// - Residential proxy — Cloudflare / Akamai detecten datacenter-IPs
// - 4096MB memory — Firefox + JS-heavy SPAs vereisen ruimte
// - 120s timeout — container-startup ~25s + crawl ~10-30s, ruim
//
// Cost-tracking: Apify's `usageUsd` in API-response is niet-betrouwbaar
// op free-tier accounts. Voor productie-cost: check apify.com dashboard
// of implementeer separate CompetitorScrapeCost telemetrie-tabel.
// =============================================================
import { ApifyClient } from 'apify-client';

import type { ScrapedProductData } from '@/lib/products/url-scraper';

// ─── Singleton ─────────────────────────────────────────────

const globalForApify = globalThis as unknown as {
  apifyClient: ApifyClient | undefined;
};

function getClient(): ApifyClient {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      'APIFY_TOKEN is not set. Add it to .env.local to enable Apify scraping fallback. ' +
        'Sign up at apify.com (free tier $5/mnd is sufficient for low-volume pilot use).',
    );
  }
  if (!globalForApify.apifyClient) {
    globalForApify.apifyClient = new ApifyClient({ token });
  }
  return globalForApify.apifyClient;
}

// ─── Constants ─────────────────────────────────────────────

const ACTOR_ID = 'apify/website-content-crawler';
const ACTOR_TIMEOUT_SECS = 120;
const ACTOR_MEMORY_MB = 4096;

// ─── Public API ────────────────────────────────────────────

/**
 * Scrape een URL via Apify Website Content Crawler met browser-runtime.
 * Returnt dezelfde shape als `scrapeProductUrl` voor drop-in substitution
 * in de refresh-route fallback-chain.
 *
 * Latency-bound: ~25-50s (container-startup + crawl). Niet aanroepen
 * in hot-path — alleen wanneer een goedkopere scraper al gefaald is.
 *
 * @throws Error bij ontbrekende APIFY_TOKEN, of bij actor-failure waarbij
 *   geen dataset-item teruggegeven wordt. Caller catch'eert om door te
 *   schakelen naar volgende fallback (Gemini).
 */
export async function scrapeViaApify(url: string): Promise<ScrapedProductData> {
  const client = getClient();

  const run = await client.actor(ACTOR_ID).call(
    {
      startUrls: [{ url }],
      maxCrawlDepth: 0,
      maxCrawlPages: 1,
      crawlerType: 'playwright:firefox',
      saveMarkdown: false,
      saveHtml: false,
      htmlTransformer: 'readableText',
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
    },
    {
      timeout: ACTOR_TIMEOUT_SECS,
      memory: ACTOR_MEMORY_MB,
    },
  );

  if (run.status !== 'SUCCEEDED') {
    throw new Error(`Apify actor failed: status=${run.status}`);
  }

  const dataset = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = dataset.items[0];
  if (!item) {
    throw new Error('Apify returned no dataset items for the requested URL');
  }

  const text = typeof item.text === 'string' ? item.text : '';
  const metadata =
    typeof item.metadata === 'object' && item.metadata !== null
      ? (item.metadata as Record<string, unknown>)
      : {};
  const title = typeof metadata.title === 'string' ? metadata.title : null;
  const description = typeof metadata.description === 'string' ? metadata.description : null;

  return {
    url,
    title,
    description,
    bodyText: text,
    // Apify website-content-crawler returnt geen image-array uit-de-doos
    // zonder extra extraction. Voor refresh-route flow is dit OK — die
    // gebruikt alleen bodyText/title/description voor AI-analysis. Andere
    // callers van scrapeProductUrl die wel images nodig hebben moeten
    // niet via Apify-fallback gaan.
    images: [],
  };
}
