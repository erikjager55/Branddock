// =============================================================
// POST /api/v1/webpage-generate — publieke Brand-API: on-brand web-page
// (Puck) genereren (Fase D3, ADR 2026-07-17).
//
// Sync (één Claude-call + template-builder, met heuristic-fallback). De
// service persisteert de puckData op de deliverable — direct zichtbaar en
// publiceerbaar in de UI (tweede-deur-principe). 'short'-charge alleen bij
// echte AI-vulling; usage-log metadata-only.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateWebPage } from '@/lib/content/headless-webpage';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { rateLimitIp, rateLimitWorkspace } from '@/lib/api/public/rate-limit';
import { enforceCreditsForAction } from '@/lib/stripe/enforcement';
import { logApiCall } from '@/lib/api/public/usage';

export const maxDuration = 120;

const bodySchema = z.object({
  deliverableId: z.string().optional(),
  contentType: z.string().optional(),
  title: z.string().max(120).optional(),
  campaignId: z.string().optional(),
  prompt: z.string().min(5),
  contextSelection: z
    .object({
      personaIds: z.array(z.string()).optional(),
      productIds: z.array(z.string()).optional(),
      competitorIds: z.array(z.string()).optional(),
      knowledgeResourceIds: z.array(z.string()).optional(),
    })
    .optional(),
});

const ERROR_STATUS: Record<string, number> = {
  PROMPT_TOO_SHORT: 400,
  TYPE_NOT_WEBPAGE: 400,
  DELIVERABLE_NOT_FOUND: 404,
  CREATE_FAILED: 400,
};

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
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const blocked = await enforceCreditsForAction(auth.workspaceId, 'short', 1);
  if (blocked) return blocked;

  const startedAt = Date.now();
  const result = await generateWebPage({ workspaceId: auth.workspaceId, ...parsed.data });
  await logApiCall({
    workspaceId: auth.workspaceId,
    tool: 'generate_web_page',
    authVia: 'api_key',
    success: result.ok,
    latencyMs: Date.now() - startedAt,
    credits: result.ok && result.source === 'ai' ? 5 : 0,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 500 },
    );
  }
  return NextResponse.json({
    workspaceId: auth.workspaceId,
    deliverableId: result.deliverableId,
    campaignId: result.campaignId,
    source: result.source,
    puckData: result.puckData,
  });
}
