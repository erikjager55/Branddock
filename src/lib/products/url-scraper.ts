// =============================================================
// Product URL Scraper — Lightweight text extraction from product pages
// =============================================================

import * as cheerio from 'cheerio';

export interface ScrapedProductData {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
}

/**
 * Scrape a URL and extract product-relevant text content.
 * Simplified version of brandstyle url-scraper — no CSS/fonts/logos extraction.
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedProductData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Branddock-ProductAnalyzer/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract metadata
  const title = $('title').first().text().trim() || null;
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;

  // Extract body text from headings and paragraphs
  $('script, style, nav, footer, noscript, iframe').remove();

  const parts: string[] = [];
  $('h1, h2, h3, h4, p, li, blockquote, figcaption, td, th, dt, dd').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 5) {
      parts.push(text);
    }
  });

  const bodyText = parts.join('\n').slice(0, 5000);

  return {
    url,
    title,
    description,
    bodyText,
  };
}
