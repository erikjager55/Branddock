import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { improveBriefingBodySchema } from '@/lib/campaigns/strategy-request-schemas';
import { improveBriefing } from '@/lib/campaigns/strategy-chain';
import type { ImproveBriefingBody } from '@/lib/campaigns/strategy-blueprint.types';

export const maxDuration = 30;

/**
 * POST /api/campaigns/wizard/strategy/improve-briefing
 * Phase 1c: AI improves briefing based on validation gaps/suggestions.
 * Simple POST (not SSE) — returns improved briefing fields as JSON.
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    // L8 Zod-sweep (audit 2026-06-26, batch 3): wizardContext + validation
    // gingen als vrije JSON de AI-pipeline in met alleen presence-checks.
    const parsed = await parseJsonBody(request, improveBriefingBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as unknown as ImproveBriefingBody;

    // Build tracking when draft campaignId is supplied — falls back to
    // workspace-level tracking otherwise. improveBriefing itself stays on its
    // legacy positional signature.
    const tracking: import('@/lib/learning-loop/track-helpers').AICallTracking = {
      workspaceId,
      parentEntityType: body.campaignId ? 'Campaign' : 'Workspace',
      parentEntityId: body.campaignId ?? workspaceId,
      sourceIdentifier: 'src/lib/campaigns/strategy-chain.ts:improveBriefing',
      callOrder: 1,
    };

    const result = await improveBriefing(
      body.wizardContext,
      body.validation,
      body.strategicIntent ?? 'hybrid',
      tracking,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/campaigns/wizard/strategy/improve-briefing]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
