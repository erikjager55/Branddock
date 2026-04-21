// =============================================================
// Agent Job dispatcher (4.4)
//
// Creates an AgentJob row that will be picked up by the next
// runPendingJobs() pass. Supports idempotency, delayed scheduling
// and priority ordering.
// =============================================================

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { AgentJobType } from '@prisma/client';

export interface DispatchJobInput {
  type: AgentJobType;
  payload?: Record<string, unknown>;
  workspaceId?: string | null;
  /** Earliest time the job may run; defaults to now. */
  scheduledAt?: Date;
  /** Lower number = higher priority. Default 100. */
  priority?: number;
  /** Retry budget. Default 3. */
  maxAttempts?: number;
  /** If supplied, a second dispatch with the same key reuses the existing job unless it's already failed/completed. */
  idempotencyKey?: string;
  /** Free-form label: 'cron' | 'webhook' | 'user' | 'agent' | 'manual'. */
  triggeredBy?: string;
}

export interface DispatchedJob {
  id: string;
  deduped: boolean;
}

/**
 * Enqueue a job. Returns `{ id, deduped }` — when deduped=true the
 * caller is joining an existing live job with the same idempotencyKey.
 */
export async function dispatchJob(input: DispatchJobInput): Promise<DispatchedJob> {
  if (input.idempotencyKey) {
    const existing = await prisma.agentJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== 'COMPLETED' && existing.status !== 'FAILED' && existing.status !== 'CANCELLED') {
      return { id: existing.id, deduped: true };
    }
  }

  const job = await prisma.agentJob.create({
    data: {
      type: input.type,
      payload: (input.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      workspaceId: input.workspaceId ?? null,
      scheduledAt: input.scheduledAt ?? new Date(),
      priority: input.priority ?? 100,
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey,
      triggeredBy: input.triggeredBy ?? null,
    },
    select: { id: true },
  });

  return { id: job.id, deduped: false };
}

/** Mark a job as cancelled. Only works on PENDING/RETRY jobs. */
export async function cancelJob(id: string): Promise<boolean> {
  const result = await prisma.agentJob.updateMany({
    where: { id, status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
  return result.count > 0;
}
