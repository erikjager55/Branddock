// =============================================================
// POST /api/v1/score — publieke Brand-API: F-VAL-score op aangeleverde tekst.
//
// Zero-cost by design (beoordelen is gratis — de differentiator). Gebruikt
// exact dezelfde engine als de in-app content-review (external-content-
// runner), dus scores zijn 1-op-1 vergelijkbaar met de UI. De aangeleverde
// tekst wordt via de bestaande review-log persistentie bewaard zoals bij
// elke review-surface; de usage-log zelf blijft metadata-only.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runFidelityForExternalContent } from '@/lib/brand-fidelity/external-content-runner';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { rateLimitIp, rateLimitWorkspace } from '@/lib/api/public/rate-limit';
import { logApiCall } from '@/lib/api/public/usage';

// F-VAL-judge kan op lange content > 60s duren.
export const maxDuration = 120;

const bodySchema = z.object({
  content: z.string().min(50, 'content needs at least 50 characters for a meaningful score'),
});

export async function POST(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ipLimited = await rateLimitIp(request);
  if (ipLimited) return ipLimited;

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const wsLimited = await rateLimitWorkspace(auth.workspaceId);
  if (wsLimited) return wsLimited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const review = await runFidelityForExternalContent({
      workspaceId: auth.workspaceId,
      contentText: parsed.data.content,
      sourceType: 'paste',
    });
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'score_against_brand',
      authVia: 'api_key',
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      workspaceId: auth.workspaceId,
      reviewLogId: review.reviewLogId,
      findingsCount: review.findingsCount,
      result: review.result,
    });
  } catch (error) {
    console.error('[POST /api/v1/score]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'score_against_brand',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
