// =============================================================
// GET /api/usage/history — AI usage history (last 6 months)
//
// Returns monthly token/cost/call aggregates.
// Query param: ?months=6 (default 6, max 12)
// =============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getUsageHistory } from '@/lib/stripe/usage-tracker';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsParam = parseInt(searchParams.get('months') ?? '6', 10);
    const months = Math.min(Math.max(1, monthsParam), 12);

    const history = await getUsageHistory(workspaceId, months);

    return NextResponse.json({ history, months });
  } catch (err) {
    console.error('[GET /api/usage/history] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch usage history' }, { status: 500 });
  }
}
