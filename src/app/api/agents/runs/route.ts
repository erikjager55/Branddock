// =============================================================
// GET /api/agents/runs — workspace-scoped runs-list (results-inbox).
// Cached (OVERVIEW-TTL); invalidatie via prefixes.agents op elke mutatie.
// =============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { setCache, cachedJson } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = cacheKeys.agents.runs(workspaceId);
    const hit = cachedJson(cacheKey);
    if (hit) return hit;

    const runs = await prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        agentId: true,
        status: true,
        triggerType: true,
        latencyMs: true,
        totalCostUsd: true,
        truncated: true,
        error: true,
        createdAt: true,
        completedAt: true,
        artifacts: {
          select: {
            id: true,
            type: true,
            title: true,
            fidelityScore: true,
            acceptedAt: true,
            dismissedAt: true,
          },
        },
      },
    });

    const data = {
      runs: runs.map((run) => ({
        ...run,
        // Prisma Decimal serialiseert als string — inbox-UI pint op numeriek.
        totalCostUsd: Number(run.totalCostUsd),
      })),
    };

    setCache(cacheKey, data, CACHE_TTL.OVERVIEW);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/agents/runs]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
