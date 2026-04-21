// =============================================================
// Cron endpoint — processes ready agent jobs (4.4)
//
// Called by Vercel Cron (see vercel.json) every minute. Protected
// via CRON_SECRET — Vercel includes a header `Authorization:
// Bearer <secret>` that matches the env var.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runPendingJobs } from '@/lib/agents/jobs/runner';

/** Max jobs per invocation. Keeps each cron run well under the
 *  Vercel serverless timeout even when handlers are slow. */
const DEFAULT_BATCH_SIZE = 20;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured → allow in dev, block in prod
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || DEFAULT_BATCH_SIZE)) : DEFAULT_BATCH_SIZE;

  const result = await runPendingJobs({ limit });

  return NextResponse.json({
    processed: result.processed,
    counts: {
      completed: result.results.filter((r) => r.status === 'COMPLETED').length,
      retry: result.results.filter((r) => r.status === 'RETRY').length,
      failed: result.results.filter((r) => r.status === 'FAILED').length,
    },
    results: result.results,
  });
}
