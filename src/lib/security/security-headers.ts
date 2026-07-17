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
  // p.typekit.net: use.typekit.net/<kit>.css laadt hier zelf een tweede
  // stylesheet met de @font-face-regels vandaan. Zonder deze allow blijft
  // Halyard blokkeren en valt de site stil terug op Hanken Grotesk —
  // onopgemerkt tot productie-screenshot-verificatie (2026-07-16).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net https://rsms.me",
  "font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net https://rsms.me",
  // Permissive img-src: user-supplied URLs + AI-provider-previews landen in <img>
  "img-src 'self' data: blob: https:",
  // Externe AI-calls lopen server-side; de browser praat alleen met eigen API,
  // Stripe en PostHog (posthog-js is npm-gebundeld → geen script-src-allow
  // nodig, maar de ingest-calls gaan naar eu.i.posthog.com; zonder deze allow
  // blokkeerde de eigen CSP alle analytics zodra NEXT_PUBLIC_POSTHOG_KEY staat).
  "connect-src 'self' https://api.stripe.com https://eu.i.posthog.com",
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
 * De volledige set security-headers voor een omgeving (inclusief CSP).
 * Prod voegt CSP + HSTS toe; dev blijft bij base-headers + minimale CSP.
 * Sinds de nonce-stap (audit-rest 2026-07-17) is dit exclusief de bron voor
 * de edge-middleware (`src/proxy.ts`) — de statische `next.config.ts`-laag
 * gebruikt `buildStaticSecurityHeaders` (zónder CSP), omdat een tweede
 * statische CSP de per-request nonce zou ondermijnen (browser enforce't de
 * intersectie van beide policies).
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

/**
 * Security-headers zónder CSP — voor de statische `next.config.ts`-laag.
 * De CSP komt per-request uit de middleware (nonce-ready); alle overige
 * headers blijven dubbel gezet als vangnet voor responses die de middleware
 * onverhoopt missen.
 */
export function buildStaticSecurityHeaders(isProduction: boolean): Record<string, string> {
  if (!isProduction) {
    return { ...BASE_SECURITY_HEADERS };
  }
  return {
    ...BASE_SECURITY_HEADERS,
    'Strict-Transport-Security': STRICT_TRANSPORT_SECURITY,
  };
}

/**
 * Report-Only nonce-CSP (stap 2 van de nonce-migratie, audit-rest 2026-07-17).
 *
 * Draait NAAST de enforce-policy en blokkeert niets: hij meet wat er zou
 * breken zodra script-src naar `'nonce-…' 'strict-dynamic'` gaat (Next-inline
 * bootstrap zonder nonce op statisch geprerenderde pagina's, eval-gebruikers,
 * niet-strict-dynamic loaders). Bewust zónder 'unsafe-eval': juist die
 * violations zijn de data voor de enforce-beslissing. De enforce-flip zelf is
 * een aparte follow-up, gated op prod-Report-Only-data.
 */
export const CSP_REPORT_ENDPOINT = '/api/security/csp-report';

export function buildReportOnlyCsp(nonce: string): string {
  return [
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "object-src 'none'",
    "base-uri 'self'",
    `report-uri ${CSP_REPORT_ENDPOINT}`,
    'report-to csp-endpoint',
  ].join('; ');
}

/** Reporting-Endpoints-header die `report-to csp-endpoint` laat werken (Chrome). */
export const REPORTING_ENDPOINTS_HEADER = `csp-endpoint="${CSP_REPORT_ENDPOINT}"`;
