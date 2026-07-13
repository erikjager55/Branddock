// =============================================================
// Stale-RUNNING-reapers (agents-scheduling, slice 1).
//
// Een harde platform-kill (Vercel maxDuration) laat een geclaimde
// AgentJob én zijn AgentRun-placeholder voor eeuwig op RUNNING staan:
// de runner selecteert alleen PENDING/RETRY, dus zonder reaper wedgen
// ze stil — en een gewedgede AGENT_TASK blokkeert via de per-workspace-
// cap ook alle volgende scheduled runs van die workspace. Drempel 900s
// > maxDuration 800s van de langste consumers (run-route + cron-tick),
// dus geen false positives op nog-levende invocations.
// =============================================================

import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const STALE_AFTER_SECONDS = 900;

/**
 * Zet RUNNING-jobs ouder dan de drempel op RETRY (attempts over) of FAILED.
 * Raw SQL omdat Prisma geen kolom-tegen-kolom-vergelijking (attempts <
 * maxAttempts) in een updateMany kan uitdrukken.
 */
export async function reapStaleJobs(): Promise<number> {
  // Alleen recent gewedgede jobs (≤24h) krijgen een RETRY: historische
  // RUNNING-rijen van vóór deze reaper mogen bij de eerste prod-tick niet
  // spontaan herstarten (niet elke handler is idempotent) — die gaan
  // rechtstreeks naar FAILED (review-W 2026-07-13).
  const reaped = await prisma.$executeRaw`
    UPDATE "AgentJob" SET
      status = CASE WHEN attempts < "maxAttempts"
          AND "startedAt" > NOW() - interval '1 day'
        THEN 'RETRY'::"AgentJobStatus" ELSE 'FAILED'::"AgentJobStatus" END,
      "errorMessage" = 'Reaped: RUNNING langer dan 900s (platform-kill aangenomen)',
      "nextAttemptAt" = CASE WHEN attempts < "maxAttempts"
          AND "startedAt" > NOW() - interval '1 day'
        THEN NOW() ELSE NULL END,
      "completedAt" = CASE WHEN attempts < "maxAttempts"
          AND "startedAt" > NOW() - interval '1 day'
        THEN NULL ELSE NOW() END
    WHERE status = 'RUNNING'
      AND "startedAt" < NOW() - make_interval(secs => ${STALE_AFTER_SECONDS})
  `;
  if (reaped > 0) {
    console.warn('[job-reaper] stale RUNNING-jobs gereaped', { reaped });
  }
  return reaped;
}

/**
 * Server-side twin van de inbox-`isRunStale`-heuristiek: een RUNNING
 * AgentRun zonder levend proces wordt eerlijk FAILED, zodat de inbox en
 * de workspace-cap niet op een spookrun blijven hangen. Veilig t.o.v.
 * levende runs: MAX_RUN_TIMEOUT_MS (740s) + prompt-build-deadline (60s)
 * blijft onder de 900s-drempel.
 */
export async function reapStaleAgentRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_SECONDS * 1000);
  const stale = await prisma.agentRun.findMany({
    where: { status: 'RUNNING', createdAt: { lt: cutoff } },
    select: {
      id: true,
      workspaceId: true,
      agentId: true,
      userId: true,
      triggerType: true,
      createdAt: true,
    },
  });
  if (stale.length === 0) return 0;

  const interruptionError =
    'Run was interrupted (platform restart) — marked failed by the scheduler.';
  await prisma.agentRun.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: {
      status: 'FAILED',
      error: interruptionError,
      completedAt: new Date(),
    },
  });
  for (const workspaceId of new Set(stale.map((r) => r.workspaceId))) {
    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
  }
  console.warn('[job-reaper] stale RUNNING agent-runs op FAILED gezet', { count: stale.length });

  // Een gereapte run zou anders stil sneuvelen — de in-process notify-hook
  // draait immers nooit. Zeldzaam pad (platform-kill); een mogelijk dubbele
  // melding bij een latere job-retry is beter dan stilte. Alleen recente
  // runs (≤24h): historische wedges van vóór deze reaper mogen bij de
  // eerste prod-tick geen notificatie-burst geven (review-W ronde 3).
  const notifyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { notifyAgentRunFinished } = await import('@/lib/agents/notify-run-finished');
  for (const run of stale) {
    if (run.createdAt < notifyCutoff) continue;
    await notifyAgentRunFinished({
      workspaceId: run.workspaceId,
      runId: run.id,
      agentId: run.agentId,
      status: 'FAILED',
      error: interruptionError,
      artifactCount: 0,
      userId: run.userId,
      triggerType: run.triggerType,
    });
  }
  return stale.length;
}
