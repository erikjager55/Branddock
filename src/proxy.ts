import { NextRequest, NextResponse } from 'next/server';
import { decideHostRoute } from '@/lib/landing-pages/host-router';
import {
  buildRequestSecurityHeaders,
  type CspScope,
} from '@/lib/security/security-headers';

// ─── Security headers applied to ALL responses ───────────
// Waarden komen uit de gedeelde bron (security-headers.ts). De middleware is
// de ENIGE laag die CSP zendt — next.config.ts levert alleen nog de CSP-loze
// statische headers, want een tweede statische policy zou de nonce
// ondermijnen (de browser enforce't de intersectie).
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Bepaalt de CSP-scope voor dit request.
 *
 * MOET op het pad ná host-rewrite draaien: `decideHostRoute` zet
 * `<workspace>.branddock.app/<slug>` om naar `/p/<workspace>/<slug>`. Een
 * check op de rauwe pathname geeft custom-domein-landingspagina's de
 * app-scope, en dan blokkeert de CSP precies het bevroren artifact-script dat
 * de hashes moesten dekken.
 *
 * Default is bewust `app` (de striktere kant): een nieuwe publieke route die
 * hier vergeten wordt verliest hooguit een inline-script dat ze nu niet heeft,
 * terwijl de omgekeerde default stil bescherming zou weggeven.
 */
function resolveCspScope(effectivePath: string): CspScope {
  return effectivePath.startsWith('/p/') ? 'landing-page' : 'app';
}

/**
 * Zet de volledige header-set op een response. Elke return-tak van proxy()
 * MOET hierdoor lopen, anders bestaan er responses zonder policy.
 */
function applySecurityHeaders(headers: Headers, csp: Record<string, string>): void {
  for (const [key, value] of Object.entries(csp)) {
    headers.set(key, value);
  }
}

// ─── Auth route rate limiting (per IP, sliding window) ─────
// Protects /api/auth/* from brute-force login attempts.
// 10 requests per minute per IP address.
//
// Env-override AUTH_RATE_LIMIT_MAX bestaat voor de e2e-suite (gotcha
// 2026-07-17); zelfde knop als Better Auth customRules + het per-email-bucket
// (auth-rate-limiter.ts). Prod-gated: in productie geldt altijd de strikte
// default — een verdwaalde env-var mag de verdediging niet stil verruimen.
// Lokale duplicatie van de helper: dit is edge-middleware, imports minimaal.
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const parsedAuthMax = Number(process.env.AUTH_RATE_LIMIT_MAX);
const AUTH_RATE_LIMIT_MAX =
  !isProduction && Number.isFinite(parsedAuthMax) && parsedAuthMax > 0
    ? parsedAuthMax
    : 10;
const authRateLimitStore = new Map<string, number[]>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - AUTH_RATE_LIMIT_WINDOW_MS;
  const timestamps = (authRateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= AUTH_RATE_LIMIT_MAX) {
    authRateLimitStore.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  authRateLimitStore.set(ip, timestamps);
  return true;
}

// ─── Cache-Control header rules for API routes ─────────────
// Only applied to GET requests; mutations get no cache headers.

interface CacheRule {
  match: (pathname: string) => boolean;
  value: string;
}

