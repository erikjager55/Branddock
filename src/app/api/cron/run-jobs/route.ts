// =============================================================
// Cron endpoint — processes ready agent jobs (4.4)
//
// Called by Vercel Cron (see vercel.json) every minute. Protected
// via CRON_SECRET — Vercel includes a header `Authorization:
// Bearer <secret>` that matches the env var.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runPendingJobs } from '@/lib/agents/jobs/runner';
import { reapStaleJobs, reapStaleAgentRuns } from '@/lib/agents/jobs/reaper';
import { enqueueDueSchedules } from '@/lib/agents/schedules/enqueue';
import { isCronAuthorized } from '@/lib/auth/cron-auth';

/** Max jobs per invocation. Keeps each cron run well under the
 *  Vercel serverless timeout even when handlers are slow. */
const DEFAULT_BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || DEFAULT_BATCH_SIZE)) : DEFAULT_BATCH_SIZE;

  // Reap vóór de run: een gewedgede RUNNING-AGENT_TASK blokkeert anders via
  // de per-workspace-cap alle volgende scheduled runs van die workspace.
  const reapedJobs = await reapStaleJobs();
  const reapedRuns = await reapStaleAgentRuns();

  // Due schedules → AGENT_TASK-jobs (vóór de runner, zodat een zojuist
  // due geworden schedule nog dezelfde tick meedraait). Fail-soft: een
  // ontbrekende AgentSchedule-tabel (deploy vóór de Neon-push, zie gotcha
  // 2026-07-13) mag de job-queue-tick zelf nooit neerhalen.
  let schedules = { enqueued: 0, disabled: 0 };
  try {
    schedules = await enqueueDueSchedules();
  } catch (err) {
    console.error(
      '[cron run-jobs] schedule-enqueue faalde — tick draait door zonder schedules:',
      err instanceof Error ? err.message : err,
    );
  }

  const result = await runPendingJobs({ limit });

  return NextResponse.json({
    processed: result.processed,
    reaped: { jobs: reapedJobs, runs: reapedRuns },
    schedules,
    counts: {
      completed: result.results.filter((r) => r.status === 'COMPLETED').length,
      retry: result.results.filter((r) => r.status === 'RETRY').length,
      failed: result.results.filter((r) => r.status === 'FAILED').length,
      skipped: result.results.filter((r) => r.status === 'SKIPPED').length,
    },
    results: result.results,
  });
}
