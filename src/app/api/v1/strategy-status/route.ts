// =============================================================
// GET /api/v1/strategy-status?campaignId=… — publieke Brand-API: status
// van een async strategie-generatie (Fase D4, ADR 2026-07-17).
//
// Polling-tegenhanger van POST /api/v1/strategy-generate: leest de
// recentste CAMPAIGN_STRATEGY_GENERATE-job + of Campaign.strategy al
// gevuld is. Zero-cost (statuscheck), metadata-only usage-log.
// =============================================================

import { NextResponse } from 'next/server';
import { getStrategyStatus } from '@/lib/campaigns/headless-strategy';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

export async function GET(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const campaignId = new URL(request.url).searchParams.get('campaignId');
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId query parameter is required' }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const result = await getStrategyStatus(auth.workspaceId, campaignId);

    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_strategy_status',
      authVia: 'api_key',
      success: result.ok,
      latencyMs: Date.now() - startedAt,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 404 });
    }

    return NextResponse.json({
      workspaceId: auth.workspaceId,
      campaignId: result.campaignId,
      status: result.status,
      error: result.error,
      hasStrategy: result.hasStrategy,
      deliverablesCreated: result.deliverablesCreated,
    });
  } catch (error) {
    console.error('[GET /api/v1/strategy-status]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_strategy_status',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