const cacheRules: CacheRule[] = [
  // Static reference data (types, categories, providers, quick-actions)
  {
    match: (p) =>
      p.endsWith('/types') ||
      p.endsWith('/categories') ||
      p.endsWith('/providers') ||
      p === '/api/search/quick-actions',
    value: 'public, s-maxage=300, stale-while-revalidate=60',
  },
  // AI / streaming — never cache
  {
    match: (p) =>
      p.startsWith('/api/ai/') ||
      p.includes('/generate') ||
      p.includes('/regenerate') ||
      p.includes('/completion'),
    value: 'no-store',
  },
  // Dashboard endpoints
  {
    match: (p) => p.startsWith('/api/dashboard'),
    value: 'private, max-age=60, stale-while-revalidate=30',
  },
  // Module overview lists — no browser cache (server-side + TanStack Query handle caching;
  // browser max-age causes stale data after mutations like delete)
  {
    match: (p) =>
      p === '/api/personas' ||
      p === '/api/products' ||
      p === '/api/trend-radar' ||
      p === '/api/knowledge-resources' ||
      p === '/api/alignment/issues' ||
      p === '/api/notifications' ||
      p === '/api/campaigns' ||
      p === '/api/knowledge',
    value: 'private, no-cache',
  },
  // Detail pages (routes with IDs) — no browser cache for mutable data
  {
    match: (p) =>
      p.startsWith('/api/') &&
      /\/[a-z0-9-]{8,}/.test(p) &&
      !p.includes('/generate') &&
      !p.includes('/regenerate'),
    value: 'private, no-cache',
  },
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? '';

  // Per-request nonce. De scope wordt pas ná de host-rewrite vastgesteld
  // (zie resolveCspScope), dus de headers worden per return-tak gebouwd.
  const nonce = btoa(crypto.randomUUID());

  /**
   * Bouwt de header-set voor een gegeven effectief pad, en propageert de
   * nonce naar Next via de REQUEST-headers. Next leest de nonce uit de
   * `Content-Security-Policy`-request-header en stempelt hem op zijn eigen
   * script-tags; zonder die propagatie blijft élk Next-script ongenonced en
   * blokkeert de enforce-policy de hele pagina.
   */
  const headersFor = (effectivePath: string) => {
    const csp = buildRequestSecurityHeaders(isProduction, {
      scope: resolveCspScope(effectivePath),
      nonce,
    });
    const requestHeaders = new Headers(request.headers);
    if (isProduction) {
      requestHeaders.set('x-nonce', nonce);
      requestHeaders.set('Content-Security-Policy', csp['Content-Security-Policy']);
    }
    return { csp, requestHeaders };
  };

  // Legacy publieke vorm `/p/<slug>?workspace=<ws>` → 308 naar de canonieke
  // pad-param-route `/p/<ws>/<slug>` (P0 ISR-fix). Dit MOET hier in de proxy:
  // als App-Router-route kan de shim niet bestaan — sibling-segmenten met
  // verschillende namen ('slug' naast 'workspace') laten `next dev` weigeren
  // te starten ("You cannot use different slug names for the same dynamic
  // path"), ook al accepteert de productie-build ze. Zonder workspace-query
  // valt het pad door naar de router → 404 (zelfde gedrag als de oude shim).
  const legacyPublicMatch = pathname.match(/^\/p\/([^/]+)\/?$/);
  if (legacyPublicMatch) {
    const workspace = request.nextUrl.searchParams.get('workspace');
    if (workspace) {
      const redirectUrl = request.nextUrl.clone();
      // Segment rauw doorzetten (behoudt bestaande percent-encoding);
      // utm-achtige query-params blijven mee, alleen `workspace` vervalt.
      redirectUrl.pathname = `/p/${encodeURIComponent(workspace)}/${legacyPublicMatch[1]}`;
      redirectUrl.searchParams.delete('workspace');
      const redirectResponse = NextResponse.redirect(redirectUrl, 308);
      // Redirect rendert geen HTML — alleen response-headers, geen propagatie.
      applySecurityHeaders(redirectResponse.headers, headersFor(redirectUrl.pathname).csp);
      return redirectResponse;
    }
  }

  // Web-page builder host-routing (ADR 2026-05-22-landing-page-builder-architectuur).
  // Runs first so <workspace>.branddock.app/<slug> rewrites to /p/<slug> before
  // any other logic. Security headers still applied to the rewritten response.
  const routeDecision = decideHostRoute(host, pathname);
  if (routeDecision.rewriteTo) {
    const rewriteUrl = request.nextUrl.clone();
    const [rewritePath, rewriteSearch] = routeDecision.rewriteTo.split('?');
    rewriteUrl.pathname = rewritePath;
    rewriteUrl.search = rewriteSearch ? `?${rewriteSearch}` : '';
    // Scope op het REWRITE-doel: een custom host serveert /p/<ws>/<slug>.
    const { csp, requestHeaders } = headersFor(rewritePath);
    const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    applySecurityHeaders(rewriteResponse.headers, csp);
    return rewriteResponse;
  }

  // Start with a next() response so we can add headers
  const { csp, requestHeaders } = headersFor(pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Apply security headers to all responses
  applySecurityHeaders(response.headers, csp);

  // Auth route rate limiting (brute-force protection)
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkAuthRateLimit(ip)) {
      const limited = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
      applySecurityHeaders(limited.headers, csp);
      return limited;
    }
  }

  // Apply cache-control rules to API GET requests
  if (pathname.startsWith('/api/') && request.method === 'GET') {
    for (const rule of cacheRules) {
      if (rule.match(pathname)) {
        response.headers.set('Cache-Control', rule.value);
        return response;
      }
    }
  }

  return response;
}

export const config = {
  // Match all routes except static assets
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
