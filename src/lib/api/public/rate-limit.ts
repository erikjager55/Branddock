// =============================================================
// Rate-limiting voor de PUBLIEKE Brand-API (audit 2026-07-23, fase 1b).
//
// De publieke API (/api/v1/*, /api/mcp) had géén rate-limiting: één key kon
// elke generatie-route platslaan (CRITICAL-1) en een ongeauthenticeerde flood
// op /api/mcp dwong per request een DB-lookup + Better-Auth-validatie af
// (CRITICAL-3, connection-pool-DoS). Deze helper hangt de bestaande
// sliding-window-limiter (checkGenericRateLimit — Redis-backed op prod,
// in-memory in dev) op dit oppervlak: per-workspace ná auth, per-IP vóór auth.
// =============================================================

import { NextResponse } from 'next/server';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

/** Requests per minuut per workspace over de hele publieke API. Genereren is
 *  traag, dus dit is ruim; het stopt een lus die de providers/queue verzadigt. */
const WORKSPACE_MAX = 120;
/** Requests per minuut per IP vóór auth — blunt de unauth-DB-flood op /api/mcp. */
const IP_MAX = 60;
const WINDOW_MS = 60_000;

function tooMany(resetAt: Date): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Per-workspace limiet op de geauthenticeerde publieke API (CRITICAL-1). */
export async function rateLimitWorkspace(workspaceId: string): Promise<NextResponse | null> {
  const r = await checkGenericRateLimit(`pubapi:ws:${workspaceId}`, WORKSPACE_MAX, WINDOW_MS);
  return r.allowed ? null : tooMany(r.resetAt);
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Per-IP limiet vóór de DB-auth — flood-bescherming op het unauth-pad (CRITICAL-3). */
export async function rateLimitIp(request: Request): Promise<NextResponse | null> {
  const r = await checkGenericRateLimit(`pubapi:ip:${clientIp(request)}`, IP_MAX, WINDOW_MS);
  return r.allowed ? null : tooMany(r.resetAt);
}
