/**
 * Spike-probe: Apify Website Content Crawler vs huidige scrapeProductUrl.
 *
 * Vergelijkt success-rate + content-length + latency + cost over een set
 * representatieve SaaS-landing URLs. Output bevestigt of (A) URL-crawler
 * uit `docs/specs/apify-integration-options.md` greenlight verdient als
 * vervanging voor `scrapeProductUrl` + Gemini-fallback in refresh-route.
 *
 * Sample-set: 7 publieke landing-pages — mix van JS-heavy SPAs (Linear,
 * Notion), enterprise SaaS (Salesforce, HubSpot), NL/EN multilingual
 * (bunq). Geen pilot-customer URLs (geen PII, geen auth-state).
 *
 * Cost-bound: ~$0.014 totaal (7 URLs × ~$0.002 per Apify-crawl).
 *
 * Run: APIFY_TOKEN=... npx tsx scripts/probes/apify-vs-current-scraper.ts
 */
import { ApifyClient } from 'apify-client';
import { scrapeProductUrl } from '../../src/lib/products/url-scraper';

interface ScrapeResult {
  scraper: 'current' | 'apify';
  url: string;
  success: boolean;
  bodyTextLength: number;
  latencyMs: number;
  errorMessage: string | null;
  costUSD: number | null;
}

// V1 sample (publieke SaaS landings, allemaal SEO-vriendelijk).
const EASY_URLS = [
  'https://linear.app',
  'https://www.notion.so',
  'https://stripe.com',
  'https://www.salesforce.com',
  'https://airtable.com',
  'https://www.hubspot.com',
  'https://www.bunq.com',
];

// V2 toevoeging: deliberately-difficult URLs (Cloudflare-protected,
// JS-heavy SPAs, bekende anti-bot). Daar moet Apify in theorie winnen.
const HARD_URLS = [
  'https://www.cloudflare.com',
  'https://www.zendesk.com',
  'https://www.figma.com',
  'https://www.snowflake.com',
];

const TEST_URLS = [...EASY_URLS, ...HARD_URLS];

const APIFY_ACTOR_ID = 'apify/website-content-crawler';
const APIFY_TIMEOUT_SECS = 120;
// Minimum content-length voor "success" — onder dit beschouw je het als
// effectieve scrape-failure (lege landing of bot-block met dunne stub).
const MIN_CONTENT_LENGTH = 200;

async function runCurrentScraper(url: string): Promise<ScrapeResult> {
  const start = Date.now();
  try {
    const result = await scrapeProductUrl(url);
    const latencyMs = Date.now() - start;
    const bodyTextLength = result.bodyText.length;
    return {
      scraper: 'current',
      url,
      success: bodyTextLength >= MIN_CONTENT_LENGTH,
      bodyTextLength,
      latencyMs,
      errorMessage: null,
      costUSD: 0,
    };
  } catch (err) {
    return {
      scraper: 'current',
      url,
      success: false,
      bodyTextLength: 0,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      costUSD: 0,
    };
  }
}

