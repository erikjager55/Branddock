// =============================================================
// Canonieke security-headers — één bron-of-truth (audit-MINOR #348).
//
// De CSP + security-headers stonden vóór deze consolidatie in twéé
// bestanden (`src/proxy.ts` edge-middleware + `next.config.ts` headers()),
// met al gedivergeerde waarden: Permissions-Policy had `interest-cohort`
// alleen in next.config, HSTS max-age verschilde (31536000 vs 63072000).
// De browser enforce't de intersectie, dus de drift was latent — deze
// module haalt hem structureel weg: beide lagen importeren dezelfde
// constanten.
//
// De full CSP bevat bewust `'unsafe-inline'`/`'unsafe-eval'` in script-src
// (Next.js-runtime vereist ze); een nonce-based script-src is een grotere
// follow-up (bewust buiten scope, zie task-file).
// =============================================================

/** Full Content-Security-Policy — alleen in productie toegepast (dev: geen
 * CSP zodat Next HMR/eval blijft werken; X-Frame-Options: DENY dekt daar de
 * clickjacking-case). */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  // rsms.me: @puckeditor/core/dist/index.css @import't het Inter-font daar.
  // Zonder deze allow faalt de hele lazy CSS-chunk van de canvas op prod
  // (ChunkLoadError → ErrorBoundary bij "Open in Canvas"; incident 2026-07-16).
  // Dev heeft geen CSP, dus lokaal was dit onzichtbaar.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net https://rsms.me",
  "font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net https://rsms.me",
  // Permissive img-src: user-supplied URLs + AI-provider-previews landen in <img>
  "img-src 'self' data: blob: https:",
  // Externe AI-calls lopen server-side; de browser praat alleen met eigen API + Stripe
  "connect-src 'self' https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

/** HSTS — prod-only; 2 jaar + preload (was 1 jaar in proxy.ts vóór consolidatie). */
export const STRICT_TRANSPORT_SECURITY = 'max-age=63072000; includeSubDomains; preload';

/** Minimale CSP voor dev — geen script-src (zou Next HMR/eval breken), maar
 * wél base-uri/form-action/object-src/frame-ancestors zodat dev niet zwakker
 * is dan vóór de consolidatie (proxy.ts zette deze voorheen altijd-aan). */
export const DEV_CONTENT_SECURITY_POLICY =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

/** Headers die in élke omgeving worden gezet. */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '0',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

/**
 * De volledige set security-headers voor een omgeving. Prod voegt CSP + HSTS
 * toe; dev blijft bij de base-headers. Gebruikt door zowel de edge-middleware
 * (`src/proxy.ts`) als de statische `next.config.ts`-headers().
 */
export function buildSecurityHeaders(isProduction: boolean): Record<string, string> {
  if (!isProduction) {
    return {
      ...BASE_SECURITY_HEADERS,
      'Content-Security-Policy': DEV_CONTENT_SECURITY_POLICY,
    };
  }
  return {
    ...BASE_SECURITY_HEADERS,
    'Strict-Transport-Security': STRICT_TRANSPORT_SECURITY,
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  };
}
