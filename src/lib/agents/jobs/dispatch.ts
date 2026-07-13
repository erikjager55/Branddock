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
      // Ook een dedupe-join mag de bestaande (mogelijk nog PENDING) job
      // versnellen — de debounce in kickWorker begrenst het effect.
      if (existing.status === 'PENDING' || existing.status === 'RETRY') kickWorker();
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

  // Direct verwerkbaar (geen delayed schedule)? Kick de worker meteen i.p.v.
  // op de minuut-cron te wachten.
  if (!input.scheduledAt || input.scheduledAt.getTime() <= Date.now()) {
    kickWorker();
  }

  return { id: job.id, deduped: false };
}

/**
 * Fire-and-forget self-request naar de cron-worker (job-queue-latency): de
 * taak-#7-meting liet tot ~3 min queue-wacht zien (minuut-cron + een bezette
 * invocation). Een kick start een vérse invocation die de zojuist enqueued
 * job direct claimt; de atomaire claim in de runner voorkomt dubbel-werk met
 * gelijktijdige cron-ticks. Fail-silent by design — bij ontbrekend secret,
 * ontbrekende base-URL of een netwerk-fout blijft de minuut-cron het vangnet.
 *
 * Serverless-semantiek (review-W1): een kale dangling fetch kan door Vercel
 * post-response bevroren worden vóór de request de deur uit is — daarom wordt
 * de fetch-promise aan `after()` (next/server) gehangen zodat de invocation
 * lang genoeg leeft; buiten een request-context (scripts, jobs-smoke) faalt
 * dat stil en blijft de dangling fetch het best-effort-pad. De 5s-abort
 * voorkomt dat we 800s op de run-jobs-response wachten; de ontvangende
 * invocation draait door na een client-abort.
 *
 * Debounce (review-W2): batch-dispatchers (media-bulk, backfill-tags) zouden
 * anders per item een invocation kicken — max 1 kick per 10s per instance,
 * de rest vangt diezelfde verse invocation of de minuut-cron.
 *
 * N.b. op preview-deploys wijst BETTER_AUTH_URL naar prod — de kick raakt
 * dan de prod-worker; previews leunden altijd al op de prod-cron (review-M3).
 */
const KICK_DEBOUNCE_MS = 10_000;
let lastKickAt = 0;

function kickWorker(): void {
  const secret = process.env.CRON_SECRET;
  const base = process.env.BETTER_AUTH_URL;
  if (!secret || !base) return;
  if (Date.now() - lastKickAt < KICK_DEBOUNCE_MS) return;
  lastKickAt = Date.now();

  const kicked = fetch(`${base.replace(/\/$/, '')}/api/cron/run-jobs`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(5_000),
  }).then(
    () => {},
    () => {},
  );
  void import('next/server')
    .then((m) => m.after(kicked))
    .catch(() => {});
}

/** Mark a job as cancelled. Only works on PENDING/RETRY jobs. */
export async function cancelJob(id: string): Promise<boolean> {
  const result = await prisma.agentJob.updateMany({
    where: { id, status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
  return result.count > 0;
}
