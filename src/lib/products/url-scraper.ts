// =============================================================
// Product URL Scraper — Lightweight text + image extraction from product pages
// =============================================================

import * as cheerio from 'cheerio';

export interface ScrapedImage {
  url: string;
  alt: string | null;
  context: 'og-image' | 'product' | 'general';
}

export interface ScrapedProductData {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  images: ScrapedImage[];
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

/** Resolve a potentially relative URL to an absolute URL */
function resolveUrl(src: string, baseUrl: string): string | null {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

/** Check if a URL points to a likely tracking pixel or tiny spacer */
function isTrackingPixel(src: string): boolean {
  const lower = src.toLowerCase();
  return (
    lower.includes('pixel') ||
    lower.includes('tracking') ||
    lower.includes('beacon') ||
    lower.includes('spacer') ||
    lower.includes('1x1') ||
    lower.includes('blank.gif')
  );
}

/** Try to add an image to the collection, deduplicating by URL */
function addImage(
  images: ScrapedImage[],
  seen: Set<string>,
  url: string,
  alt: string | null,
  context: ScrapedImage['context'],
  maxImages: number = 20,
): boolean {
  if (images.length >= maxImages) return false;
  if (seen.has(url)) return false;

  try {
    const parsed = new URL(url);
    if (isPrivateHostname(parsed.hostname)) return false;
  } catch {
    return false;
  }

  seen.add(url);
  images.push({ url, alt, context });
  return true;
}

/** Pick the highest-resolution URL from a srcset attribute */
function bestFromSrcset(srcset: string, baseUrl: string): string | null {
  let best: { url: string; size: number } | null = null;
  for (const candidate of srcset.split(',')) {
    const parts = candidate.trim().split(/\s+/);
    if (parts.length === 0) continue;
    const resolved = resolveUrl(parts[0], baseUrl);
    if (!resolved || resolved.startsWith('data:')) continue;
    const descriptor = parts[1] ?? '';
    const size = parseFloat(descriptor) || 0;
    if (!best || size > best.size) {
      best = { url: resolved, size };
    }
  }
  return best?.url ?? null;
}

/**
 * Find product-relevant images from a parsed HTML page.
 * Pattern inspired by brandstyle url-scraper findLogoUrls.
 */
function findProductImages(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): ScrapedImage[] {
  const seen = new Set<string>();
  const images: ScrapedImage[] = [];
  const MAX_IMAGES = 20;

  // 1. OG image (always first if present)
  const ogImage =
    $('meta[property="og:image"]').attr('content') ??
    $('meta[name="twitter:image"]').attr('content');
  if (ogImage) {
    const resolved = resolveUrl(ogImage, baseUrl);
    if (resolved) {
      addImage(images, seen, resolved,
        $('meta[property="og:image:alt"]').attr('content') ?? null,
        'og-image', MAX_IMAGES);
    }
  }

  // 2. JSON-LD structured data (Product, ImageObject)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false;
    try {
      const data = JSON.parse($(el).html() ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Direct image property
        const imgProp = item.image ?? item.thumbnailUrl;
        if (imgProp) {
          const urls = Array.isArray(imgProp) ? imgProp : [imgProp];
          for (const u of urls) {
            const src = typeof u === 'string' ? u : u?.url;
            if (src) {
              const resolved = resolveUrl(src, baseUrl);
              if (resolved) addImage(images, seen, resolved, item.name ?? null, 'product', MAX_IMAGES);
            }
          }
        }
        // @graph array (common in e-commerce sites)
        if (Array.isArray(item['@graph'])) {
          for (const node of item['@graph']) {
            const nodeImg = node.image ?? node.thumbnailUrl;
            if (nodeImg) {
              const urls = Array.isArray(nodeImg) ? nodeImg : [nodeImg];
              for (const u of urls) {
                const src = typeof u === 'string' ? u : u?.url;
                if (src) {
                  const resolved = resolveUrl(src, baseUrl);
                  if (resolved) addImage(images, seen, resolved, node.name ?? null, 'product', MAX_IMAGES);
                }
              }
            }
          }
        }
      }
    } catch {
      // Invalid JSON — skip
    }
  });

  // 3. <picture> / <source> elements
  $('picture').each((_, pictureEl) => {
    if (images.length >= MAX_IMAGES) return false;

    // Prefer highest-quality <source> with srcset
    let bestUrl: string | null = null;
    $(pictureEl).find('source').each((__, sourceEl) => {
      const srcset = $(sourceEl).attr('srcset');
      if (srcset) {
        const candidate = bestFromSrcset(srcset, baseUrl);
        if (candidate) bestUrl = candidate;
      }
    });

    // Fall back to the <img> inside <picture>
    if (!bestUrl) {
      const img = $(pictureEl).find('img').first();
      const srcset = img.attr('srcset');
      if (srcset) bestUrl = bestFromSrcset(srcset, baseUrl);
      if (!bestUrl) {
        const src = img.attr('src') ?? img.attr('data-src');
        if (src && !src.startsWith('data:')) bestUrl = resolveUrl(src, baseUrl);
      }
    }

    if (bestUrl) {
      const alt = $(pictureEl).find('img').first().attr('alt')?.trim() || null;
      addImage(images, seen, bestUrl, alt, 'product', MAX_IMAGES);
    }
  });

  // 4. <img> tags — filter out noise
  $('img').each((_, el) => {
    if (images.length >= MAX_IMAGES) return false;

    // Try srcset first for higher resolution
    const srcset = $(el).attr('srcset') ?? $(el).attr('data-srcset');
    let src: string | null = null;
    if (srcset) {
      src = bestFromSrcset(srcset, baseUrl);
    }
    if (!src) {
      const rawSrc = $(el).attr('src')
        ?? $(el).attr('data-src')
        ?? $(el).attr('data-lazy-src')
        ?? $(el).attr('data-original')
        ?? $(el).attr('data-image-src');
      if (rawSrc && !rawSrc.startsWith('data:')) {
        src = resolveUrl(rawSrc, baseUrl);
      }
    }
    if (!src) return;

    // Skip tracking pixels
    if (isTrackingPixel(src)) return;

    // Skip tiny images (width/height attributes)
    const width = parseInt($(el).attr('width') ?? '0', 10);
    const height = parseInt($(el).attr('height') ?? '0', 10);
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;

    const alt = $(el).attr('alt')?.trim() || null;
    const className = $(el).attr('class') ?? '';
    const parentClass = $(el).parent().attr('class') ?? '';
    const allText = `${alt ?? ''} ${src} ${className} ${parentClass}`.toLowerCase();

    // Heuristic: determine if image is product-related
    const productKeywords = ['product', 'hero', 'featured', 'gallery', 'main-image', 'primary'];
    const isProduct = productKeywords.some((kw) => allText.includes(kw));

    addImage(images, seen, src, alt, isProduct ? 'product' : 'general', MAX_IMAGES);
  });

  return images;
}

/**
 * Scrape a URL and extract product-relevant text content + images.
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

  // Check for SSRF after redirect — fetch may have followed a redirect to a private IP
  if (response.url !== url) {
    try {
      const redirectedParsed = new URL(response.url);
      if (isPrivateHostname(redirectedParsed.hostname)) {
        throw new Error('URL redirected to a private or internal network');
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('private')) throw e;
      // Ignore URL parse errors — will fail on content-type check below
    }
  }

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

  // Extract images BEFORE removing elements
  const images = findProductImages($, url);

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
    images,
  };
}
