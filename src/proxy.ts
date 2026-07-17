import { NextRequest, NextResponse } from 'next/server';
import { decideHostRoute } from '@/lib/landing-pages/host-router';
import {
  buildSecurityHeaders,
  buildReportOnlyCsp,
  REPORTING_ENDPOINTS_HEADER,
} from '@/lib/security/security-headers';

// ─── Security headers applied to ALL responses ───────────
// Waarden komen uit de gedeelde bron (security-headers.ts). Sinds de
// nonce-stap (audit-rest 2026-07-17) is de middleware de ENIGE laag die CSP
// zendt — next.config.ts levert alleen nog de CSP-loze statische headers.
const isProduction = process.env.NODE_ENV === 'production';

const SECURITY_HEADERS = buildSecurityHeaders(isProduction);

/**
 * Zet de volledige header-set op een response, inclusief (prod-only) de
 * Report-Only nonce-CSP. Elke return-tak van proxy() MOET hierdoor lopen,
 * anders bestaan er responses zonder policy.
 *
 * Bewust nog géén nonce-propagatie via de request-headers (de officiële
 * Next-stamping-route): een CSP-request-header met nonce kan pagina's naar
 * dynamic rendering forceren — dat hoort bij de enforce-flip-follow-up, niet
 * bij deze meet-fase. Report-Only blokkeert niets; Next-inline-scripts zonder
 * nonce verschijnen als bekende ruis in de rapporten.
 */
function applySecurityHeaders(headers: Headers, nonce: string): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  if (isProduction) {
    headers.set('Content-Security-Policy-Report-Only', buildReportOnlyCsp(nonce));
    headers.set('Reporting-Endpoints', REPORTING_ENDPOINTS_HEADER);
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

  // Per-request nonce voor de Report-Only-CSP (prod-only gebruikt).
  const nonce = btoa(crypto.randomUUID());

  // Web-page builder host-routing (ADR 2026-05-22-landing-page-builder-architectuur).
  // Runs first so <workspace>.branddock.app/<slug> rewrites to /p/<slug> before
  // any other logic. Security headers still applied to the rewritten response.
  const routeDecision = decideHostRoute(host, pathname);
  if (routeDecision.rewriteTo) {
    const rewriteUrl = request.nextUrl.clone();
    const [rewritePath, rewriteSearch] = routeDecision.rewriteTo.split('?');
    rewriteUrl.pathname = rewritePath;
    rewriteUrl.search = rewriteSearch ? `?${rewriteSearch}` : '';
    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    applySecurityHeaders(rewriteResponse.headers, nonce);
    return rewriteResponse;
  }

  // Start with a next() response so we can add headers
  const response = NextResponse.next();

  // Apply security headers to all responses
  applySecurityHeaders(response.headers, nonce);

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
      applySecurityHeaders(limited.headers, nonce);
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