async function runApifyScraper(client: ApifyClient, url: string): Promise<ScrapeResult> {
  const start = Date.now();
  try {
    const run = await client.actor(APIFY_ACTOR_ID).call(
      {
        startUrls: [{ url }],
        maxCrawlDepth: 0,
        maxCrawlPages: 1,
        // V2: force playwright (geen adaptive switching dat Linear/Stripe stuk maakt)
        crawlerType: 'playwright:firefox',
        saveMarkdown: true,
        saveHtml: false,
        // V2: explicit Readability-extracted body — vs default extractor die soms te aggressief filtert
        htmlTransformer: 'readableText',
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
      },
      {
        timeout: APIFY_TIMEOUT_SECS,
        // V2: 4096MB i.p.v. 2048 — geeft Firefox meer ruimte voor JS-heavy SPAs
        memory: 4096,
      },
    );

    const latencyMs = Date.now() - start;

    const dataset = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const firstItem = dataset.items[0];
    // V2: pak het LANGSTE van text/markdown/html — extractors kunnen verschillen
    const candidates: string[] = [];
    if (typeof firstItem?.text === 'string') candidates.push(firstItem.text);
    if (typeof firstItem?.markdown === 'string') candidates.push(firstItem.markdown);
    if (typeof firstItem?.html === 'string') candidates.push(firstItem.html);
    const longest = candidates.reduce((a, b) => (a.length >= b.length ? a : b), '');
    const bodyTextLength = longest.length;

    // V2: Apify run-object exposeert usageUsd direct (geen handmatige CU-berekening nodig).
    // Niet in `ActorRun`-types maar wel in API-response (zie Apify API docs).
    const runRecord = run as unknown as Record<string, unknown>;
    const usageUsd = typeof runRecord.usageUsd === 'number' ? runRecord.usageUsd : null;

    return {
      scraper: 'apify',
      url,
      success: bodyTextLength >= MIN_CONTENT_LENGTH,
      bodyTextLength,
      latencyMs,
      errorMessage: run.status === 'SUCCEEDED' ? null : `run status: ${run.status}`,
      costUSD: usageUsd,
    };
  } catch (err) {
    return {
      scraper: 'apify',
      url,
      success: false,
      bodyTextLength: 0,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      costUSD: null,
    };
  }
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

function formatResult(r: ScrapeResult): string {
  const status = r.success ? '✓' : '✗';
  const len = `${r.bodyTextLength} chars`;
  const lat = `${r.latencyMs}ms`;
  const cost = r.costUSD !== null ? `$${r.costUSD.toFixed(4)}` : 'n/a';
  const err = r.errorMessage ? ` — ${r.errorMessage.slice(0, 60)}` : '';
  return `  ${status} ${pad(r.scraper, 8)} ${pad(len, 14)} ${pad(lat, 8)} ${pad(cost, 10)}${err}`;
}

async function main(): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('APIFY_TOKEN is required (sign up at apify.com, free tier $5/mnd)');
    process.exit(1);
  }

  const client = new ApifyClient({ token });

  console.log('='.repeat(80));
  console.log('Apify vs current scraper probe — 7 representative SaaS landings');
  console.log(`  Actor: ${APIFY_ACTOR_ID}`);
  console.log(`  Min content-length for success: ${MIN_CONTENT_LENGTH} chars`);
  console.log('='.repeat(80));

  const allResults: ScrapeResult[] = [];

  for (const url of TEST_URLS) {
    console.log(`\n--- ${url} ---`);
    // Sequential om throttle te respecteren en latency-vergelijking zuiver te houden.
    const currentResult = await runCurrentScraper(url);
    console.log(formatResult(currentResult));
    allResults.push(currentResult);

    const apifyResult = await runApifyScraper(client, url);
    console.log(formatResult(apifyResult));
    allResults.push(apifyResult);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  for (const scraper of ['current', 'apify'] as const) {
    const sub = allResults.filter((r) => r.scraper === scraper);
    const successes = sub.filter((r) => r.success).length;
    const avgLatency = Math.round(sub.reduce((a, b) => a + b.latencyMs, 0) / sub.length);
    const avgLength = Math.round(sub.reduce((a, b) => a + b.bodyTextLength, 0) / sub.length);
    const totalCost = sub.reduce((a, b) => a + (b.costUSD ?? 0), 0);

    console.log(`\n${scraper}:`);
    console.log(`  success-rate:     ${successes}/${sub.length} (${((successes / sub.length) * 100).toFixed(0)}%)`);
    console.log(`  avg content-len:  ${avgLength} chars`);
    console.log(`  avg latency:      ${avgLatency}ms`);
    console.log(`  total cost:       $${totalCost.toFixed(4)}`);
  }

  // Side-by-side per URL
  console.log('\nPer-URL verdict (success-delta — current → apify):');
  for (const url of TEST_URLS) {
    const c = allResults.find((r) => r.url === url && r.scraper === 'current');
    const a = allResults.find((r) => r.url === url && r.scraper === 'apify');
    if (!c || !a) continue;
    const verdict =
      c.success && a.success
        ? `both ok (apify ${a.bodyTextLength - c.bodyTextLength >= 0 ? '+' : ''}${a.bodyTextLength - c.bodyTextLength} chars)`
        : c.success && !a.success
          ? 'current wins (apify failed)'
          : !c.success && a.success
            ? 'APIFY UNLOCKS — current failed'
            : 'both failed';
    console.log(`  ${pad(url, 35)} ${verdict}`);
  }

  console.log('\n' + '='.repeat(80));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
