import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

/**
 * POST /api/t — first-party, cookieloos meet-endpoint (P4 lp-page-analytics).
 *
 * PUBLIEK — géén auth, CORS-open en sendBeacon-vriendelijk: het artifact-
 * script stuurt een JSON-string via `navigator.sendBeacon` (text/plain →
 * geen preflight); `Request.json()` parset ongeacht content-type. Op
 * workspace-subdomeinen is dit zelfde-origin (`/api` is passthrough in de
 * host-router-middleware).
 *
 * Body: { p?: landingPageId, w: workspaceSlug, s: pageSlug, k: kind, r?: referrer }
 * De compiler kent het landingPageId niet (artifact is context-vrij), dus de
 * beacon stuurt workspaceSlug+slug uit `location` en dit endpoint resolvet.
 * Een meegegeven `p` wordt alleen vertrouwd als hij bij de workspace-slug
 * hoort (client-input — anders kan iedereen andermans stats vervuilen).
 *
 * AVG: géén cookies, géén IP-opslag, géén user-agent/fingerprint; de
 * referrer wordt geschoond tot origin+pad (querystrings kunnen PII dragen).
 * Onbekende pagina's → 204 zonder insert (geen probing-oracle, sendBeacon
 * leest de response toch niet).
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** Lichte per-IP-limiet — een pagina stuurt 1 view-event per load. */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const REFERRER_MAX_LENGTH = 300;

const eventSchema = z.object({
  p: z.string().min(1).max(64).optional(),
  w: z.string().min(1).max(80),
  s: z.string().min(1).max(120),
  k: z.enum(['view', 'form_submit', 'cta_click']),
  r: z.string().max(2048).optional(),
});

function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function OPTIONS(): NextResponse {
  return noContent();
}

/** AVG-schoning: referrer terugbrengen tot origin+pad (geen query/hash/PII). */
function scrubReferrer(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}${url.pathname}`.slice(0, REFERRER_MAX_LENGTH);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rate = await checkGenericRateLimit(`pageevent:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return new NextResponse(null, { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': '60' } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }
  const { p, w, s, k, r } = parsed.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: w.toLowerCase() },
      select: { id: true },
    });
    if (!workspace) return noContent();

    // p (landingPageId) alleen vertrouwen binnen de eigen workspace; anders
    // resolven via (workspaceId, slug) — de normale beacon-route.
    let page: { id: string; slug: string } | null = null;
    if (p) {
      page = await prisma.landingPage.findFirst({
        where: { id: p, workspaceId: workspace.id, status: 'PUBLISHED' },
        select: { id: true, slug: true },
      });
    }
    if (!page) {
      page = await prisma.landingPage.findFirst({
        where: { workspaceId: workspace.id, slug: s, status: 'PUBLISHED' },
        select: { id: true, slug: true },
      });
    }
    if (!page) return noContent();

    await prisma.pageEvent.create({
      data: {
        workspaceId: workspace.id,
        landingPageId: page.id,
        kind: k,
        path: `/${page.slug}`,
        referrer: scrubReferrer(r),
      },
    });
  } catch (err) {
    // Meting is nooit belangrijker dan de pagina — elke fout is een stille 204.
    console.warn('[api/t] event-insert faalde (genegeerd):', err instanceof Error ? err.message : err);
  }

  return noContent();
}
