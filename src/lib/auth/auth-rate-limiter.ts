// =============================================================
// Auth Rate Limiter (C1 — brute-force + credential-stuffing)
//
// Wraps the generic sliding-window limiter with auth-specific
// limits and key namespaces. Covers per-email buckets; per-IP
// buckets are handled by Better Auth's native `rateLimit` config.
// =============================================================

import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

const EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_MAX = 10;

/**
 * Check per-email rate limit for sign-in / sign-up attempts.
 * Blocks credential-stuffing attacks where different IPs hammer one account.
 * Consumes a token on each call.
 */
export function checkAuthEmailRateLimit(email: string) {
  const normalized = email.toLowerCase().trim();
  return checkGenericRateLimit(
    `auth-email:${normalized}`,
    EMAIL_MAX,
    EMAIL_WINDOW_MS,
  );
}
