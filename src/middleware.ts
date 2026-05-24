import { NextResponse, type NextRequest } from 'next/server';
import { decideHostRoute } from '@/lib/landing-pages/host-router';

/**
 * Next.js root middleware — routes published web-page subdomains
 * (<workspace>.branddock.app/<slug>) to the /p/[slug] public render-route.
 * The actual decision logic lives in `decideHostRoute` so it can be
 * smoke-tested without a Request object (see
 * scripts/smoke-tests/web-page-builder-phase4.ts).
 *
 * Apex + localhost + /api + /_next + /p/* are passthrough so the main app
 * shell + API routes + render-route remain reachable.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const decision = decideHostRoute(host, request.nextUrl.pathname);

  if (decision.rewriteTo) {
    const url = request.nextUrl.clone();
    const [pathname, search] = decision.rewriteTo.split('?');
    url.pathname = pathname;
    url.search = search ? `?${search}` : '';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
