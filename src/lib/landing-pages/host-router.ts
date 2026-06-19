/**
 * Pure host parser for the web-page builder middleware. Extracted from the
 * Next.js middleware so smoke-tests can exercise routing decisions without
 * spinning up a Request/Response.
 *
 * Routing rules (per ADR 2026-05-22-landing-page-builder-architectuur):
 *  - `branddock.app` / `www.branddock.app` / `localhost` → app-shell
 *    (no rewrite, request flows to the regular React SPA).
 *  - `<workspace>.branddock.app/<slug>` → /p/<slug>?workspace=<workspace>
 *    (rewritten, public render-route handles the lookup).
 *  - `*.lvh.me` mirrors the subdomain pattern for local subdomain testing
 *    (no /etc/hosts edits needed).
 *  - Custom domains (v2) come from DomainMapping lookups; out of scope here.
 *
 * Path-prefix exemptions: `/api`, `/_next`, `/p/*` (already a public-render
 * route — middleware should not rewrite recursively).
 */

export interface HostRouteDecision {
  /** When set, middleware should rewrite to this path (origin path replaced). */
  rewriteTo?: string;
  /** When set, middleware should pass through unchanged. */
  passthrough?: boolean;
}

const APEX_HOSTS = new Set(['branddock.app', 'www.branddock.app']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'lvh.me']);

const APEX_SUFFIXES = ['.branddock.app', '.lvh.me'];

// `/sitemap.xml`, `/robots.txt`, `/llms.txt` zijn per-workspace SEO/GEO-discovery
// route-handlers (GEO Fase 1a) die de Host-header zelf lezen — middleware mag ze
// NIET naar /p/ herschrijven, anders worden ze als slug behandeld → 404.
const EXEMPT_PATH_PREFIXES = [
  '/api',
  '/_next',
  '/p/',
  '/favicon',
  '/static',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
];

/**
 * Leidt de workspace-slug af uit een host: `<workspace>.branddock.app` →
 * `workspace`. Apex/www/localhost/onbekend → null (de app-shell, geen tenant).
 * Gedeeld met de SEO-discovery route-handlers zodat host-parsing één bron heeft.
 */
export function workspaceSlugFromHost(host: string): string | null {
  const normalizedHost = stripPort(host).toLowerCase();
  if (APEX_HOSTS.has(normalizedHost) || LOCAL_HOSTS.has(normalizedHost)) {
    return null;
  }
  const sub = APEX_SUFFIXES
    .map((suffix) => (normalizedHost.endsWith(suffix) ? normalizedHost.slice(0, -suffix.length) : null))
    .find((s): s is string => s !== null && s.length > 0 && !s.includes('.'));
  return sub ?? null;
}

export function decideHostRoute(host: string, path: string): HostRouteDecision {
  if (EXEMPT_PATH_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return { passthrough: true };
  }

  const subdomainMatch = workspaceSlugFromHost(host);
  if (!subdomainMatch) {
    return { passthrough: true };
  }

  const slug = path === '/' ? '' : path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!slug) {
    return { passthrough: true };
  }

  return {
    rewriteTo: `/p/${encodeURIComponent(slug)}?workspace=${encodeURIComponent(subdomainMatch)}`,
  };
}

function stripPort(host: string): string {
  const colon = host.indexOf(':');
  return colon === -1 ? host : host.slice(0, colon);
}
