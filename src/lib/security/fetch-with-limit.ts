// =============================================================
// Size-capped external fetch (9.6 H4 — OOM preventie)
//
// Used when downloading provider-generated AI artifacts (images,
// videos) before uploading them to our storage layer. Rejects
// responses whose Content-Length header exceeds the cap and does
// a post-download length check as defence-in-depth for providers
// that stream chunked without Content-Length.
// =============================================================

import { safeFetch } from '@/lib/utils/ssrf';

export const AI_IMAGE_SIZE_CAP = 25 * 1024 * 1024; // 25 MB
export const AI_VIDEO_SIZE_CAP = 500 * 1024 * 1024; // 500 MB

export class ResponseTooLargeError extends Error {
  constructor(actual: number, cap: number) {
    super(`Response exceeds size cap: ${actual} bytes > ${cap} bytes`);
    this.name = 'ResponseTooLargeError';
  }
}

/**
 * Fetch a URL into a Buffer, rejecting if the response size exceeds `maxBytes`.
 * Checks `Content-Length` first (cheap), then verifies post-download size.
 *
 * @throws Error on HTTP failure
 * @throws ResponseTooLargeError if size cap exceeded
 */
export async function fetchWithSizeLimit(
  url: string,
  maxBytes: number,
  init?: RequestInit,
): Promise<Buffer> {
  // safeFetch validates the entry URL AND every redirect hop before connecting
  // (the old `fetch` + post-hoc `assertSafeRedirect` left the entry URL itself
  // unvalidated and let a redirect fire against an internal host first). Matters
  // most for the user-supplied URL path (media/import-url). H1 / security-review.
  const response = await safeFetch(url, init);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new ResponseTooLargeError(contentLength, maxBytes);
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new ResponseTooLargeError(arrayBuffer.byteLength, maxBytes);
  }

  return Buffer.from(arrayBuffer);
}
