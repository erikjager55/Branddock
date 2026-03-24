import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
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

    let body: ImproveBriefingBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body.wizardContext?.campaignName) {
      return NextResponse.json({ error: 'wizardContext.campaignName is required' }, { status: 400 });
    }
    if (!body.validation) {
      return NextResponse.json({ error: 'validation is required' }, { status: 400 });
    }

    const result = await improveBriefing(
      body.wizardContext,
      body.validation,
      body.strategicIntent ?? 'hybrid',
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/campaigns/wizard/strategy/improve-briefing]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
