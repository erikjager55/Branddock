// =============================================================
// RSS-discoverer — detecteert + parse't een RSS/Atom-feed.
//
// Probeert 5 standaard feed-paden, valt terug op de homepage
// `<link rel="alternate">`. Parse't met cheerio (xmlMode) → RawItem[].
// RSS levert (anders dan sitemap) titels + datums gratis, dus deze bron
// heeft voorkeur waar beide hits geven. Hit-rate ~43% (A1-probe).
// =============================================================
import * as cheerio from "cheerio";
import { politeFetch } from "./fetch-policy";
import type { FetchFn, RawItem } from "./types";

const FEED_PATHS = ["/feed", "/rss", "/rss.xml", "/atom.xml", "/feed.xml"];

interface DiscoverOpts {
  fetchFn?: FetchFn;
  signal?: AbortSignal;
}

function orNull(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : null;
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

function looksLikeFeed(body: string): boolean {
  const head = body.trimStart().slice(0, 500).toLowerCase();
  return head.includes("<rss") || head.includes("<feed") || head.startsWith("<?xml");
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

async function findFeed(
  baseUrl: string,
  fetchFn: FetchFn,
  signal?: AbortSignal,
): Promise<{ url: string; body: string } | null> {
  const origin = new URL(baseUrl).origin;
  for (const path of FEED_PATHS) {
    const candidate = `${origin}${path}`;
    const body = await fetchText(fetchFn, candidate, signal);
    if (body && looksLikeFeed(body)) return { url: candidate, body };
  }
  // Fallback: homepage <link rel="alternate" type="application/rss+xml">
  const home = await fetchText(fetchFn, origin, signal);
  if (!home) return null;
  const href = cheerio
    .load(home)('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]')
    .first()
    .attr("href");
  const abs = href ? absolutize(href, origin) : null;
  if (!abs) return null;
  const body = await fetchText(fetchFn, abs, signal);
  return body && looksLikeFeed(body) ? { url: abs, body } : null;
}

function parseFeed(xml: string, origin: string): RawItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RawItem[] = [];
  // RSS 2.0 <item>
  $("item").each((_, el) => {
    const $el = $(el);
    const link = $el.find("link").first().text().trim() || $el.find("guid").first().text().trim();
    const url = link ? absolutize(link, origin) : null;
    if (!url) return;
    items.push({
      url,
      title: orNull($el.find("title").first().text()),
      publishedAt: parseDate($el.find("pubDate").first().text()),
      excerpt: orNull($el.find("description").first().text()),
      source: "RSS",
    });
  });
  // Atom <entry>
  $("entry").each((_, el) => {
    const $el = $(el);
    const href = $el.find('link[rel="alternate"]').attr("href") ?? $el.find("link").first().attr("href");
    const url = href ? absolutize(href, origin) : null;
    if (!url) return;
    items.push({
      url,
      title: orNull($el.find("title").first().text()),
      publishedAt: parseDate($el.find("published").first().text() || $el.find("updated").first().text()),
      excerpt: orNull($el.find("summary").first().text()),
      source: "RSS",
    });
  });
  return items;
}

/** Ontdek content-items via de competitor's RSS/Atom-feed. Lege array
 *  wanneer geen feed gevonden of parse faalt (never-throw). */
export async function discoverViaRss(baseUrl: string, opts?: DiscoverOpts): Promise<RawItem[]> {
  const fetchFn = opts?.fetchFn ?? politeFetch;
  try {
    const found = await findFeed(baseUrl, fetchFn, opts?.signal);
    if (!found) return [];
    return parseFeed(found.body, new URL(found.url).origin);
  } catch {
    return [];
  }
}
