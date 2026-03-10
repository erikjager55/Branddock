// =============================================================
// SSRF Protection — Shared utility for URL scraping
// Blocks requests to private/internal networks.
// =============================================================

/** Block internal/private IPs to prevent SSRF attacks */
export function isPrivateHostname(hostname: string): boolean {
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
 * Validate a URL is safe to fetch (not pointing to private networks).
 * Also checks post-redirect target for SSRF bypass attempts.
 */
export function assertSafeUrl(url: string): void {
  const parsed = new URL(url);
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('URLs pointing to private or internal networks are not allowed');
  }
}

/**
 * Check if a fetch response was redirected to a private IP (SSRF bypass).
 * Should be called after fetch() with redirect: 'follow'.
 */
export function assertSafeRedirect(originalUrl: string, responseUrl: string): void {
  if (responseUrl !== originalUrl) {
    try {
      const redirectedParsed = new URL(responseUrl);
      if (isPrivateHostname(redirectedParsed.hostname)) {
        throw new Error('URL redirected to a private or internal network');
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('private')) throw e;
    }
  }
}
