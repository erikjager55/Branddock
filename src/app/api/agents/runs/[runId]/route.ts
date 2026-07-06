// =============================================================
// GET /api/agents/runs/[runId] — run-detail incl. artefacten.
// Alleen terminale statussen worden gecachet: een RUNNING-run die
// gepolld wordt mag niet 60s blijven plakken.
// =============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { setCache, cachedJson } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "AWAITING_CONFIRMATION"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = cacheKeys.agents.runDetail(workspaceId, runId);
    const hit = cachedJson(cacheKey);
    if (hit) return hit;

    // findFirst met workspace-filter — multi-tenant isolatie vóór 404.
    const run = await prisma.agentRun.findFirst({
      where: { id: runId, workspaceId },
      include: { artifacts: true },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const data = { run: { ...run, totalCostUsd: Number(run.totalCostUsd) } };

    if (TERMINAL_STATUSES.has(run.status)) {
      setCache(cacheKey, data, CACHE_TTL.DETAIL);
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/agents/runs/[runId]]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
