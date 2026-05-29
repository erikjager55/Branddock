// =============================================================
// Sitemap-discoverer — parse't sitemap.xml → content-URLs.
//
// Bronnen: robots.txt `Sitemap:` directives + 4 standaard-paden.
// Ondersteunt `<sitemapindex>`-recursie (1 niveau, max 5 children).
// Filtert `<loc>` op content-paden (blog/news/press/case/…). Hit-rate
// ~71% (A2-probe) → de primaire bron (RSS is fallback-aanvulling).
//
// robots.txt wordt via de geïnjecteerde fetchFn opgehaald (niet via
// getRobots' rawFetch) zodat de smoke alle fetches kan stubben.
// =============================================================
import * as cheerio from "cheerio";
import { politeFetch, CONTENT_PATH_RE } from "./fetch-policy";
import type { FetchFn, RawItem } from "./types";

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/wp-sitemap.xml"];
const MAX_CHILD_SITEMAPS = 5;
const MAX_ITEMS = 200; // pre-truncatie cap; orchestrator trimt naar 25

interface DiscoverOpts {
  fetchFn?: FetchFn;
  signal?: AbortSignal;
}

function absolutize(href: string, origin: string): string | null {
  try {
    return new URL(href.trim(), origin).toString();
  } catch {
    return null;
  }
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchText(fetchFn: FetchFn, url: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetchFn(url, { signal });
  if (!res) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function isIndex(xml: string): boolean {
  return xml.slice(0, 1500).toLowerCase().includes("<sitemapindex");
}

function parseUrlset(xml: string, origin: string): RawItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RawItem[] = [];
  $("url").each((_, el) => {
    const $el = $(el);
    const loc = $el.find("loc").first().text().trim();
    if (!loc || !CONTENT_PATH_RE.test(loc)) return;
    const abs = absolutize(loc, origin);
    if (!abs) return;
    items.push({
      url: abs,
      title: null,
      publishedAt: parseDate($el.find("lastmod").first().text()),
      excerpt: null,
      source: "WEBSCRAPE",
    });
  });
  return items;
}

function parseIndexLocs(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const locs: string[] = [];
  $("sitemap > loc").each((_, el) => {
    const t = $(el).text().trim();
    if (t) locs.push(t);
  });
  return locs;
}

async function collectFromSitemap(
  url: string,
  fetchFn: FetchFn,
  origin: string,
  depth: number,
  signal?: AbortSignal,
): Promise<RawItem[]> {
  if (depth > 1) return []; // max 1 niveau index-recursie
  const body = await fetchText(fetchFn, url, signal);
  if (!body) return [];
  if (!isIndex(body)) return parseUrlset(body, origin);

  const out: RawItem[] = [];
  for (const child of parseIndexLocs(body).slice(0, MAX_CHILD_SITEMAPS)) {
    const abs = absolutize(child, origin);
    if (!abs) continue;
    out.push(...(await collectFromSitemap(abs, fetchFn, origin, depth + 1, signal)));
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

async function sitemapsFromRobots(origin: string, fetchFn: FetchFn, signal?: AbortSignal): Promise<string[]> {
  const body = await fetchText(fetchFn, `${origin}/robots.txt`, signal);
  if (!body) return [];
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*Sitemap:\s*(.+?)\s*$/i);
    if (m) out.push(m[1]);
  }
  return out;
}

/** Ontdek content-items via sitemap.xml. Lege array bij geen sitemap /
 *  parse-fout (never-throw). */
export async function discoverViaSitemap(baseUrl: string, opts?: DiscoverOpts): Promise<RawItem[]> {
  const fetchFn = opts?.fetchFn ?? politeFetch;
  try {
    const origin = new URL(baseUrl).origin;
    const fromRobots = await sitemapsFromRobots(origin, fetchFn, opts?.signal);
    const candidates = [...fromRobots, ...SITEMAP_PATHS.map((p) => `${origin}${p}`)];
    for (const candidate of candidates) {
      const abs = absolutize(candidate, origin);
      if (!abs) continue;
      const items = await collectFromSitemap(abs, fetchFn, origin, 0, opts?.signal);
      if (items.length > 0) return items.slice(0, MAX_ITEMS);
    }
    return [];
  } catch {
    return [];
  }
}
