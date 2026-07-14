// =============================================================
// Agent Job runner (4.4)
//
// Pulls up-to-`limit` PENDING / RETRY jobs whose scheduledAt
// window has opened, runs each via its registered handler, and
// writes back the final status. Used by /api/cron/run-jobs
// (serverless Vercel Cron) and by the scripts/jobs-smoke test.
//
// Retry policy: exponential backoff (2^attempts minutes), capped
// by the job's maxAttempts.
// =============================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getHandler } from './handlers';
import { trackEvent } from '@/lib/analytics/posthog';
import type { JobRunResult, RunPendingJobsResult, AgentJob } from './types';

const DEFAULT_LIMIT = 20;
// Max gelijktijdige rest-handlers per invocation (naast de agent-lane).
// AI-jobs zijn I/O-gebonden dus parallel is goedkoop; de cap begrenst
// geheugen/DB-connecties per lambda én het aantal gelijktijdige LLM-streams
// (Anthropic-rate-limits) — verhogen pas op meting.
const JOB_CONCURRENCY = 4;
const MAX_BACKOFF_MS = 60 * 60 * 1000; // cap retry delay at 1 hour

/** Rest-budget binnen één invocation (maxDuration 800s): voorbij dit punt
 *  geen nieuwe jobs meer claimen — een mid-run platform-kill laat anders een
 *  gewedgede RUNNING-rij achter. Niet-gestarte jobs blijven PENDING voor de
 *  volgende minuut-tick. */
const DEFAULT_BUDGET_MS = 600_000;

function computeBackoffMs(attempts: number): number {
  const base = 60 * 1000; // 1 min
  const delay = base * Math.pow(2, attempts);
  return Math.min(delay, MAX_BACKOFF_MS);
}

/** Atomic claim: only one runner should pick up this job. */
async function claimJob(job: AgentJob): Promise<boolean> {
  const claim = await prisma.agentJob.updateMany({
    where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
  });
  return claim.count === 1;
}

/**
 * AGENT_TASK-claim met per-workspace cap = 1 (agents-scheduling, geërfd uit
 * strategy-analyst Phase C): agent-runs duren minuten en kosten AI-budget —
 * twee tegelijk per workspace stapelt kosten en vertekent de run-historie.
 * De advisory-xact-lock serialiseert concurrerende cron-ticks per workspace
 * (transaction-scoped, dus veilig met connection-pooling); de RUNNING-count
 * erbinnen is daardoor race-vrij. Een geblokkeerde job blijft onaangeraakt
 * (geen attempt verbrand) en wordt de volgende tick opnieuw geëvalueerd.
 */
async function claimAgentTaskJob(job: AgentJob): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const lockKey = `agent-task:${job.workspaceId ?? 'global'}`;
    // ::text-cast: de lock-functie returnt void en dat kan $queryRaw niet
    // deserialiseren.
    await tx.$queryRaw`SELECT (pg_advisory_xact_lock(hashtext(${lockKey})))::text`;
    const running = await tx.agentJob.count({
      where: {
        type: 'AGENT_TASK',
        status: 'RUNNING',
        workspaceId: job.workspaceId,
        id: { not: job.id },
      },
    });
    if (running > 0) return false;
    const claim = await tx.agentJob.updateMany({
      where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
      data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
    });
    return claim.count === 1;
  });
}

