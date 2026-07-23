// =============================================================
// POST /api/v1/seo-generate — publieke Brand-API: start de 8-staps SEO/GEO
// long-form-pipeline als async job (Fase D1, ADR 2026-07-17).
//
// Response is direct (enqueue): { deliverableId, jobId } — poll de voortgang
// via GET /api/v1/seo-status?jobId=… De 80-credit-afboeking gebeurt
// idempotent in de bestaande job-driver bij afronding; de usage-log hier is
// metadata-only bij start.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { startSeoGeneration } from '@/lib/content/headless-seo';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { enforceCreditsForAction } from '@/lib/stripe/enforcement';
import { logApiCall } from '@/lib/api/public/usage';

// Context-assembly + job-aanmaak; de pipeline zelf draait in de job-lane.
export const maxDuration = 120;

const bodySchema = z.object({
  deliverableId: z.string().optional(),
  contentType: z.string().optional(),
  title: z.string().max(120).optional(),
  campaignId: z.string().optional(),
  brief: z
    .object({
      objective: z.string().optional(),
      keyMessage: z.string().optional(),
      toneDirection: z.string().optional(),
      callToAction: z.string().optional(),
    })
    .optional(),
  contextSelection: z
    .object({
      personaIds: z.array(z.string()).optional(),
      productIds: z.array(z.string()).optional(),
      competitorIds: z.array(z.string()).optional(),
      knowledgeResourceIds: z.array(z.string()).optional(),
    })
    .optional(),
  seoInput: z.object({
    primaryKeyword: z.string().min(1),
    funnelStage: z.enum(['awareness', 'consideration', 'decision']),
    secondaryKeywordHints: z.array(z.string()).optional(),
    competitorUrls: z.array(z.string()).optional(),
    conversionGoal: z.string().optional(),
    trafficSource: z.string().optional(),
  }),
});

const ERROR_STATUS: Record<string, number> = {
  KEYWORD_REQUIRED: 400,
  DELIVERABLE_NOT_FOUND: 404,
  SEO_NOT_APPLICABLE: 400,
  CREATE_FAILED: 400,
  ENQUEUE_FAILED: 502,
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
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const blocked = await enforceCreditsForAction(auth.workspaceId, 'long-form', 1);
  if (blocked) return blocked;

  const startedAt = Date.now();
  const result = await startSeoGeneration({ workspaceId: auth.workspaceId, ...parsed.data });
  await logApiCall({
    workspaceId: auth.workspaceId,
    tool: 'generate_long_form_seo',
    authVia: 'api_key',
    success: result.ok,
    latencyMs: Date.now() - startedAt,
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
    jobId: result.jobId,
    status: 'queued',
    poll: `/api/v1/seo-status?jobId=${result.jobId}`,
  });
}
