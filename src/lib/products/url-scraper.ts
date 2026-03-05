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

/** Block internal/private IPs to prevent SSRF attacks */
function isPrivateHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  // AWS metadata endpoint
  if (hostname === '169.254.169.254') return true;
  // Private IP ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

/**
 * Scrape a URL and extract product-relevant text content.
 * Simplified version of brandstyle url-scraper — no CSS/fonts/logos extraction.
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedProductData> {
  const parsed = new URL(url);
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('URLs pointing to private or internal networks are not allowed');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Branddock-ProductAnalyzer/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('URL does not return HTML content');
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
