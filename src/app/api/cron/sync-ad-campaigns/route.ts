// =============================================================
// Cron endpoint — sync AdCampaign.status vs Meta.
//
// Schedule: every 5 min (vercel.json). Protected via CRON_SECRET.
// Logic in src/lib/jobs/sync-ad-campaign-status.ts.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { syncAdCampaignStatus } from '@/lib/jobs/sync-ad-campaign-status';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncAdCampaignStatus();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/sync-ad-campaigns]', err);
    return NextResponse.json({ error: 'Job failed', detail: (err as Error).message }, { status: 500 });
  }
}
