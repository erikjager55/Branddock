/**
 * Debug-probe voor Stripe-anomaly: Apify returned 138 chars in v2-run.
 * Dump volledige dataset-item om te zien WAT die 138 chars zijn
 * (Cloudflare-challenge? error-page? minimal SPA-shell?).
 *
 * Run: APIFY_TOKEN=... npx tsx scripts/probes/apify-stripe-debug.ts
 */
import { ApifyClient } from 'apify-client';

async function main(): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('APIFY_TOKEN is required');
    process.exit(1);
  }
  const client = new ApifyClient({ token });

  const run = await client.actor('apify/website-content-crawler').call(
    {
      startUrls: [{ url: 'https://stripe.com' }],
      maxCrawlDepth: 0,
      maxCrawlPages: 1,
      crawlerType: 'playwright:firefox',
      saveMarkdown: true,
      saveHtml: true,
      htmlTransformer: 'readableText',
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
    },
    { timeout: 120, memory: 4096 },
  );

  console.log('Run status:', run.status);
  console.log('Run defaultDatasetId:', run.defaultDatasetId);

  const ds = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = ds.items[0];
  if (!item) {
    console.log('NO DATASET ITEM');
    return;
  }

  console.log('\n--- Dataset item keys ---');
  console.log(Object.keys(item));

  for (const key of ['url', 'loadedUrl', 'crawl', 'metadata']) {
    if (key in item) console.log(`\n${key}:`, JSON.stringify(item[key], null, 2).slice(0, 500));
  }

  console.log('\n--- text (length:', typeof item.text === 'string' ? item.text.length : 'n/a', ') ---');
  console.log(typeof item.text === 'string' ? item.text.slice(0, 800) : item.text);

  console.log('\n--- markdown (length:', typeof item.markdown === 'string' ? item.markdown.length : 'n/a', ') ---');
  console.log(typeof item.markdown === 'string' ? item.markdown.slice(0, 800) : item.markdown);

  console.log('\n--- html (length:', typeof item.html === 'string' ? item.html.length : 'n/a', ') ---');
  console.log(typeof item.html === 'string' ? item.html.slice(0, 800) : item.html);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
