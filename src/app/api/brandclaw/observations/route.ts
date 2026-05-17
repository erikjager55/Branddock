// =============================================================
// GET /api/brandclaw/observations
//
// List workspace-scoped StrategyObservation rows met optional filters.
// Phase A: support dimension + severity + dismissed filters.
//
// Query params:
//   - dimension: 'voice_drift' | 'fidelity_decline' | etc. (optional, list-filter)
//   - severity:  'HIGH' | 'MEDIUM' | 'LOW' (optional)
//   - includeDismissed: 'true' | 'false' (default false — Tab 4 default view)
//   - limit: 1-100 (default 50)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import type { ObservationSeverity } from "@prisma/client";

const VALID_SEVERITIES: ObservationSeverity[] = ["HIGH", "MEDIUM", "LOW"];

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get("dimension")?.trim() || undefined;
    const severityParam = searchParams.get("severity")?.trim().toUpperCase();
    const severity =
      severityParam && VALID_SEVERITIES.includes(severityParam as ObservationSeverity)
        ? (severityParam as ObservationSeverity)
        : undefined;
    const includeDismissed = searchParams.get("includeDismissed") === "true";
    const limitRaw = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 100
        ? Math.floor(limitRaw)
        : 50;

    const observations = await prisma.strategyObservation.findMany({
      where: {
        workspaceId,
        ...(dimension ? { dimension } : {}),
        ...(severity ? { severity } : {}),
        ...(includeDismissed ? {} : { dismissedAt: null }),
      },
      select: {
        id: true,
        dimension: true,
        severity: true,
        confidence: true,
        summary: true,
        evidence: true,
        agentVersion: true,
        promptVersion: true,
        createdAt: true,
        markedReadAt: true,
        markedActedAt: true,
        dismissedAt: true,
        dismissReason: true,
        runId: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    // Inclusive run-summary voor de meest recente run zodat UI "last
    // run X dagen geleden" kan tonen zonder N+1 query.
    const lastRun = await prisma.strategyObservationRun.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        totalCostUsd: true,
        latencyMs: true,
        agentVersion: true,
      },
    });

    return NextResponse.json({ observations, lastRun });
  } catch (err) {
    console.error("[GET /api/brandclaw/observations]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
