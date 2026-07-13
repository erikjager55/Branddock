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

import { prisma } from '@/lib/prisma';
import { getHandler } from './handlers';
import { trackEvent } from '@/lib/analytics/posthog';
import type { JobRunResult, RunPendingJobsResult, AgentJob } from './types';

const DEFAULT_LIMIT = 20;
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

  const claimed = job.type === 'AGENT_TASK' ? await claimAgentTaskJob(job) : await claimJob(job);
  if (!claimed) {
    // Claim verloren aan een concurrerende tick, óf de workspace-cap houdt
    // deze AGENT_TASK tegen — job onaangeraakt, volgende tick opnieuw.
    return { id: job.id, type: job.type, status: 'SKIPPED', attempts: job.attempts };
  }

  const freshJob = await prisma.agentJob.findUniqueOrThrow({ where: { id: job.id } });

  try {
    const result = await handler(freshJob);
    await prisma.agentJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: (result ?? {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
        errorMessage: null,
      },
    });

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

    await prisma.agentJob.update({
      where: { id: job.id },
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
 * regime: maximaal één per invocation, als eerste zodat hij het volle
 * maxDuration-budget heeft. De rest draait erna tot het tijdbudget op is.
 * Vercel Cron vuurt elke minuut een onafhankelijke invocation, dus wat
 * blijft liggen is binnen een minuut weer aan de beurt.
 */
export async function runPendingJobs(
  { limit = DEFAULT_LIMIT, budgetMs = DEFAULT_BUDGET_MS }: { limit?: number; budgetMs?: number } = {},
): Promise<RunPendingJobsResult> {
  const invocationStartedAt = Date.now();
  const now = new Date();

  const jobs = await prisma.agentJob.findMany({
    where: {
      status: { in: ['PENDING', 'RETRY'] },
      AND: [
        { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
        { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
      ],
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const agentTasks = jobs.filter((j) => j.type === 'AGENT_TASK');
  const rest = jobs.filter((j) => j.type !== 'AGENT_TASK');

  const results: JobRunResult[] = [];
  if (agentTasks.length > 0) {
    results.push(await runJob(agentTasks[0]));
  }
  for (const job of rest) {
    if (Date.now() - invocationStartedAt > budgetMs) break;
    results.push(await runJob(job));
  }

  return { processed: results.length, results };
}

/** Manually execute a specific job id (admin / debug). */
export async function runJobById(id: string): Promise<JobRunResult> {
  const job = await prisma.agentJob.findUniqueOrThrow({ where: { id } });
  return runJob(job);
}
