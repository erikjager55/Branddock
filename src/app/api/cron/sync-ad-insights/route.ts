// =============================================================
// Cron endpoint — dagelijkse ad-insights-sync (ads-watchdog Fase 1).
//
// Schedule: 1x/dag 05:30 UTC (vercel.json). Protected via CRON_SECRET.
// Logic in src/lib/jobs/sync-ad-insights.ts (read-only richting Meta).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { syncAdInsights } from '@/lib/jobs/sync-ad-insights';
import { isCronAuthorized } from '@/lib/auth/cron-auth';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncAdInsights();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/sync-ad-insights]', err);
    return NextResponse.json({ error: 'Job failed', detail: (err as Error).message }, { status: 500 });
  }
}
