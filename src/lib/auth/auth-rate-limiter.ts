// =============================================================
// Auth Rate Limiter (C1 — brute-force + credential-stuffing)
//
// Wraps the generic sliding-window limiter with auth-specific
// limits and key namespaces. Covers per-email buckets; per-IP
// buckets are handled by Better Auth's native `rateLimit` config.
// =============================================================

import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

/**
 * Test-env-uitzondering (gotcha 2026-07-17): de e2e-suite logt in vanaf één
 * IP en met een handvol vaste e-mails — de strikte auth-limieten maakten
 * specs met veel logins deterministisch rood mid-suite. Een expliciete
 * `AUTH_RATE_LIMIT_MAX` (gezet door de Playwright-webServer) verruimt de
 * max; zonder env-var geldt overal de strikte default. Gedeeld door alle
 * drie de lagen: proxy-middleware, Better Auth customRules en dit
 * per-email-bucket.
 */
export function authRateLimitMax(defaultMax: number): number {
  const parsed = Number(process.env.AUTH_RATE_LIMIT_MAX);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMax;
}

const EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_MAX = authRateLimitMax(10);

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
