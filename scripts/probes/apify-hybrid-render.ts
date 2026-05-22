/**
 * Probe v3: hypothese-test voor hybride architectuur.
 *
 * Hypothese: Apify als rendering-engine (geeft browser-rendered HTML)
 * + scrapeProductUrl's cheerio-extractie (proven body-text logic)
 * lost beide failure-modes op:
 *   - Snowflake: current got 0 chars omdat geen JS-runtime
 *   - Stripe: Apify got 138 chars omdat 'readableText' te aggressief filtert
 *
 * Test op 4 representative hard URLs. Per URL:
 *   (a) Baseline: scrapeProductUrl(url) — current
 *   (b) Apify render-only: htmlTransformer 'none' + saveHtml: true
 *   (c) Hybrid: extract bodyText uit (b)'s rendered HTML via cheerio,
 *       met DEZELFDE strip-rules als scrapeProductUrl
 *
 * Cost-bound: 4 URLs × ~$0.002 = ~$0.008.
 *
 * Run: APIFY_TOKEN=... npx tsx scripts/probes/apify-hybrid-render.ts
 */
import { ApifyClient } from 'apify-client';
import * as cheerio from 'cheerio';
import { scrapeProductUrl } from '../../src/lib/products/url-scraper';

const TEST_URLS = [
  // JS-heavy SPA waar current failed in v2 (0 chars)
  'https://www.snowflake.com',
  // JS-heavy SPA waar Apify 'readableText' Apify-side beter deed dan current (+7045 chars)
  'https://linear.app',
  // Visual-heavy landing waar Apify 'readableText' faalde (138 chars)
  'https://stripe.com',
  // SPA met thin extracted content
  'https://www.figma.com',
];

interface Variant {
  name: string;
  bodyTextLength: number;
  latencyMs: number;
  errorMessage: string | null;
}

// Vrijwel identieke strip-logic als scrapeProductUrl regels 237-254.
// Bewust gedupliceerd voor spike-doelen — productie zou een gedeelde
// `extractBodyText(html, url)` helper introduceren.
function extractBodyTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  $(
    'script, style, nav, footer, noscript, iframe, header, .cookie-banner, .gdpr, #cookie-consent, .nav, .footer, .sidebar, .ad, .advertisement',
  ).remove();
  const articleEl = $(
    'article, main, [role="main"], .post-content, .article-content, .entry-content',
  ).first();
  const contentRoot = articleEl.length > 0 ? articleEl : $('body');

  const parts: string[] = [];
  contentRoot
    .find('h1, h2, h3, h4, h5, p, li, blockquote, figcaption, td, th, dt, dd, span, div')
    .each((_, el) => {
      const $el = $(el);
      if ($el.children('h1, h2, h3, h4, h5, p, div, blockquote, ul, ol, table').length > 0) return;
      const text = $el.text().trim();
      if (text && text.length > 10) parts.push(text);
    });

  return parts.join('\n').slice(0, 8000);
}

async function runCurrent(url: string): Promise<Variant> {
  const start = Date.now();
  try {
    const result = await scrapeProductUrl(url);
    return {
      name: '(a) current',
      bodyTextLength: result.bodyText.length,
      latencyMs: Date.now() - start,
      errorMessage: null,
    };
  } catch (err) {
    return {
      name: '(a) current',
      bodyTextLength: 0,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runApifyRenderOnly(
  client: ApifyClient,
  url: string,
): Promise<{ apifyOnly: Variant; hybrid: Variant; renderedHtml: string | null }> {
  const start = Date.now();
  try {
    const run = await client.actor('apify/website-content-crawler').call(
      {
        startUrls: [{ url }],
        maxCrawlDepth: 0,
        maxCrawlPages: 1,
        crawlerType: 'playwright:firefox',
        saveMarkdown: false,
        saveHtmlToFile: true,
        // Geen htmlTransformer → krijgt raw rendered HTML
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
      },
      { timeout: 120, memory: 4096 },
    );
    const latencyMs = Date.now() - start;
    const ds = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const item = ds.items[0];

    const apifyText = typeof item?.text === 'string' ? item.text : '';
    const apifyOnly: Variant = {
      name: '(b) apify render+extract',
      bodyTextLength: apifyText.length,
      latencyMs,
      errorMessage: run.status === 'SUCCEEDED' ? null : `status: ${run.status}`,
    };

    // saveHtmlToFile slaat de HTML op in KV store; haal op via htmlUrl in dataset item
    let renderedHtml: string | null = null;
    if (typeof item?.htmlUrl === 'string') {
      try {
        const res = await fetch(item.htmlUrl);
        if (res.ok) renderedHtml = await res.text();
      } catch {
        // negeer fetch-fout
      }
    } else if (typeof item?.html === 'string') {
      renderedHtml = item.html;
    }

    const hybridBody = renderedHtml ? extractBodyTextFromHtml(renderedHtml) : '';
    const hybrid: Variant = {
      name: '(c) hybrid render+cheerio',
      bodyTextLength: hybridBody.length,
      latencyMs,
      errorMessage: renderedHtml ? null : 'no rendered HTML available',
    };

    return { apifyOnly, hybrid, renderedHtml };
  } catch (err) {
    const failed: Variant = {
      name: 'apify-failed',
      bodyTextLength: 0,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
    return { apifyOnly: { ...failed, name: '(b) apify render+extract' }, hybrid: { ...failed, name: '(c) hybrid render+cheerio' }, renderedHtml: null };
  }
}

function fmt(v: Variant): string {
  const status = v.bodyTextLength >= 200 ? '✓' : '✗';
  const err = v.errorMessage ? ` — ${v.errorMessage.slice(0, 60)}` : '';
  return `  ${status} ${v.name.padEnd(28)} ${String(v.bodyTextLength).padStart(5)} chars  ${String(v.latencyMs).padStart(6)}ms${err}`;
}

async function main(): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('APIFY_TOKEN is required');
    process.exit(1);
  }
  const client = new ApifyClient({ token });

  console.log('='.repeat(80));
  console.log('V3 probe: Apify-render + current-extractor hybrid');
  console.log('='.repeat(80));

  type RowResult = { url: string; current: Variant; apifyOnly: Variant; hybrid: Variant };
  const rows: RowResult[] = [];

  for (const url of TEST_URLS) {
    console.log(`\n--- ${url} ---`);
    const current = await runCurrent(url);
    console.log(fmt(current));

    const { apifyOnly, hybrid, renderedHtml } = await runApifyRenderOnly(client, url);
    console.log(fmt(apifyOnly));
    console.log(fmt(hybrid));
    if (renderedHtml) {
      console.log(`  (rendered HTML length: ${renderedHtml.length} chars)`);
    }

    rows.push({ url, current, apifyOnly, hybrid });
  }

  console.log('\n' + '='.repeat(80));
  console.log('VERDICT — wint hybrid op de hard cases?');
  console.log('='.repeat(80));
  for (const r of rows) {
    const cOK = r.current.bodyTextLength >= 200;
    const hOK = r.hybrid.bodyTextLength >= 200;
    const verdict =
      !cOK && hOK
        ? `HYBRID WINS (+${r.hybrid.bodyTextLength} chars uit niets)`
        : cOK && hOK
          ? `both ok (hybrid ${r.hybrid.bodyTextLength - r.current.bodyTextLength >= 0 ? '+' : ''}${r.hybrid.bodyTextLength - r.current.bodyTextLength} chars)`
          : !cOK && !hOK
            ? 'both failed'
            : `current wins (hybrid faalde)`;
    console.log(`  ${r.url.padEnd(35)} ${verdict}`);
  }
  console.log();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
