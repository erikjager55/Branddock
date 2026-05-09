/**
 * A1 validatie-probe voor competitor-content-item-discovery (idea-doc
 * `tasks/_drafts/idea-competitor-content-item-discovery.md`).
 *
 * Doel: meten welk percentage van bestaande ANALYZED competitors een
 * werkende RSS- of Atom-feed publiceert op een standaard URL-pad.
 * Output bepaalt of MVP-scope `RSS-first` haalbaar is (≥50% hit-rate)
 * of dat sitemap.xml-first scope-cut nodig is.
 *
 * Strategie per competitor:
 *   1. Probeer 5 standaard feed-paden (sequentieel, 1 req/sec):
 *      /feed /rss /rss.xml /atom.xml /feed.xml
 *   2. Als geen direct hit: fetch homepage en parse de eerste
 *      <link rel="alternate" type="application/rss+xml" href="..."> tag
 *   3. Voor elk gevonden pad: GET met 5s timeout, check Content-Type
 *      én body-prefix (<?xml / <rss / <feed) om false-positives
 *      (HTML 404 pagina's met Content-Type misleiding) uit te filteren.
 *
 * Output: per-competitor regel + summary met hit-rate.
 * Geen DB-mutaties, geen rate-limit issues (sequentieel + 1 req/sec).
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/probes/competitor-rss-hit-rate.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const FEED_PATHS = ['/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml'];
const FETCH_TIMEOUT_MS = 5000;
const REQUEST_DELAY_MS = 1000;
const USER_AGENT = 'Branddock-FeasibilityProbe/1.0 (https://branddock.com)';

interface Result {
  name: string;
  websiteUrl: string;
  rssFound: boolean;
  path: string | null;
  source: 'standard-path' | 'homepage-link' | null;
  reason: string | null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeFeedBody(body: string): boolean {
  const trimmed = body.trimStart().slice(0, 200).toLowerCase();
  if (trimmed.startsWith('<?xml')) return true;
  if (trimmed.startsWith('<rss')) return true;
  if (trimmed.startsWith('<feed')) return true;
  if (trimmed.includes('<rss') && trimmed.indexOf('<rss') < 100) return true;
  if (trimmed.includes('<feed') && trimmed.indexOf('<feed') < 100) return true;
  return false;
}

function looksLikeFeedContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return (
    lower.includes('rss') ||
    lower.includes('atom') ||
    lower.includes('application/xml') ||
    lower.includes('text/xml')
  );
}

async function isWorkingFeed(url: string): Promise<boolean> {
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return false;
  const contentType = res.headers.get('content-type');
  // Read at most ~5KB to determine if body is XML feed
  const reader = res.body?.getReader();
  if (!reader) return false;
  let body = '';
  let total = 0;
  try {
    while (total < 5000) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      total = body.length;
    }
  } catch {
    return false;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }
  // Body-prefix is meer betrouwbaar dan Content-Type — sommige sites
  // serveren feeds als text/html. Maar als beide kloppen → zeker hit.
  return looksLikeFeedBody(body) || looksLikeFeedContentType(contentType);
}

function normalizeBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

async function findFromHomepage(baseUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(baseUrl);
  if (!res || !res.ok) return null;
  let html = '';
  const reader = res.body?.getReader();
  if (!reader) return null;
  try {
    while (html.length < 50_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
    }
  } catch {
    return null;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }
  // Eenvoudige regex op <link rel=... type=application/rss+xml ... href=...>
  // Volgorde van rel/type/href varieert; we matchen elke link-tag met type
  // application/(rss|atom)+xml en pakken href.
  const linkPattern =
    /<link\b[^>]*?type=["'](application\/(?:rss|atom)\+xml|application\/xml|text\/xml)["'][^>]*?href=["']([^"']+)["'][^>]*>/gi;
  const altPattern =
    /<link\b[^>]*?href=["']([^"']+)["'][^>]*?type=["'](application\/(?:rss|atom)\+xml|application\/xml|text\/xml)["'][^>]*>/gi;

  const m1 = linkPattern.exec(html);
  if (m1) return resolveHref(m1[2], baseUrl);
  const m2 = altPattern.exec(html);
  if (m2) return resolveHref(m2[1], baseUrl);
  return null;
}

function resolveHref(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function probeCompetitor(
  name: string,
  websiteUrl: string,
): Promise<Result> {
  const base = normalizeBaseUrl(websiteUrl);
  if (!base) {
    return {
      name,
      websiteUrl,
      rssFound: false,
      path: null,
      source: null,
      reason: 'invalid-url',
    };
  }

  // Pad 1: standaard feed-paden
  for (const path of FEED_PATHS) {
    const candidate = `${base}${path}`;
    if (await isWorkingFeed(candidate)) {
      return {
        name,
        websiteUrl,
        rssFound: true,
        path: candidate,
        source: 'standard-path',
        reason: null,
      };
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // Pad 2: homepage-link parsing
  const homepageHref = await findFromHomepage(base);
  await sleep(REQUEST_DELAY_MS);
  if (homepageHref) {
    if (await isWorkingFeed(homepageHref)) {
      return {
        name,
        websiteUrl,
        rssFound: true,
        path: homepageHref,
        source: 'homepage-link',
        reason: null,
      };
    }
  }

  return {
    name,
    websiteUrl,
    rssFound: false,
    path: null,
    source: null,
    reason: 'no-feed-detected',
  };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const competitors = await prisma.competitor.findMany({
    where: { status: 'ANALYZED', websiteUrl: { not: null } },
    select: { name: true, websiteUrl: true },
    orderBy: { name: 'asc' },
  });

  console.log('='.repeat(72));
  console.log(`A1 RSS hit-rate probe — ${competitors.length} ANALYZED competitors`);
  console.log('='.repeat(72));
  console.log();

  const results: Result[] = [];
  let hits = 0;

  for (const c of competitors) {
    const url = c.websiteUrl;
    if (!url) continue;
    process.stdout.write(`  ${c.name.padEnd(30)} ${url.padEnd(45)} `);
    const result = await probeCompetitor(c.name, url);
    results.push(result);
    if (result.rssFound) {
      hits++;
      console.log(`✓ ${result.source === 'homepage-link' ? '(via homepage-link)' : ''} ${result.path}`);
    } else {
      console.log(`✗ ${result.reason}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log();
  console.log('='.repeat(72));
  const hitRate = competitors.length > 0 ? (hits / competitors.length) * 100 : 0;
  console.log(`Hits:        ${hits} / ${competitors.length}`);
  console.log(`Hit-rate:    ${hitRate.toFixed(1)}%`);
  console.log();

  // Categorisering per source
  const standard = results.filter((r) => r.source === 'standard-path').length;
  const homepage = results.filter((r) => r.source === 'homepage-link').length;
  console.log(`  via standard path:  ${standard}`);
  console.log(`  via homepage link:  ${homepage}`);
  console.log();

  // Beslis-output
  console.log('Verdict (per idea-doc A1 thresholds):');
  if (hitRate >= 70) {
    console.log('  ✓ RSS-first MVP scope BEVESTIGD (≥ 70% target hit)');
  } else if (hitRate >= 50) {
    console.log('  ⚠ RSS-first MVP scope is acceptabel (≥ 50%) maar sitemap-fallback verplicht');
  } else {
    console.log('  ✗ RSS-first niet haalbaar — scope-cut naar sitemap-first variant nodig');
  }
  console.log('='.repeat(72));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
