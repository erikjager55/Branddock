// =============================================================
// Content-discovery orchestrator.
//
// Pipeline (pre-transactie, async, never-throw): RSS + sitemap parallel
// → merge+dedup (RSS wint, heeft title+date) → dedup vs reeds-bekende
// urlHashes → truncate 25 meest-recente → format-classify → drop OTHER →
// theme-tag → bouw DiscoveredContentItem[] + NEW_*-activities.
//
// budgetMs (AbortSignal) bound de NETWERK-fase (RSS + sitemap-fetches);
// de twee Haiku-calls daarna hebben elk hun eigen 5s-timeout, dus de
// totale wall-time is ~budgetMs + 2×5s. Faalt altijd zacht naar
// {items:[], activities:[]} zodat een trage/kapotte competitor-site nooit
// een refresh in een 500 verandert (zelfde contract als de AI-classifier).
// (Async/cron-discovery die deze latency van het refresh-pad haalt = Fase 4.)
// =============================================================
import { ContentFormat } from "@prisma/client";
import { buildContentItemActivities } from "../diff-engine";
import type { DiscoveredContentItem, DiscoveryResult } from "../types";
import { classifyFormats, tagThemes } from "./content-classifier";
import { discoverViaRss } from "./rss-discoverer";
import { discoverViaSitemap } from "./sitemap-discoverer";
import { hashUrl } from "./fetch-policy";
import type { FetchFn, RawItem } from "./types";

const MAX_ITEMS = 25;
const DEFAULT_BUDGET_MS = 10_000;
const MAX_EXCERPT = 500;

/** Versie van deze discovery/classifier-pipeline. Bump bij een classifier-
 *  upgrade zodat re-discovery oude rijen (lagere versie) kan herkennen. */
export const DISCOVERER_VERSION = 1;

export interface DiscoverParams {
  websiteUrl: string;
  competitorId: string;
  workspaceId: string;
  /** urlHashes die al in CompetitorContentItem staan — bepaalt wat "nieuw" is. */
  existingUrlHashes: Set<string>;
  // Injectie voor tests (default = echte implementaties):
  fetchFn?: FetchFn;
  classifyFormatsFn?: typeof classifyFormats;
  tagThemesFn?: typeof tagThemes;
  budgetMs?: number;
}

function titleFromUrl(url: string): string {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    const words = decodeURIComponent(seg)
      .replace(/\.(html?|php|aspx)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled";
  } catch {
    return "Untitled";
  }
}

/** Merge RSS + sitemap op urlHash; RSS wint (heeft title + publishedAt). */
function mergeByHash(rss: RawItem[], sitemap: RawItem[]): RawItem[] {
  const byHash = new Map<string, RawItem>();
  for (const it of [...sitemap, ...rss]) byHash.set(hashUrl(it.url), it); // rss laatst → wint
  return [...byHash.values()];
}

function byRecency(a: RawItem, b: RawItem): number {
  return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
}

/** Map geclassificeerde RawItems → DiscoveredContentItem (titel-fallback uit
 *  slug, excerpt-truncatie, urlHash, producer-versie). */
function buildDiscoveredItems(
  classified: RawItem[],
  formatMap: Map<string, ContentFormat>,
  themeMap: Map<string, string[]>,
): DiscoveredContentItem[] {
  const items: DiscoveredContentItem[] = [];
  for (const i of classified) {
    const format = formatMap.get(i.url);
    if (format === undefined) continue; // reeds gefilterd; guard voor de types
    items.push({
      url: i.url,
      urlHash: hashUrl(i.url),
      title: i.title ?? titleFromUrl(i.url),
      excerpt: i.excerpt ? i.excerpt.slice(0, MAX_EXCERPT) : null,
      format,
      publishedAt: i.publishedAt,
      themes: themeMap.get(i.url) ?? [],
      language: null,
      signalSource: i.source,
      discovererVersion: DISCOVERER_VERSION,
    });
  }
  return items;
}

/** Ontdek + classificeer nieuwe content-items voor een competitor. */
export async function discoverCompetitorContent(params: DiscoverParams): Promise<DiscoveryResult> {
  const { websiteUrl, competitorId, workspaceId, existingUrlHashes } = params;
  const doFormats = params.classifyFormatsFn ?? classifyFormats;
  const doThemes = params.tagThemesFn ?? tagThemes;
  const empty: DiscoveryResult = { items: [], activities: [] };

  try {
    const signal = AbortSignal.timeout(params.budgetMs ?? DEFAULT_BUDGET_MS);
    const opts = { fetchFn: params.fetchFn, signal };
    const [rss, sitemap] = await Promise.all([
      discoverViaRss(websiteUrl, opts),
      discoverViaSitemap(websiteUrl, opts),
    ]);

    const fresh = mergeByHash(rss, sitemap)
      .filter((it) => !existingUrlHashes.has(hashUrl(it.url)))
      .sort(byRecency)
      .slice(0, MAX_ITEMS);
    if (fresh.length === 0) return empty;

    const ctx = { workspaceId, competitorId };
    const formatMap = await doFormats(fresh.map((i) => i.url), ctx);
    const classified = fresh.filter((i) => {
      const f = formatMap.get(i.url);
      return f !== undefined && f !== ContentFormat.OTHER;
    });
    if (classified.length === 0) return empty;

    const themeMap = await doThemes(
      classified.map((i) => ({ url: i.url, title: i.title })),
      ctx,
    );
    const items = buildDiscoveredItems(classified, formatMap, themeMap);
    return { items, activities: buildContentItemActivities(items) };
  } catch (err) {
    console.warn(
      `[content-discovery] discovery faalde voor ${websiteUrl}:`,
      err instanceof Error ? err.message : err,
    );
    return empty;
  }
}
