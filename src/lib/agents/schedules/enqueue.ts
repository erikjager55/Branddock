// =============================================================
// Due-schedule-enqueue (agents-scheduling, slice 2) — draait in de
// cron-tick vóór runPendingJobs.
//
// Exactly-once per due-slot via twee onafhankelijke sloten:
//   1. idempotencyKey `agent-schedule:<id>:<dueSlot>` op de job —
//      dedupet levende jobs; een terminale job met dezelfde key
//      geeft P2002 (= slot al volledig verwerkt, ook oké);
//   2. de claim = conditionele update op de gelezen nextRunAt —
//      van twee overlappende ticks landt er precies één.
// Volgorde dispatch → claim: elk crash-window self-healt (een crash
// ná dispatch laat de volgende tick dezelfde key dedupen en alsnog
// claimen). Dit is acceptatiecriterium 2 van de task-file.
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';
import { canActInWorkspace } from '@/lib/workspace/workspace-users';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { computeNextRunAt, type CadenceFields } from './cadence';
import { isDevCadenceAllowed } from './schedule-api';

/** Cap per tick — ruim boven realistisch pilot-gebruik, begrensd tegen een backlog-burst. */
const MAX_DUE_PER_TICK = 25;

export interface EnqueueDueSchedulesResult {
  enqueued: number;
  disabled: number;
}

/**
 * Enqueue't alle due schedules als AGENT_TASK-jobs en schuift hun
 * nextRunAt op. Fail-soft per schedule: één kapot schedule mag de
 * rest van de tick niet blokkeren.
 */
export async function enqueueDueSchedules(now: Date = new Date()): Promise<EnqueueDueSchedulesResult> {
  const due = await prisma.agentSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: 'asc' },
    take: MAX_DUE_PER_TICK,
  });

  let enqueued = 0;
  let disabled = 0;

  for (const schedule of due) {
    try {
      // Cadence-floor runtime-handhaving: een (via dev of DB) achtergebleven
      // EVERY_MINUTE-rij mag in prod niet elke minuut AI-runs vuren — de
      // create/PATCH-gate alleen is niet genoeg (review-W 2026-07-13).
      if (schedule.cadence === 'EVERY_MINUTE' && !isDevCadenceAllowed()) {
        await prisma.agentSchedule.update({
          where: { id: schedule.id },
          data: { enabled: false },
        });
        invalidateCache(cacheKeys.prefixes.agents(schedule.workspaceId));
        console.warn('[agent-schedules] EVERY_MINUTE niet toegestaan in prod — schedule gedisabled', {
          scheduleId: schedule.id,
          workspaceId: schedule.workspaceId,
        });
        disabled++;
        continue;
      }

      // Acting identity moet nog een actief lid met schrijfrol zijn: een
      // vertrokken of naar viewer gedowngradede creator zou runs (en
      // confirm-verantwoordelijkheid) op een spook-identity zetten.
      // Fail-soft disable — de UI toont het schedule als uitgeschakeld.
      if (!(await canActInWorkspace(schedule.workspaceId, schedule.createdByUserId))) {
        await prisma.agentSchedule.update({
          where: { id: schedule.id },
          data: { enabled: false },
        });
        invalidateCache(cacheKeys.prefixes.agents(schedule.workspaceId));
        console.warn('[agent-schedules] creator geen actief lid met schrijfrol meer — schedule gedisabled', {
          scheduleId: schedule.id,
          workspaceId: schedule.workspaceId,
        });
        disabled++;
        continue;
      }

      const dueSlot = schedule.nextRunAt.toISOString();
      try {
        const dispatched = await dispatchJob({
          type: 'AGENT_TASK',
          workspaceId: schedule.workspaceId,
          payload: {
            agentId: schedule.agentId,
            useCaseId: schedule.useCaseId ?? undefined,
            input: (schedule.input ?? undefined) as Record<string, unknown> | undefined,
            contextSelection: (schedule.contextSelection ?? undefined) as
              | Record<string, unknown>
              | undefined,
            userId: schedule.createdByUserId,
            scheduleId: schedule.id,
          },
          idempotencyKey: `agent-schedule:${schedule.id}:${dueSlot}`,
          maxAttempts: 2,
          triggeredBy: 'cron',
        });
        // Een dedupe-join is geen nieuwe enqueue (finalize-MINOR: de teller
        // telde deduped dispatches mee en overrapporteerde).
        if (!dispatched.deduped) enqueued++;
      } catch (err) {
        // P2002 op idempotencyKey: dit due-slot had al een terminale job —
        // dispatch is dan feitelijk al gebeurd; alleen de claim moet nog.
        const isDuplicateKey =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isDuplicateKey) throw err;
      }

      // Claim: alleen de tick die exact déze nextRunAt las mag opschuiven.
      await prisma.agentSchedule.updateMany({
        where: { id: schedule.id, enabled: true, nextRunAt: schedule.nextRunAt },
        data: {
          nextRunAt: computeNextRunAt(schedule as CadenceFields, now),
          lastRunAt: now,
        },
      });
      // Mutatie → verplichte invalidatie: de schedule-lijst-cache toont
      // anders tot TTL een verouderde nextRunAt (CLAUDE.md #10).
      invalidateCache(cacheKeys.prefixes.agents(schedule.workspaceId));
    } catch (err) {
      console.error('[agent-schedules] enqueue faalde voor schedule', {
        scheduleId: schedule.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { enqueued, disabled };
}
