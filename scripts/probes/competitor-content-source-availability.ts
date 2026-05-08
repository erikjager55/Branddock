/**
 * A2 + bonus validatie-probe voor competitor-content-item-discovery
 * (idea-doc `tasks/_drafts/idea-competitor-content-item-discovery.md`).
 *
 * Test in één run alle drie content-discovery bronnen per competitor:
 *
 *   1. **Sitemap.xml** (primaire MVP-bron na A1 scope-cut)
 *      - probeer 4 standaard sitemap-paden + parse robots.txt voor
 *        `Sitemap:` directives
 *      - validatie: response is parsebaar XML met <urlset> of <sitemapindex>
 *      - bonus-meting: tel content-URLs in sitemap (filter op blog/news/case)
 *
 *   2. **RSS** (secundaire fallback — hergebruikt A1-logica)
 *      - probeer 5 standaard feed-paden + homepage <link rel="alternate">
 *
 *   3. **HTML-paths** (tertiaire fallback voor sites zonder beide)
 *      - probeer /blog, /news, /insights, /case-studies — alleen status 200
 *
 * Output: per-competitor regel + summary met combined coverage rate.
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/probes/competitor-content-source-availability.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/wp-sitemap.xml',
];
const RSS_PATHS = ['/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml'];
const HTML_PATHS = [
  '/blog',
  '/blog/',
  '/news',
  '/news/',
  '/insights',
  '/case-studies',
  '/cases',
];
const FETCH_TIMEOUT_MS = 5000;
const REQUEST_DELAY_MS = 800;
const USER_AGENT = 'Branddock-FeasibilityProbe/1.0 (https://branddock.com)';

interface SourceResult {
  found: boolean;
  path: string | null;
  detail?: string;
}

interface CombinedResult {
  name: string;
  websiteUrl: string;
  sitemap: SourceResult;
  rss: SourceResult;
  html: SourceResult;
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

async function readBody(res: Response, maxBytes = 50_000): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  let body = '';
  try {
    while (body.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
    }
  } catch {
    // ignore
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }
  return body;
}

function normalizeBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

// ─── Sitemap detection ────────────────────────────────

async function isWorkingSitemap(url: string): Promise<{
  ok: boolean;
  contentUrls: number;
}> {
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return { ok: false, contentUrls: 0 };
  const body = await readBody(res);
  const trimmed = body.trimStart().slice(0, 200).toLowerCase();
  const isXml =
    trimmed.startsWith('<?xml') ||
    trimmed.includes('<urlset') ||
    trimmed.includes('<sitemapindex');
  if (!isXml) return { ok: false, contentUrls: 0 };
  // Tel <loc>-tags die naar blog/news/case/insight URLs verwijzen.
  const locMatches = body.match(/<loc>([^<]+)<\/loc>/gi) ?? [];
  const contentUrls = locMatches.filter((m) =>
    /\/(blog|news|press|insight|article|case|stor[iy]|nieuws)/i.test(m),
  ).length;
  return { ok: true, contentUrls };
}

async function findSitemapsViaRobots(baseUrl: string): Promise<string[]> {
  const res = await fetchWithTimeout(`${baseUrl}/robots.txt`);
  if (!res || !res.ok) return [];
  const body = await readBody(res, 10_000);
  const sitemaps: string[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*Sitemap:\s*(.+?)\s*$/i);
    if (match) sitemaps.push(match[1]);
  }
  return sitemaps;
}

async function probeSitemap(baseUrl: string): Promise<SourceResult> {
  // Pad 1: robots.txt → Sitemap directive
  const fromRobots = await findSitemapsViaRobots(baseUrl);
  await sleep(REQUEST_DELAY_MS);
  for (const candidate of fromRobots) {
    const result = await isWorkingSitemap(candidate);
    if (result.ok) {
      return {
        found: true,
        path: candidate,
        detail: `via robots.txt, ${result.contentUrls} content URLs`,
      };
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // Pad 2: standaard sitemap-paden
  for (const path of SITEMAP_PATHS) {
    const candidate = `${baseUrl}${path}`;
    const result = await isWorkingSitemap(candidate);
    if (result.ok) {
      return {
        found: true,
        path: candidate,
        detail: `via standard path, ${result.contentUrls} content URLs`,
      };
    }
    await sleep(REQUEST_DELAY_MS);
  }

  return { found: false, path: null };
}

// ─── RSS detection (compact replay van A1) ────────────

function looksLikeFeedBody(body: string): boolean {
  const trimmed = body.trimStart().slice(0, 200).toLowerCase();
  return (
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<rss') ||
    trimmed.startsWith('<feed') ||
    trimmed.includes('<rss') ||
    trimmed.includes('<feed')
  );
}

async function isWorkingFeed(url: string): Promise<boolean> {
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return false;
  const body = await readBody(res);
  return looksLikeFeedBody(body);
}

async function probeRss(baseUrl: string): Promise<SourceResult> {
  for (const path of RSS_PATHS) {
    const candidate = `${baseUrl}${path}`;
    if (await isWorkingFeed(candidate)) {
      return { found: true, path: candidate };
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return { found: false, path: null };
}

// ─── HTML-path detection ──────────────────────────────

async function isWorkingHtmlPath(url: string): Promise<boolean> {
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return false;
  const body = await readBody(res, 5_000);
  // Heuristic: page is real content-listing als body bevat ≥3 links naar
  // child-paths onder hetzelfde subpad. Voorkomt false-positive op homepage
  // redirect die status 200 blijft.
  const lower = body.toLowerCase();
  if (lower.length < 500) return false; // te kort voor echte listing
  // Eenvoudige test: tel `<a href="..."` count
  const linkCount = (body.match(/<a\b[^>]*?href=/gi) ?? []).length;
  return linkCount >= 5;
}

async function probeHtml(baseUrl: string): Promise<SourceResult> {
  for (const path of HTML_PATHS) {
    const candidate = `${baseUrl}${path}`;
    if (await isWorkingHtmlPath(candidate)) {
      return { found: true, path: candidate };
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return { found: false, path: null };
}

// ─── Orchestration ────────────────────────────────────

async function probeCompetitor(
  name: string,
  websiteUrl: string,
): Promise<CombinedResult> {
  const base = normalizeBaseUrl(websiteUrl);
  if (!base) {
    return {
      name,
      websiteUrl,
      sitemap: { found: false, path: null, detail: 'invalid-url' },
      rss: { found: false, path: null, detail: 'invalid-url' },
      html: { found: false, path: null, detail: 'invalid-url' },
    };
  }
  const sitemap = await probeSitemap(base);
  await sleep(REQUEST_DELAY_MS);
  const rss = await probeRss(base);
  await sleep(REQUEST_DELAY_MS);
  const html = await probeHtml(base);
  return { name, websiteUrl, sitemap, rss, html };
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

  console.log('='.repeat(80));
  console.log(
    `A2 content-source availability probe — ${competitors.length} ANALYZED competitors`,
  );
  console.log('='.repeat(80));
  console.log();

  const results: CombinedResult[] = [];
  for (const c of competitors) {
    const url = c.websiteUrl;
    if (!url) continue;
    console.log(`\n  ${c.name} (${url})`);
    const result = await probeCompetitor(c.name, url);
    results.push(result);
    console.log(
      `    sitemap: ${result.sitemap.found ? '✓' : '✗'}  ${result.sitemap.path ?? ''}` +
        (result.sitemap.detail ? `  [${result.sitemap.detail}]` : ''),
    );
    console.log(
      `    rss:     ${result.rss.found ? '✓' : '✗'}  ${result.rss.path ?? ''}`,
    );
    console.log(
      `    html:    ${result.html.found ? '✓' : '✗'}  ${result.html.path ?? ''}`,
    );
    await sleep(REQUEST_DELAY_MS);
  }

  console.log();
  console.log('='.repeat(80));
  const total = competitors.length;
  const sitemapHits = results.filter((r) => r.sitemap.found).length;
  const rssHits = results.filter((r) => r.rss.found).length;
  const htmlHits = results.filter((r) => r.html.found).length;
  const anyHits = results.filter(
    (r) => r.sitemap.found || r.rss.found || r.html.found,
  ).length;
  const sitemapOrRss = results.filter(
    (r) => r.sitemap.found || r.rss.found,
  ).length;

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '-';

  console.log(`Total competitors:                  ${total}`);
  console.log();
  console.log(`Sitemap.xml hit:                    ${sitemapHits}/${total} (${pct(sitemapHits)})`);
  console.log(`RSS feed hit:                       ${rssHits}/${total} (${pct(rssHits)})`);
  console.log(`HTML content-path hit:              ${htmlHits}/${total} (${pct(htmlHits)})`);
  console.log();
  console.log(`Sitemap OR RSS coverage:            ${sitemapOrRss}/${total} (${pct(sitemapOrRss)})`);
  console.log(`Any source coverage:                ${anyHits}/${total} (${pct(anyHits)})`);
  console.log();
  console.log('Verdict per idea-doc thresholds:');
  if ((sitemapHits / total) >= 0.7) {
    console.log('  ✓ Sitemap-first MVP scope BEVESTIGD (≥ 70% sitemap.xml hit)');
  } else if ((sitemapOrRss / total) >= 0.85) {
    console.log('  ⚠ Sitemap-first scope acceptabel met RSS fallback (≥ 85% combined)');
  } else if ((anyHits / total) >= 0.85) {
    console.log('  ⚠ MVP haalbaar met sitemap+RSS+HTML fallback chain (≥ 85% any)');
  } else {
    console.log('  ✗ Pre-launch content-discovery NIET haalbaar — defer naar post-launch');
  }
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
