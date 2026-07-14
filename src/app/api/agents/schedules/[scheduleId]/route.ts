// =============================================================
// /api/agents/schedules/[scheduleId] — bijwerken (PATCH) +
// verwijderen (DELETE) van een schedule (agents-scheduling, slice 2).
//
// PATCH: agentId is immutable; cadence-wijzigingen (en re-enable)
// herberekenen nextRunAt zodat een oud due-slot niet direct vuurt.
// DELETE: cancelt ook nog-pending due-slot-jobs — geen orphan-runs
// (de AGENT_TASK-handler heeft dezelfde guard als tweede linie).
// =============================================================

import { NextResponse } from "next/server";
import { enforceNotLocked } from "@/lib/stripe/enforcement";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { getVisibleAgentDefinition } from "@/lib/agents/registry";
import {
  contextSelectionSchema,
  sanitizeContextSelection,
} from "@/lib/agents/registry/context-selection";
import {
  SCHEDULE_CADENCES,
  computeNextRunAt,
  isValidTimezone,
} from "@/lib/agents/schedules/cadence";
import {
  MAX_SCHEDULE_INPUT_BYTES,
  SCHEDULE_SELECT,
  isDevCadenceAllowed,
  serializeSchedule,
} from "@/lib/agents/schedules/schedule-api";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  useCaseId: z.string().min(1).nullable().optional(),
  input: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val === null ||
        Buffer.byteLength(JSON.stringify(val), "utf8") <= MAX_SCHEDULE_INPUT_BYTES,
      { message: `input exceeds ${MAX_SCHEDULE_INPUT_BYTES} bytes` },
    ),
  contextSelection: contextSelectionSchema,
  cadence: z.enum(SCHEDULE_CADENCES).optional(),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'timeOfDay moet "HH:MM" (24h) zijn')
    .optional(),
  dayOfWeek: z.number().int().min(1).max(7).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  timezone: z.string().optional(),
});

const CADENCE_KEYS = ["cadence", "timeOfDay", "dayOfWeek", "dayOfMonth", "timezone"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  try {
    const { scheduleId } = await params;
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    // Pariteit met POST (finalize-MINOR): een re-enable via PATCH geeft
    // terugkerend AI-budget uit — zelfde trial-lock als schedule-create.
    const trialLock = await enforceNotLocked(workspaceId);
    if (trialLock) return trialLock;

    const existing = await prisma.agentSchedule.findFirst({
      where: { id: scheduleId, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const patch = parsed.data;

    // Merged cadence-set valideren (patch kan een half paar aanleveren).
    const merged = {
      cadence: patch.cadence ?? existing.cadence,
      timeOfDay: patch.timeOfDay ?? existing.timeOfDay,
      dayOfWeek: patch.dayOfWeek !== undefined ? patch.dayOfWeek : existing.dayOfWeek,
      dayOfMonth: patch.dayOfMonth !== undefined ? patch.dayOfMonth : existing.dayOfMonth,
      timezone: patch.timezone ?? existing.timezone,
    };
    if (merged.cadence === "WEEKLY" && merged.dayOfWeek === null) {
      return NextResponse.json({ error: "WEEKLY vereist dayOfWeek (1-7)" }, { status: 400 });
    }
    if (merged.cadence === "MONTHLY" && merged.dayOfMonth === null) {
      return NextResponse.json({ error: "MONTHLY vereist dayOfMonth (1-28)" }, { status: 400 });
    }
    if (!isValidTimezone(merged.timezone)) {
      return NextResponse.json({ error: "Onbekende IANA-timezone" }, { status: 400 });
    }
    if (merged.cadence === "EVERY_MINUTE" && !isDevCadenceAllowed()) {
      return NextResponse.json({ error: "EVERY_MINUTE is alleen beschikbaar in dev" }, { status: 400 });
    }
    if (patch.useCaseId) {
      const def = getVisibleAgentDefinition(existing.agentId);
      if (!def || !def.useCases.some((u) => u.id === patch.useCaseId)) {
        return NextResponse.json(
          { error: `Unknown use-case '${patch.useCaseId}' for agent '${existing.agentId}'` },
          { status: 400 },
        );
      }
    }

    const cadenceChanged = CADENCE_KEYS.some((key) => patch[key] !== undefined);
    const reEnabled = patch.enabled === true && !existing.enabled;

    const schedule = await prisma.agentSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.useCaseId !== undefined ? { useCaseId: patch.useCaseId } : {}),
        ...(patch.input !== undefined
          ? { input: (patch.input ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
        ...(patch.contextSelection !== undefined
          ? (() => {
              const sanitized = sanitizeContextSelection(patch.contextSelection);
              return {
                contextSelection: sanitized
                  ? (sanitized as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              };
            })()
          : {}),
        ...merged,
        // Herberekenen bij cadence-wijziging of re-enable: een nextRunAt uit
        // het verleden zou anders direct (of dubbel) vuren.
        ...(cadenceChanged || reEnabled
          ? { nextRunAt: computeNextRunAt(merged, new Date()) }
          : {}),
      },
      select: SCHEDULE_SELECT,
    });

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    return NextResponse.json({ schedule: serializeSchedule(schedule) });
  } catch (err) {
    console.error("[PATCH /api/agents/schedules/[scheduleId]]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  try {
    const { scheduleId } = await params;
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    const deleted = await prisma.agentSchedule.deleteMany({
      where: { id: scheduleId, workspaceId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Nog-pending due-slot-jobs cancellen — geen orphan-runs na delete.
    await prisma.agentJob.updateMany({
      where: {
        idempotencyKey: { startsWith: `agent-schedule:${scheduleId}:` },
        status: { in: ["PENDING", "RETRY"] },
      },
      data: { status: "CANCELLED", completedAt: new Date() },
    });

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/agents/schedules/[scheduleId]]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
