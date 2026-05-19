/**
 * Smoke-test voor `runScraperChain` — 3-step fallback voor competitor
 * URL-scraping (current → Apify → Gemini).
 *
 * Pure unit-style test via DI: mock-scrapers worden geïnjecteerd zodat
 * de chain-orchestratie verifieerbaar is zonder echte netwerk-IO of $-cost.
 * Real-world Apify-gedrag wordt apart gevalideerd via `scripts/probes/apify-*.ts`.
 *
 * 4 scenarios per task-file `tasks/competitor-scraping-apify-fallback.md`:
 *   (a) current succeeds → Apify NIET aangeroepen, Gemini NIET aangeroepen
 *   (b) current fails (te dun) → Apify rescues → Gemini NIET aangeroepen
 *   (c) current + Apify beide falen → Gemini aangeroepen
 *   (d) Apify throws → graceful door naar Gemini
 *
 * Run: npx tsx scripts/smoke-tests/apify-fallback-chain.ts
 */
import { runScraperChain, MIN_BODY_TEXT_CHARS } from '../../src/lib/scraping/scraper-chain';
import type { ScrapedProductData } from '../../src/lib/products/url-scraper';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function makeScraped(bodyTextLength: number, source: string): ScrapedProductData {
  return {
    url: 'https://example.com',
    title: `${source} title`,
    description: `${source} description`,
    bodyText: 'x'.repeat(bodyTextLength),
    images: [],
  };
}

interface CallCounter {
  current: number;
  apify: number;
  gemini: number;
}

function buildScrapers(
  counter: CallCounter,
  behavior: {
    current: 'succeed' | 'thin' | 'throw';
    apify: 'succeed' | 'thin' | 'throw';
    gemini: 'succeed' | 'throw';
  },
): {
  current: (url: string) => Promise<ScrapedProductData>;
  apify: (url: string) => Promise<ScrapedProductData>;
  gemini: (url: string) => Promise<ScrapedProductData>;
} {
  return {
    current: async () => {
      counter.current++;
      if (behavior.current === 'throw') throw new Error('mock current threw');
      return makeScraped(behavior.current === 'succeed' ? 8000 : 100, 'current');
    },
    apify: async () => {
      counter.apify++;
      if (behavior.apify === 'throw') throw new Error('mock apify threw');
      return makeScraped(behavior.apify === 'succeed' ? 3000 : 200, 'apify');
    },
    gemini: async () => {
      counter.gemini++;
      if (behavior.gemini === 'throw') throw new Error('mock gemini threw');
      return makeScraped(2000, 'gemini');
    },
  };
}

// ─── Scenarios ────────────────────────────────────────────

async function scenarioA(): Promise<void> {
  console.log('\n## (a) current succeeds — Apify + Gemini niet aangeroepen\n');
  const counter: CallCounter = { current: 0, apify: 0, gemini: 0 };
  const scrapers = buildScrapers(counter, { current: 'succeed', apify: 'succeed', gemini: 'succeed' });
  const { scraped, scraperUsed } = await runScraperChain('https://example.com', { scrapers });
  assert('scraperUsed = current', scraperUsed === 'current', `got ${scraperUsed}`);
  assert('current call-count = 1', counter.current === 1, `got ${counter.current}`);
  assert('apify NOT called', counter.apify === 0, `got ${counter.apify}`);
  assert('gemini NOT called', counter.gemini === 0, `got ${counter.gemini}`);
  assert(
    'bodyText > MIN threshold',
    scraped.bodyText.length >= MIN_BODY_TEXT_CHARS,
    `got ${scraped.bodyText.length}`,
  );
}

async function scenarioB(): Promise<void> {
  console.log('\n## (b) current returns thin → Apify rescues\n');
  const counter: CallCounter = { current: 0, apify: 0, gemini: 0 };
  const scrapers = buildScrapers(counter, { current: 'thin', apify: 'succeed', gemini: 'succeed' });
  const { scraped, scraperUsed } = await runScraperChain('https://example.com', { scrapers });
  assert('scraperUsed = apify', scraperUsed === 'apify', `got ${scraperUsed}`);
  assert('current called once', counter.current === 1);
  assert('apify called once', counter.apify === 1);
  assert('gemini NOT called', counter.gemini === 0);
  assert(
    'apify result returned',
    scraped.title === 'apify title',
    `got title=${scraped.title}`,
  );
}

async function scenarioC(): Promise<void> {
  console.log('\n## (c) current + apify both thin → Gemini takes over\n');
  const counter: CallCounter = { current: 0, apify: 0, gemini: 0 };
  const scrapers = buildScrapers(counter, { current: 'thin', apify: 'thin', gemini: 'succeed' });
  const { scraped, scraperUsed } = await runScraperChain('https://example.com', { scrapers });
  assert('scraperUsed = gemini', scraperUsed === 'gemini', `got ${scraperUsed}`);
  assert('all 3 scrapers called once', counter.current === 1 && counter.apify === 1 && counter.gemini === 1);
  assert('gemini result returned', scraped.title === 'gemini title');
}

async function scenarioD(): Promise<void> {
  console.log('\n## (d) Apify throws → graceful door naar Gemini\n');
  const counter: CallCounter = { current: 0, apify: 0, gemini: 0 };
  const scrapers = buildScrapers(counter, { current: 'thin', apify: 'throw', gemini: 'succeed' });
  const { scraped, scraperUsed } = await runScraperChain('https://example.com', { scrapers });
  assert('scraperUsed = gemini', scraperUsed === 'gemini', `got ${scraperUsed}`);
  assert('apify call attempted (counted)', counter.apify === 1);
  assert('gemini rescued the chain', scraped.title === 'gemini title');
}

async function scenarioE_AllFail(): Promise<void> {
  console.log('\n## (e) Alle 3 falen — best-so-far + scraperUsed reflectief\n');
  const counter: CallCounter = { current: 0, apify: 0, gemini: 0 };
  const scrapers = buildScrapers(counter, { current: 'thin', apify: 'thin', gemini: 'throw' });
  const { scraped, scraperUsed } = await runScraperChain('https://example.com', { scrapers });
  // current=100 chars, apify=200 chars → apify wins als best-so-far
  assert('scraperUsed reflects best source = apify', scraperUsed === 'apify', `got ${scraperUsed}`);
  assert('scraped is from apify (200 chars)', scraped.bodyText.length === 200, `got ${scraped.bodyText.length}`);
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Scraper-chain smoke — 5 scenarios via DI mocks');
  console.log('='.repeat(70));

  for (const [name, fn] of [
    ['a', scenarioA],
    ['b', scenarioB],
    ['c', scenarioC],
    ['d', scenarioD],
    ['e', scenarioE_AllFail],
  ] as const) {
    try {
      await fn();
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ scenario (${name}) threw: ${m}`);
      fail++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  console.log('='.repeat(70));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
