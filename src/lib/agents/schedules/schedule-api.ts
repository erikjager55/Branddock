// =============================================================
// Gedeelde validatie + serialisatie voor de schedule-CRUD-routes
// (agents-scheduling, slice 2). Los van de route-files: Next staat
// alleen handler-exports toe in een route.ts.
// =============================================================

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { contextSelectionSchema } from "@/lib/agents/registry/context-selection";
import { SCHEDULE_CADENCES, isValidTimezone } from "./cadence";

/** Zelfde cap als de run-route: input landt verbatim in de prompt per run. */
export const MAX_SCHEDULE_INPUT_BYTES = 32_768;

/** EVERY_MINUTE is een dev/smoke-cadence — kosten-stapeling; prod-floor is DAILY. */
export function isDevCadenceAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.AGENTS_DEV_CADENCE === "1";
}

export const scheduleFieldsSchema = z
  .object({
    agentId: z.string().min(1),
    useCaseId: z.string().min(1).optional(),
    input: z
      .record(z.string(), z.unknown())
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          Buffer.byteLength(JSON.stringify(val), "utf8") <= MAX_SCHEDULE_INPUT_BYTES,
        { message: `input exceeds ${MAX_SCHEDULE_INPUT_BYTES} bytes` },
      ),
    contextSelection: contextSelectionSchema,
    cadence: z.enum(SCHEDULE_CADENCES),
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'timeOfDay moet "HH:MM" (24h) zijn')
      .default("08:00"),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    timezone: z.string().default("Europe/Amsterdam"),
  })
  .superRefine((val, ctx) => {
    if (val.cadence === "WEEKLY" && val.dayOfWeek === undefined) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "WEEKLY vereist dayOfWeek (1-7)" });
    }
    if (val.cadence === "MONTHLY" && val.dayOfMonth === undefined) {
      ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "MONTHLY vereist dayOfMonth (1-28)" });
    }
    if (!isValidTimezone(val.timezone)) {
      ctx.addIssue({ code: "custom", path: ["timezone"], message: "Onbekende IANA-timezone" });
    }
    if (val.cadence === "EVERY_MINUTE" && !isDevCadenceAllowed()) {
      ctx.addIssue({ code: "custom", path: ["cadence"], message: "EVERY_MINUTE is alleen beschikbaar in dev" });
    }
  });

export const SCHEDULE_SELECT = {
  id: true,
  agentId: true,
  useCaseId: true,
  input: true,
  cadence: true,
  timeOfDay: true,
  dayOfWeek: true,
  dayOfMonth: true,
  timezone: true,
  enabled: true,
  nextRunAt: true,
  lastRunAt: true,
  createdByUserId: true,
  createdAt: true,
} satisfies Prisma.AgentScheduleSelect;

type ScheduleRow = Prisma.AgentScheduleGetPayload<{ select: typeof SCHEDULE_SELECT }>;

/** Serialisatie voor de UI — Dates naar ISO, Json-velden passthrough. */
export function serializeSchedule(schedule: ScheduleRow) {
  return {
    ...schedule,
    nextRunAt: schedule.nextRunAt.toISOString(),
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    createdAt: schedule.createdAt.toISOString(),
  };
}
