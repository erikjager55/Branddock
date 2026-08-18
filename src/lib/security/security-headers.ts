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
// Sinds de enforce-flip (2026-08-18) is `script-src` nonce-based met
// `'strict-dynamic'`; `'unsafe-inline'`/`'unsafe-eval'` zijn weg. De meting
// die dat onderbouwde staat in ADR 2026-08-18: over zes routes vuurde géén
// enkele eval-violation, en alle externe scripts zijn same-origin.
// =============================================================

/**
 * Gedeelde CSP-directives — alles behalve `script-src`, dat per scope wordt
 * samengesteld (zie `buildContentSecurityPolicy`).
 */
const SHARED_CSP_DIRECTIVES = [
  "default-src 'self'",
  // p.typekit.net: use.typekit.net/<kit>.css laadt hier zelf een tweede
  // stylesheet met de @font-face-regels vandaan. Zonder deze allow blijft
  // Halyard blokkeren en valt de site stil terug op Hanken Grotesk —
  // onopgemerkt tot productie-screenshot-verificatie (2026-07-16).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net",
  "font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net",
  // Permissive img-src: user-supplied URLs + AI-provider-previews landen in <img>
  "img-src 'self' data: blob: https:",
  // Externe AI-calls lopen server-side; de browser praat alleen met eigen API,
  // Stripe en PostHog. Twee PostHog-hosts: `eu.i.posthog.com` voor ingest en
  // `eu-assets.i.posthog.com` voor de remote-config die posthog-js bij init
  // ophaalt. Die tweede ontbrak; zolang NEXT_PUBLIC_POSTHOG_KEY niet op prod
  // staat bleef dat latent, maar lokaal mét key blokkeert de eigen CSP zowel
  // het config-script als de config-fetch (gemeten 2026-08-18).
  "connect-src 'self' https://api.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "frame-src 'self' https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

/**
 * Scope bepaalt uitsluitend of de landingspagina-hashes meedoen.
 *
 * `landing-page` = de publieke `/p/<workspace>/<slug>`-route (ook wanneer die
 * via een custom host wordt gerewrite). Die pagina serveert een **bevroren**
 * artifact: `compilePageArtifact` bakt `<script>…</script>` ín het opgeslagen
 * `compiledHtml`, gemint op publish-moment. Een per-request nonce bereikt die
 * bytes nooit — vandaar hashes.
 */
export type CspScope = 'app' | 'landing-page';

/**
 * SHA-256-hashes van de twee varianten die `buildPageRuntimeScriptBody`
 * (`src/lib/landing-pages/static-compile.ts`) kan opleveren: alleen de
 * view-beacon, en de view-beacon + form-enhancement.
 *
 * Bewust hier als constante en niet berekend: deze module draait in de
 * edge-middleware, waar `node:crypto` ontbreekt en `crypto.subtle` async is —
 * een hash per request zou de middleware async maken voor een waarde die per
 * build vaststaat. De drift-bewaking zit in `smoke:security-residual`: die
 * hercomputeert beide hashes uit de echte snippets en faalt zodra iemand het
 * script aanpast zonder deze lijst bij te werken.
 *
 * ⚠️ Wie het snippet wijzigt, maakt élk reeds gepubliceerd artifact
 * ongeldig — die dragen de OUDE bytes. Voeg bij zo'n wijziging de nieuwe hash
 * toe en laat de oude staan, of hermint de artifacts. De snippets zijn sinds
 * hun introductie (#251) niet gewijzigd, dus deze lijst dekt vandaag alles.
 */
export const LANDING_PAGE_SCRIPT_HASHES = [
  // buildPageRuntimeScriptBody({ withForms: false }) — 523 bytes
  "'sha256-tYBFfouyi4I8kwc0xd65GH3RzPdFPmUGL+umwhUqqDU='",
  // buildPageRuntimeScriptBody({ withForms: true }) — 1404 bytes
  "'sha256-/WgBxJZg2hd9vDwYrpZCtrV7NFWsPTSUyqyW0936fFA='",
] as const;

/**
 * De volledige enforce-CSP voor één request.
 *
 * `script-src` is nonce-based met `'strict-dynamic'`. Dat laatste maakt
 * host-allowlists, `'self'` en `'unsafe-inline'` betekenisloos voor scripts —
 * vertrouwen propageert alleen nog via de nonce naar wat een vertrouwd script
 * zelf inlaadt. Nonce- én hash-bronnen blijven wél gelden; daarop rust de
 * landingspagina-tak.
 */
export function buildContentSecurityPolicy(opts: { scope: CspScope; nonce: string }): string {
  const scriptSrc = [
    `'nonce-${opts.nonce}'`,
    "'strict-dynamic'",
    ...(opts.scope === 'landing-page' ? LANDING_PAGE_SCRIPT_HASHES : []),
  ].join(' ');

  return [
    `script-src ${scriptSrc}`,
    ...SHARED_CSP_DIRECTIVES,
    // Enforce mét rapportage: de collector blijft data leveren, nu over
    // violations die daadwerkelijk geblokkeerd zijn.
    `report-uri ${CSP_REPORT_ENDPOINT}`,
    'report-to csp-endpoint',
  ].join('; ');
}

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
 * De volledige set security-headers voor één request, inclusief CSP.
 *
 * Prod voegt HSTS + de per-request nonce-CSP toe; dev blijft bij de
 * base-headers + minimale CSP (geen script-src, anders sneuvelt HMR/eval).
 * Dit is exclusief de bron voor de edge-middleware (`src/proxy.ts`) — de
 * statische `next.config.ts`-laag gebruikt `buildStaticSecurityHeaders`
 * (zónder CSP), omdat een tweede statische policy de nonce zou ondermijnen
 * (de browser enforce't de intersectie van beide policies).
 */
export function buildRequestSecurityHeaders(
  isProduction: boolean,
  opts: { scope: CspScope; nonce: string },
): Record<string, string> {
  if (!isProduction) {
    return {
      ...BASE_SECURITY_HEADERS,
      'Content-Security-Policy': DEV_CONTENT_SECURITY_POLICY,
    };
  }
  return {
    ...BASE_SECURITY_HEADERS,
    'Strict-Transport-Security': STRICT_TRANSPORT_SECURITY,
    'Content-Security-Policy': buildContentSecurityPolicy(opts),
    'Reporting-Endpoints': REPORTING_ENDPOINTS_HEADER,
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
 * Collector-route voor CSP-violations. De enforce-policy houdt `report-uri`
 * aan: ook ná de flip blijft er zicht op wat er geblokkeerd wordt — een
 * enforce zonder rapportage faalt stil, precies de klasse fout die deze
 * migratie moest voorkomen.
 */
export const CSP_REPORT_ENDPOINT = '/api/security/csp-report';

/** Reporting-Endpoints-header die `report-to csp-endpoint` laat werken (Chrome). */
export const REPORTING_ENDPOINTS_HEADER = `csp-endpoint="${CSP_REPORT_ENDPOINT}"`;
