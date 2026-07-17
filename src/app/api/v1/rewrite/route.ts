// =============================================================
// POST /api/v1/rewrite — publieke Brand-API: ephemeral on-brand rewrite/reply.
//
// Fase C (ADR 2026-07-17). Er wordt NIETS gepersisteerd — geen Deliverable,
// geen content-opslag ("inhoud opslaan is opt-in"). Vlakke 1-credit-afboeking
// gebeurt in de service; hier alleen auth + validatie + metadata-usage-log.
// Ook de motor onder de latere browser-extensie (P3.7).
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rewriteOnBrand } from '@/lib/content/rewrite-on-brand';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

export const maxDuration = 120;

const bodySchema = z.object({
  content: z.string().min(20, 'content needs at least 20 characters'),
  intent: z.enum(['rewrite', 'reply']).optional(),
  instruction: z.string().max(500).optional(),
  personaIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
});

const ERROR_STATUS: Record<string, number> = {
  CONTENT_TOO_SHORT: 400,
  CONTEXT_IDS_INVALID: 400,
  GENERATION_FAILED: 502,
};

export async function POST(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

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
  const result = await rewriteOnBrand({ workspaceId: auth.workspaceId, ...parsed.data });
  await logApiCall({
    workspaceId: auth.workspaceId,
    tool: 'rewrite_on_brand',
    authVia: 'api_key',
    success: result.ok,
    latencyMs: Date.now() - startedAt,
    credits: result.ok ? 1 : 0,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 500 },
    );
  }
  return NextResponse.json({ workspaceId: auth.workspaceId, text: result.text, model: result.model });
}
