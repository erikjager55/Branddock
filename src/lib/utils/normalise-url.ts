// =============================================================
// User-typed URL normaliser
//
// Used by every UI that asks the user for a website URL (Brandstyle Analyzer,
// Competitor Analyzer, Product Analyzer, Knowledge Library Smart Import). All
// of these previously rejected bare hostnames like "linfi.nl" because they
// passed the raw input straight to `new URL()` (which requires a protocol)
// or to backend Zod `.url()` validators.
//
// The canonical behaviour: trim whitespace, prepend https:// when no protocol
// is present, then validate via the URL constructor with a hostname sanity
// check. Returns the canonical URL string the caller should use for both UI
// echo (so the user sees what was submitted) and the backend request.
// =============================================================

/**
 * Normalise a user-typed URL string for submission.
 *
 *   "linfi.nl"            → "https://linfi.nl/"
 *   "www.linfi.nl"        → "https://www.linfi.nl/"
 *   "https://linfi.nl"    → "https://linfi.nl/"
 *   "http://linfi.nl"     → "http://linfi.nl/"  (preserves explicit http://)
 *   "linfi.nl/over-ons"   → "https://linfi.nl/over-ons"
 *   " linfi.nl "          → "https://linfi.nl/"
 *   ""                    → null
 *   "https://"            → null  (empty hostname)
 *   "foo"                 → null  (hostname has no dot — not a domain)
 *
 * @param input raw value from a text input field
 * @returns canonical URL string, or null if the input cannot be a valid URL
 */
export function normaliseUserUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    // Reject empty hostnames (e.g. "https://" alone) and hostnames without
    // a dot (e.g. "https://foo") — those are never real public websites.
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Default UI message when the input cannot be parsed as a URL. */
export const INVALID_URL_MESSAGE = "Please enter a valid URL (e.g., https://example.com)";
