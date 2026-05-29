// =============================================================
// Content-discovery interne types.
//
// `RawItem` = een ontdekte content-URL vóór format-classificatie +
// theme-tagging. De discoverers (RSS/sitemap) produceren RawItems;
// de classifier + orchestrator zetten ze om naar DiscoveredContentItem
// (zie src/lib/competitors/types.ts) voor persistence.
// =============================================================

/** Een ruwe content-URL uit RSS of sitemap, vóór classificatie. */
export interface RawItem {
  url: string;
  /** Titel indien de bron die levert (RSS wel, sitemap meestal niet). */
  title: string | null;
  /** Publicatiedatum indien bekend (RSS pubDate / sitemap lastmod). */
  publishedAt: Date | null;
  /** Korte samenvatting indien de bron die levert (RSS description). */
  excerpt: string | null;
  /** Herkomst — bepaalt CompetitorContentItem.signalSource. */
  source: 'RSS' | 'WEBSCRAPE';
}

/**
 * Injecteerbare fetch — default `politeFetch`. Tests passeren een stub
 * die canned bodies per pad teruggeeft (SSRF-guard blokkeert localhost-
 * fixtureservers, dus injectie is de testbare weg — zelfde patroon als
 * `ClassifierFn` in computeDiffWithClassifier). Returnt null bij
 * fetch-fout / robots-block / niet-200.
 */
export type FetchFn = (
  url: string,
  opts?: { signal?: AbortSignal },
) => Promise<Response | null>;
