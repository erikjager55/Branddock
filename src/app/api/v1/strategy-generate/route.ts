// =============================================================
// POST /api/v1/strategy-generate — publieke Brand-API: campaign-strategy-
// chain starten als async job (Fase D4, ADR 2026-07-17).
//
// De keten duurt minuten en past niet in één serverless request — deze
// route dispatcht alleen (202 + campaignId/jobId); de aanroeper polt
// GET /api/v1/strategy-status. Credits: vlakke 'long-form'-afboeking
// gebeurt in de job zelf bij succes (idempotent per job), niet hier.
// Metadata-only usage-log.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { startCampaignStrategyGeneration } from '@/lib/campaigns/headless-strategy';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

// Dispatch-only — de zware keten draait in de cron-worker.
export const maxDuration = 60;

const bodySchema = z.object({
  briefing: z.string().min(30, 'briefing needs at least 30 characters'),
  campaignGoalType: z.string().min(1),
  campaignTitle: z.string().max(120).optional(),
  personaIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  competitorIds: z.array(z.string()).optional(),
  mode: z.enum(['quick', 'full']).optional(),
  createDeliverables: z.boolean().optional(),
  campaignId: z.string().optional(),
});

const ERROR_STATUS: Record<string, number> = {
  BRIEFING_TOO_SHORT: 400,
  GOAL_TYPE_UNKNOWN: 400,
  CONTEXT_IDS_INVALID: 400,
  CAMPAIGN_NOT_FOUND: 404,
  CAMPAIGN_LOCKED: 409,
  CAMPAIGN_HAS_STRATEGY: 409,
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

  const startedAt = Date.now();
  try {
    const result = await startCampaignStrategyGeneration({
      workspaceId: auth.workspaceId,
      ...parsed.data,
    });

    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_campaign_strategy',
      authVia: 'api_key',
      success: result.ok,
      latencyMs: Date.now() - startedAt,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: ERROR_STATUS[result.code] ?? 400 },
      );
    }

    return NextResponse.json(
      {
        workspaceId: auth.workspaceId,
        campaignId: result.campaignId,
        jobId: result.jobId,
        status: 'queued',
        deduped: result.deduped,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('[POST /api/v1/strategy-generate]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_campaign_strategy',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
