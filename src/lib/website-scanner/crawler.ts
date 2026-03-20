// =============================================================
// Website Crawler — Multi-page crawler with batched concurrency
// =============================================================

import { scrapeProductUrl, discoverInternalLinks, fetchAndParse } from '@/lib/products/url-scraper';
import { classifyAndPrioritize } from './page-classifier';
import type { CrawledPage, ScanProgress } from './types';

const MAX_PAGES = 15;
const CONCURRENCY = 3;
const CRAWL_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Crawl a website starting from the homepage.
 * Discovers internal links, classifies and prioritizes pages,
 * then scrapes up to MAX_PAGES with batched concurrency.
 */
export async function crawlWebsite(
  url: string,
  progress: ScanProgress,
): Promise<CrawledPage[]> {
  const startTime = Date.now();
  const pages: CrawledPage[] = [];

  // Phase 1: Scrape homepage and discover links
  progress.currentPage = url;
  const { $ } = await fetchAndParse(url);

  // Discover internal links from homepage
  const internalLinks = discoverInternalLinks($, url);
  progress.pagesDiscovered = internalLinks.length + 1; // +1 for homepage

  // Get homepage content using scrapeProductUrl
  try {
    const homepageData = await scrapeProductUrl(url);
    pages.push({
      url,
      title: homepageData.title,
      pageType: 'homepage',
      bodyText: homepageData.bodyText,
      images: homepageData.images,
    });
    progress.pagesCrawled = 1;
    progress.crawledPages.push({
      url,
      title: homepageData.title ?? 'Homepage',
      pageType: 'homepage',
    });
  } catch (err) {
    progress.errors.push(`Homepage scrape failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  if (progress.cancelled) return pages;

  // Phase 2: Classify and prioritize internal pages
  const prioritized = classifyAndPrioritize(internalLinks, MAX_PAGES - 1);
  progress.pagesDiscovered = prioritized.length + 1;

  // Phase 3: Scrape internal pages in batches of CONCURRENCY
  for (let i = 0; i < prioritized.length; i += CONCURRENCY) {
    if (progress.cancelled) break;
    if (Date.now() - startTime > CRAWL_TIMEOUT_MS) {
      progress.errors.push('Crawl timeout reached (2 minutes)');
      break;
    }

    const batch = prioritized.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ({ url: pageUrl, pageType }) => {
        progress.currentPage = pageUrl;
        const data = await scrapeProductUrl(pageUrl);
        return {
          url: pageUrl,
          title: data.title,
          pageType,
          bodyText: data.bodyText,
          images: data.images,
        } as CrawledPage;
      }),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        pages.push(result.value);
        progress.crawledPages.push({
          url: result.value.url,
          title: result.value.title ?? batch[j].pageType,
          pageType: result.value.pageType,
        });
      } else {
        progress.errors.push(`Failed to scrape ${batch[j].url}: ${result.reason?.message ?? 'Unknown error'}`);
      }
      progress.pagesCrawled = pages.length;
    }
  }

  progress.currentPage = null;
  return pages;
}
