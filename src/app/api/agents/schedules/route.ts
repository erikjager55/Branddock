// =============================================================
// /api/agents/schedules — lijst (GET) + aanmaken (POST) van
// terugkerende agent-runs (agents-scheduling, slice 2).
//
// POST valideert agentId/useCaseId tegen de code-registry en de
// cadence-velden tegen de cadence-algebra; nextRunAt komt uit
// computeNextRunAt (zelfde bron als de cron-enqueue-claim).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { enforceNotLocked } from "@/lib/stripe/enforcement";
import { getVisibleAgentDefinition } from "@/lib/agents/registry";
import { sanitizeContextSelection } from "@/lib/agents/registry/context-selection";
import { computeNextRunAt } from "@/lib/agents/schedules/cadence";
import {
  SCHEDULE_SELECT,
  scheduleFieldsSchema,
  serializeSchedule,
} from "@/lib/agents/schedules/schedule-api";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

/** Elke run kost echt AI-budget en niet-billable agents chargen geen credits —
 * zonder plafond is schedule-spam onbegrensde spend (review-W 2026-07-13). */
const MAX_SCHEDULES_PER_WORKSPACE = 20;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get("agentId");

    // Alleen de ongefilterde lijst cachen (kleine tabel; filter is goedkoop).
    const cacheKey = agentId ? null : cacheKeys.agents.schedules(workspaceId);
    if (cacheKey) {
      const hit = cachedJson(cacheKey);
      if (hit) return hit;
    }

    const schedules = await prisma.agentSchedule.findMany({
      where: { workspaceId, ...(agentId ? { agentId } : {}) },
      orderBy: { createdAt: "desc" },
      select: SCHEDULE_SELECT,
    });

    const data = { schedules: schedules.map(serializeSchedule) };
    if (cacheKey) setCache(cacheKey, data, CACHE_TTL.OVERVIEW);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/agents/schedules]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Member+: een schedule geeft terugkerend AI-budget uit.
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    const trialLock = await enforceNotLocked(workspaceId);
    if (trialLock) return trialLock;

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = scheduleFieldsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const scheduleCount = await prisma.agentSchedule.count({ where: { workspaceId } });
    if (scheduleCount >= MAX_SCHEDULES_PER_WORKSPACE) {
      return NextResponse.json(
        { error: `Schedule limit reached (${MAX_SCHEDULES_PER_WORKSPACE} per workspace) — delete an existing schedule first.` },
        { status: 400 },
      );
    }

    const def = getVisibleAgentDefinition(parsed.data.agentId);
    if (!def) {
      return NextResponse.json({ error: `Unknown agent '${parsed.data.agentId}'` }, { status: 400 });
    }
    if (parsed.data.useCaseId && !def.useCases.some((u) => u.id === parsed.data.useCaseId)) {
      return NextResponse.json(
        { error: `Unknown use-case '${parsed.data.useCaseId}' for agent '${def.id}'` },
        { status: 400 },
      );
    }

    const cadenceFields = {
      cadence: parsed.data.cadence,
      timeOfDay: parsed.data.timeOfDay,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
      dayOfMonth: parsed.data.dayOfMonth ?? null,
      timezone: parsed.data.timezone,
    };
    const sanitizedSelection = sanitizeContextSelection(parsed.data.contextSelection);

    const schedule = await prisma.agentSchedule.create({
      data: {
        workspaceId,
        agentId: def.id,
        useCaseId: parsed.data.useCaseId ?? null,
        input: (parsed.data.input ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        contextSelection: sanitizedSelection
          ? (sanitizedSelection as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ...cadenceFields,
        nextRunAt: computeNextRunAt(cadenceFields, new Date()),
        createdByUserId: session.user.id,
      },
      select: SCHEDULE_SELECT,
    });

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    return NextResponse.json({ schedule: serializeSchedule(schedule) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/agents/schedules]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
