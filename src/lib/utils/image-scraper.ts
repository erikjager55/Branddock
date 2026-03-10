// =============================================================
// Shared Image Scraping Helpers
// Reusable utilities for extracting images from HTML pages.
// Used by both brandstyle and product scrapers.
// =============================================================

import { isPrivateHostname } from './ssrf';

/** Check if a URL points to a likely tracking pixel or tiny spacer */
export function isTrackingPixel(src: string): boolean {
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

/** Resolve a potentially relative URL to an absolute URL */
export function resolveImageUrl(src: string, baseUrl: string): string | null {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

/** Pick the highest-resolution URL from a srcset attribute */
export function bestFromSrcset(srcset: string, baseUrl: string): string | null {
  let best: { url: string; size: number } | null = null;
  for (const candidate of srcset.split(',')) {
    const parts = candidate.trim().split(/\s+/);
    if (parts.length === 0) continue;
    const resolved = resolveImageUrl(parts[0], baseUrl);
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
 * Try to add an image to a collection, deduplicating by URL and checking SSRF.
 * Returns true if the image was added.
 */
export function addImageSafe(
  images: Array<{ url: string; alt: string | null; context: string }>,
  seen: Set<string>,
  url: string,
  alt: string | null,
  context: string,
  maxImages: number,
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
