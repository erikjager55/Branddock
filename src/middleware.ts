import { NextRequest, NextResponse } from 'next/server';

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
  // Module overview lists
  {
    match: (p) =>
      p === '/api/personas' ||
      p === '/api/products' ||
      p === '/api/insights' ||
      p === '/api/knowledge-resources' ||
      p === '/api/alignment/issues' ||
      p === '/api/notifications' ||
      p === '/api/campaigns' ||
      p === '/api/knowledge',
    value: 'private, max-age=30, stale-while-revalidate=15',
  },
  // Detail pages (routes with IDs)
  {
    match: (p) =>
      p.startsWith('/api/') &&
      /\/[a-z0-9-]{8,}/.test(p) &&
      !p.includes('/generate') &&
      !p.includes('/regenerate'),
    value: 'private, max-age=60, stale-while-revalidate=30',
  },
];

export function middleware(request: NextRequest) {
  // Only add cache headers to API GET requests
  if (!request.nextUrl.pathname.startsWith('/api/') || request.method !== 'GET') {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Find matching cache rule
  for (const rule of cacheRules) {
    if (rule.match(pathname)) {
      const response = NextResponse.next();
      response.headers.set('Cache-Control', rule.value);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
