// =============================================================
// Cron endpoint — pre-emptive token refresh.
//
// Schedule: 1x/24u (vercel.json). Protected via CRON_SECRET.
// Logic in src/lib/jobs/refresh-ad-tokens.ts.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { refreshAdTokens } from '@/lib/jobs/refresh-ad-tokens';
import { isCronAuthorized } from '@/lib/auth/cron-auth';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await refreshAdTokens();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/refresh-ad-tokens]', err);
    return NextResponse.json({ error: 'Job failed', detail: (err as Error).message }, { status: 500 });
  }
}
