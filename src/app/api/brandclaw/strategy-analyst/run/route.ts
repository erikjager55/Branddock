// =============================================================
// POST /api/brandclaw/strategy-analyst/run
//
// Strategy Analyst manual trigger (Phase A). User klikt "Run Analyst"
// in Brand Alignment Tab 4 → runStrategyAnalyst() draait + returns
// runId + observations-count + cost-summary.
//
// Synchroon endpoint v1 — caller wacht maximaal 5 min (orchestrator
// hard-timeout). UI toont loading-spinner. Voor Phase C komt async-
// trigger (returns runId direct, observations via polling).
//
// Rate-limit + auth gegeven door bestaande middleware (zelfde patroon
// als andere AI-routes in deze codebase).
// =============================================================

import { NextResponse } from "next/server";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { runStrategyAnalyst } from "@/lib/brandclaw/nodes/strategy-analyst";

export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const result = await runStrategyAnalyst({
      workspaceId,
      triggerType: "manual",
      triggerSource: session.user.id,
    });

    return NextResponse.json({
      runId: result.runId,
      observationsCount: result.observations.length,
      latencyMs: result.latencyMs,
      totalCostUsd: result.totalCostUsd,
      truncated: result.truncated,
      toolCallCount: result.toolCallTrace.length,
    });
  } catch (err) {
    console.error("[POST /api/brandclaw/strategy-analyst/run]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
