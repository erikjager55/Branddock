import { NextResponse } from 'next/server';

// ─── In-memory cache store ─────────────────────────────────
// Uses globalThis to ensure a single shared Map across all Next.js
// route handler module instances (Turbopack may load modules multiple
// times, causing separate Map instances if declared at module scope).

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const globalKey = '__branddock_api_cache';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
const cache: Map<string, CacheEntry> = (g[globalKey] ??= new Map<string, CacheEntry>());

/**
 * Get a cached value by key.
 * Returns null if the key is missing or expired.
 */
export function getCached<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store a value in the cache with a TTL in milliseconds.
 */
export function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate all cache entries whose key starts with `prefix`.
 * Call after mutations to bust related caches.
 *
 * @example invalidateCache(`dashboard:${workspaceId}`)
 */
export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Return a cached NextResponse.json() if available, or null on cache miss.
 * Use in route handlers for inline caching:
 *
 * @example
 * const hit = cachedJson(key);
 * if (hit) return hit;
 */
export function cachedJson(key: string): NextResponse | null {
  const data = getCached(key);
  if (data !== null) {
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'HIT' },
    });
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>;

/**
 * HOC that wraps a Next.js route handler with server-side caching.
 * Only caches successful (2xx) responses.
 *
 * @example
 * const _GET = async () => NextResponse.json({ data: 'static' });
 * export const GET = withCache('static:my-key', CACHE_TTL.STATIC)(_GET);
 */
export function withCache(key: string, ttlMs: number) {
  return (handler: RouteHandler): RouteHandler => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any[]): Promise<NextResponse> => {
      const cached = getCached(key);
      if (cached !== null) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' },
        });
      }

      const response = await handler(...args);

      if (response.ok) {
        const cloned = response.clone();
        const data = await cloned.json();
        setCache(key, data, ttlMs);
      }

      return response;
    };
  };
}
