import { NextRequest, NextResponse } from 'next/server';

// ─── Security headers applied to ALL responses ───────────
const isProduction = process.env.NODE_ENV === 'production';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '0',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(isProduction
    ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
    : {}),
};

// ─── Auth route rate limiting (per IP, sliding window) ─────
// Protects /api/auth/* from brute-force login attempts.
// 10 requests per minute per IP address.

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX = 10;
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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Start with a next() response so we can add headers
  const response = NextResponse.next();

  // Apply security headers to all responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Auth route rate limiting (brute-force protection)
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkAuthRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            ...Object.fromEntries(
              Object.entries(SECURITY_HEADERS).map(([k, v]) => [k, v]),
            ),
            'Retry-After': '60',
          },
        },
      );
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