async function runJob(job: AgentJob): Promise<JobRunResult> {
  const handler = getHandler(job.type);

  if (!handler) {
    await prisma.agentJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: `No handler registered for job type ${job.type}`,
        completedAt: new Date(),
      },
    });
    return {
      id: job.id,
      type: job.type,
      status: 'FAILED',
      attempts: job.attempts,
      error: 'No handler',
    };
  }

  let claimed: boolean;
  let freshJob: AgentJob;
  try {
    claimed = job.type === 'AGENT_TASK' ? await claimAgentTaskJob(job) : await claimJob(job);
    if (!claimed) {
      // Claim verloren aan een concurrerende tick, óf de workspace-cap houdt
      // deze AGENT_TASK tegen — job onaangeraakt, volgende tick opnieuw.
      return { id: job.id, type: job.type, status: 'SKIPPED', attempts: job.attempts };
    }
    freshJob = await prisma.agentJob.findUniqueOrThrow({ where: { id: job.id } });
  } catch (err) {
    // Claim-/refetch-fout (bv. P2028 advisory-lock-timeout, DB-hiccup): één
    // flaky claim mag niet de hele cron-tick 500'en. Onaangeraakte jobs komen
    // de volgende tick terug; een wél-geclaimde rij vangt de reaper.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent-job ${job.id}] claim faalde:`, message);
    return { id: job.id, type: job.type, status: 'SKIPPED', attempts: job.attempts, error: message };
  }

  try {
    const result = await handler(freshJob);
    // Conditioneel op de éigen claim (status + startedAt): leeft een handler
    // >900s (hangende tool-execute) dan heeft de reaper de rij al op
    // RETRY/FAILED gezet en kan er al een nieuwe attempt RUNNING zijn — met
    // een verse startedAt, dus deze write matcht dan niets en de nieuwe
    // attempt blijft leidend.
    const finalized = await prisma.agentJob.updateMany({
      where: { id: job.id, status: 'RUNNING', startedAt: freshJob.startedAt },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: (result ?? {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
        errorMessage: null,
      },
    });
    if (finalized.count === 0) {
      console.warn(`[agent-job ${job.id}] al gereaped tijdens de run — terminale write overgeslagen`);
    } else {
      const runtimeMs = freshJob.startedAt ? Date.now() - freshJob.startedAt.getTime() : null;
      void trackEvent({
        event: 'agent_job_completed',
        workspaceId: freshJob.workspaceId,
        properties: {
          job_id: job.id,
          job_type: job.type,
          attempts: freshJob.attempts,
          runtime_ms: runtimeMs,
          triggered_by: freshJob.triggeredBy,
        },
      });
    }

    return {
      id: job.id,
      type: job.type,
      status: 'COMPLETED',
      attempts: freshJob.attempts,
      result: result ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const willRetry = freshJob.attempts < freshJob.maxAttempts;
    const nextAttemptAt = willRetry ? new Date(Date.now() + computeBackoffMs(freshJob.attempts)) : null;

    // Zelfde eigen-claim-guard als het success-pad.
    await prisma.agentJob.updateMany({
      where: { id: job.id, status: 'RUNNING', startedAt: freshJob.startedAt },
      data: {
        status: willRetry ? 'RETRY' : 'FAILED',
        errorMessage: message,
        nextAttemptAt,
        completedAt: willRetry ? null : new Date(),
      },
    });

    console.error(`[agent-job ${job.id}] ${job.type} failed (attempt ${freshJob.attempts}/${freshJob.maxAttempts}):`, message);

    void trackEvent({
      event: willRetry ? 'agent_job_retrying' : 'agent_job_failed',
      workspaceId: freshJob.workspaceId,
      properties: {
        job_id: job.id,
        job_type: job.type,
        attempts: freshJob.attempts,
        max_attempts: freshJob.maxAttempts,
        error_message: message,
        triggered_by: freshJob.triggeredBy,
      },
    });

    return {
      id: job.id,
      type: job.type,
      status: willRetry ? 'RETRY' : 'FAILED',
      attempts: freshJob.attempts,
      error: message,
    };
  }
}

/**
 * Process up to `limit` ready jobs. "Ready" means:
 *  - status in PENDING or RETRY
 *  - scheduledAt is null or in the past
 *  - for RETRY: nextAttemptAt is null or in the past
 *
 * AGENT_TASK-jobs (echte agent-runs, tot ~740s elk) krijgen een eigen
 * regime: maximaal één gestárte run per invocation, in een eigen lane die
 * CONCURRENT met de rest-pool draait (runner-parallel-batch, follow-up op
 * #388) — vóór die follow-up wachtte de hele rest-batch op de agent-run en
 * was het budget daarna meestal op. De rest draait in een kleine worker-pool
 * (JOB_CONCURRENCY) tot het tijdbudget op is; workers pullen in
 * batch-volgorde, dus prioriteit bepaalt de startvolgorde. Claims zijn
 * atomair (claimJob/claimAgentTaskJob), dus parallelle workers of
 * gelijktijdige (gekickte) invocations kunnen niet dubbel-verwerken.
 * Vercel Cron vuurt elke minuut een onafhankelijke invocation, dus wat
 * blijft liggen is binnen een minuut weer aan de beurt.
 */
export async function runPendingJobs(
  { limit = DEFAULT_LIMIT, budgetMs = DEFAULT_BUDGET_MS }: { limit?: number; budgetMs?: number } = {},
): Promise<RunPendingJobsResult> {
  const invocationStartedAt = Date.now();
  const now = new Date();
  const dueFilter: Prisma.AgentJobWhereInput = {
    status: { in: ['PENDING', 'RETRY'] },
    AND: [
      { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
      { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    ],
  };

  // Gescheiden fetches (review-W 2026-07-13): een AGENT_TASK-backlog mag de
  // rest-batch niet uit de `take` verdringen, en andersom.
  //
  // Fairness in SQL (review-W ronde 4): DISTINCT ON pakt per workspace de
  // hoogste-prioriteit due job, zodat het venster workspaces telt in plaats
  // van jobs — een grote backlog (of een priority-0-webhook-burst) van één
  // workspace kan de schedules van andere workspaces niet meer verdringen.
  const agentTaskIds = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM (
      SELECT DISTINCT ON ("workspaceId") id, priority, "createdAt"
      FROM "AgentJob"
      WHERE type = 'AGENT_TASK'::"AgentJobType"
        AND status IN ('PENDING'::"AgentJobStatus", 'RETRY'::"AgentJobStatus")
        AND ("scheduledAt" IS NULL OR "scheduledAt" <= NOW())
        AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
      ORDER BY "workspaceId", priority ASC, "createdAt" ASC
    ) per_workspace
    ORDER BY priority ASC, "createdAt" ASC
    LIMIT 25
  `;
  const agentTasks: AgentJob[] =
    agentTaskIds.length > 0
      ? await prisma.agentJob.findMany({
          where: { id: { in: agentTaskIds.map((row) => row.id) } },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
  const rest = await prisma.agentJob.findMany({
    where: { ...dueFilter, type: { not: 'AGENT_TASK' } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const results: JobRunResult[] = [];

  // Review-W1 (runner-parallel-batch): runJob kán throwen (no-handler-write
  // buiten de try/catch; terminale failure-write die zelf faalt). In de oude
  // sequentiële loop brak dat alleen de loop af; onder Promise.all zou één
  // throw de invocation vroeg laten 500'en terwijl tot 4 handlers + de
  // agent-run nog in flight zijn (RUNNING-wedges tot de reaper ze pakt).
  // Daarom: throw → synthetisch FAILED-result, de lanes leven door; de
  // DB-rij blijft in dat geval RUNNING en is voor de reaper (≤900s).
  const safeRunJob = async (job: AgentJob): Promise<JobRunResult> => {
    try {
      return await runJob(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[runPendingJobs] runJob wierp voor ${job.id} (${job.type}):`, message);
      return { id: job.id, type: job.type, status: 'FAILED', attempts: job.attempts, error: message };
    }
  };

  // Agent-lane: max 1 gestárte agent-run per invocation, maar itereer door
  // gecapte (SKIPPED) heen — anders blokkeert workspace A's lopende run elke
  // tick de due runs van álle andere workspaces. Geen budget-check: de
  // agent-run is het hoofdgerecht van de invocation en mag tot de
  // maxDuration-ceiling lopen.
  const agentLane = (async () => {
    for (const job of agentTasks) {
      const result = await safeRunJob(job);
      results.push(result);
      if (result.status !== 'SKIPPED') break;
    }
  })();

  // Rest-pool: kleine worker-pool i.p.v. één-voor-één (de #387-meting liet
  // 3 min head-of-line-blocking zien; de #388-kick vangt alleen nieuwe
  // dispatches — batch-genoten serialiseerden nog). Zelfde budget-check op
  // dezelfde plek als de oude sequentiële loop: vóór het pakken van de
  // volgende job. `results.push` is race-vrij (single-threaded tussen awaits).
  //
  // Impliciet contract, nu expliciet (review-M3): rest-jobs kunnen onderling
  // én met een agent-run concurrent draaien — handlers moeten entiteit-
  // gescoped/idempotent zijn (dat waren ze cross-invocation al).
  //
  // DB-pool-druk (review-W2): 4 workers + agent-lane > serverless pg-pool
  // (max 3), maar Prisma houdt geen connectie vast tijdens AI-awaits — de
  // daadwerkelijke DB-momenten zijn ms-schaal writes die prima op de pool
  // queueën (acquire-timeout 10s). Worst case is een RETRY op een
  // pool-timeout, geen dubbel-werk; JOB_CONCURRENCY verhogen pas op meting.
  let cursor = 0;
  const restPool = Promise.all(
    Array.from({ length: Math.min(JOB_CONCURRENCY, rest.length) }, async () => {
      while (cursor < rest.length) {
        if (Date.now() - invocationStartedAt > budgetMs) break;
        const job = rest[cursor];
        cursor += 1;
        results.push(await safeRunJob(job));
      }
    }),
  );

  await Promise.all([agentLane, restPool]);

  return { processed: results.length, results };
}

/** Manually execute a specific job id (admin / debug). */
export async function runJobById(id: string): Promise<JobRunResult> {
  const job = await prisma.agentJob.findUniqueOrThrow({ where: { id } });
  return runJob(job);
}
