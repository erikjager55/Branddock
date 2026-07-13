// =============================================================
// AGENT_TASK-handler — de Fase-2-brug tussen de job-queue en de
// agents-registry (tasks/agents-scheduling.md, slice 1).
//
// job.payload is untrusted input: de webhook-trigger-route kan
// AGENT_TASK met arbitraire payloads enqueuen — vandaar volledige
// Zod-validatie hier; een parse-fout loopt het normale
// retry→FAILED-pad van de queue. De handler await't runAgent
// synchroon binnen dezelfde invocation zodat het in-memory
// run-collector-contract (proposals per runId) geldig blijft.
// =============================================================

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { AgentJob } from './types';
import {
  contextSelectionSchema,
  sanitizeContextSelection,
} from '@/lib/agents/registry/context-selection';

/** Zelfde cap als POST /api/agents/run: payload.input landt verbatim op AgentRun.input én in de prompt. */
const MAX_INPUT_BYTES = 32_768;

export const agentTaskPayloadSchema = z.object({
  agentId: z.string().min(1),
  useCaseId: z.string().min(1).optional(),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .refine((val) => val === undefined || Buffer.byteLength(JSON.stringify(val), 'utf8') <= MAX_INPUT_BYTES, {
      message: `input exceeds ${MAX_INPUT_BYTES} bytes`,
    }),
  contextSelection: contextSelectionSchema,
  /** Acting identity (schedule-creator): vereist voor het propose-only
   * write-pad — de tool-bridge weigert write-tools zonder user (NO_USER_CONTEXT). */
  userId: z.string().min(1),
  scheduleId: z.string().min(1).optional(),
});

export type AgentTaskPayload = z.infer<typeof agentTaskPayloadSchema>;

/**
 * Draait één agent-run vanuit de job-queue (triggerType 'scheduled').
 *
 * Terminale no-ops (return zonder run): workspace read-only-locked, of het
 * bijbehorende schedule is inmiddels verwijderd/disabled. Een FAILED-run
 * throwt zodat de queue zijn retry/backoff draait; elke attempt levert een
 * eigen (eerlijke) AgentRun-rij op.
 */
export async function runAgentTaskJob(job: AgentJob): Promise<Record<string, unknown>> {
  if (!job.workspaceId) throw new Error('AGENT_TASK: workspaceId vereist');
  const payload = agentTaskPayloadSchema.parse(job.payload);

  // Read-only-lock (verlopen trial, Fase 4 billing): schedules mogen geen
  // AI-budget verbranden op een geblokkeerde workspace. Geen fout — user-toestand.
  const { enforceNotLocked } = await import('@/lib/stripe/enforcement');
  if (await enforceNotLocked(job.workspaceId)) {
    return { skipped: 'workspace-locked' };
  }

  // Schedule kan tussen enqueue en run verwijderd/disabled zijn — geen
  // orphan-runs (tweede linie naast de job-cancel in de DELETE-route).
  if (payload.scheduleId) {
    const schedule = await prisma.agentSchedule.findUnique({
      where: { id: payload.scheduleId },
      select: { enabled: true },
    });
    if (!schedule?.enabled) {
      return { skipped: 'schedule-removed-or-disabled' };
    }
  }

  // attempts is al geïncrementeerd door de claim: op de laatste poging mag
  // de notify-hook de FAILED-notificatie sturen (één per job, niet per attempt).
  const isFinalAttempt = job.attempts >= job.maxAttempts;

  // NB: een onbekende agentId/useCaseId throwt (UnknownAgent/UseCaseError) en
  // kost dus één zinloze retry vóór FAILED — acceptabel bij maxAttempts 2;
  // de schedule-CRUD valideert agentId/useCaseId al bij aanmaak.
  const { runAgent } = await import('@/lib/agents/registry/run-agent');
  const res = await runAgent({
    workspaceId: job.workspaceId,
    userId: payload.userId,
    agentId: payload.agentId,
    useCaseId: payload.useCaseId,
    input: payload.input,
    contextSelection: sanitizeContextSelection(payload.contextSelection),
    triggerType: 'scheduled',
    triggerSource: payload.scheduleId ? `schedule:${payload.scheduleId}` : `job:${job.id}`,
    scheduleId: payload.scheduleId,
    notifyOnFailure: isFinalAttempt,
  });

  if (res.status === 'FAILED') {
    throw new Error(res.error ?? 'Agent run failed');
  }
  return {
    runId: res.runId,
    status: res.status,
    artifactIds: res.artifactIds,
    totalCostUsd: res.totalCostUsd,
  };
}
