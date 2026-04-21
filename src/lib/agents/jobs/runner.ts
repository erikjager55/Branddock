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
import type { JobRunResult, RunPendingJobsResult, AgentJob } from './types';

const DEFAULT_LIMIT = 20;
const MAX_BACKOFF_MS = 60 * 60 * 1000; // cap retry delay at 1 hour

function computeBackoffMs(attempts: number): number {
  const base = 60 * 1000; // 1 min
  const delay = base * Math.pow(2, attempts);
  return Math.min(delay, MAX_BACKOFF_MS);
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

  // Atomic claim: only one runner should pick up this job.
  const claim = await prisma.agentJob.updateMany({
    where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claim.count === 0) {
    // Another runner beat us to it, or status changed; skip.
    return { id: job.id, type: job.type, status: 'COMPLETED', attempts: job.attempts };
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
 */
export async function runPendingJobs(
  { limit = DEFAULT_LIMIT }: { limit?: number } = {},
): Promise<RunPendingJobsResult> {
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

  const results: JobRunResult[] = [];
  for (const job of jobs) {
    results.push(await runJob(job));
  }

  return { processed: results.length, results };
}

/** Manually execute a specific job id (admin / debug). */
export async function runJobById(id: string): Promise<JobRunResult> {
  const job = await prisma.agentJob.findUniqueOrThrow({ where: { id } });
  return runJob(job);
}
