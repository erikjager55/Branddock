// =============================================================
// Cron endpoint — pre-emptive token refresh.
//
// Schedule: 1x/24u (vercel.json). Protected via CRON_SECRET.
// Logic in src/lib/jobs/refresh-ad-tokens.ts.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { refreshAdTokens } from '@/lib/jobs/refresh-ad-tokens';

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
    const result = await refreshAdTokens();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/refresh-ad-tokens]', err);
    return NextResponse.json({ error: 'Job failed', detail: (err as Error).message }, { status: 500 });
  }
}
