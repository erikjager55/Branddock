// =============================================================
// POST /api/agents/runs/[runId]/confirm — proposal-goedkeuring
// (agents-motor-wiring; ADR D6-verfijning).
//
// Agent-runs voeren write-tools nooit zelf uit: ze eindigen in
// AWAITING_CONFIRMATION met PROPOSAL-artefacten. Deze route voert een
// goedgekeurd proposal uit via de Claw-tool-registry — verplicht
// `getToolByName(...).execute(...)`, géén eigen switch (task-risico:
// confirm-semantiek-drift tussen Claw- en agents-pad).
//
// Content-Creator-specialisatie: ná een goedgekeurde create_deliverable
// draait de volledige contentgeneratie-pipeline hier (nooit in een
// loop-turn — voorkomt dubbele generatie-triggers); de F-VAL-score uit
// de pipeline landt op een LINK-artefact naar het deliverable.
// =============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { getToolByName } from "@/lib/claw/tools/registry";
import { orchestrateContentGeneration } from "@/lib/ai/canvas-orchestrator";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// Contentgeneratie ná approve kan minuten duren (zelfde budget als de run-route).
export const maxDuration = 800;

const bodySchema = z.object({
  artifactId: z.string().min(1),
  approved: z.boolean(),
});

/** Domein-invalidatie per uitgevoerde tool — spiegel van de write-effecten. */
const TOOL_CACHE_PREFIXES: Record<string, Array<(wsId: string) => string>> = {
  create_campaign: [cacheKeys.prefixes.campaigns, cacheKeys.prefixes.dashboard],
  create_deliverable: [cacheKeys.prefixes.campaigns, cacheKeys.prefixes.studio],
  update_deliverable_brief: [cacheKeys.prefixes.campaigns, cacheKeys.prefixes.studio],
  start_alignment_scan: [cacheKeys.prefixes.alignment],
  start_trend_scan: [cacheKeys.prefixes.trendRadar],
};

export async function POST(
  request: Request,
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body — expected { artifactId, approved }" },
        { status: 400 },
      );
    }

    const run = await prisma.agentRun.findFirst({ where: { id: runId, workspaceId } });
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const artifact = await prisma.agentArtifact.findFirst({
      where: { id: parsed.data.artifactId, runId: run.id, workspaceId, type: "PROPOSAL" },
    });
    if (!artifact) {
      return NextResponse.json({ error: "Proposal artifact not found" }, { status: 404 });
    }
    if (artifact.acceptedAt || artifact.dismissedAt) {
      return NextResponse.json({ error: "Proposal is already resolved" }, { status: 400 });
    }

    const content = (artifact.content ?? {}) as Record<string, unknown>;
    const toolName = typeof content.toolName === "string" ? content.toolName : null;
    const toolParams =
      content.params && typeof content.params === "object" && !Array.isArray(content.params)
        ? (content.params as Record<string, unknown>)
        : {};
    if (!toolName) {
      return NextResponse.json({ error: "Malformed proposal — missing toolName" }, { status: 400 });
    }

    // ─── Afwijzen ────────────────────────────────────────────
    if (!parsed.data.approved) {
      await prisma.agentArtifact.update({
        where: { id: artifact.id },
        data: { dismissedAt: new Date() },
      });
      const runStatus = await settleRunStatus(run.id, workspaceId);
      invalidateCache(cacheKeys.prefixes.agents(workspaceId));
      return NextResponse.json({ executed: false, runStatus });
    }

    // ─── Goedkeuren: uitvoeren via de Claw-registry ──────────
    const toolDef = getToolByName(toolName);
    if (!toolDef) {
      return NextResponse.json(
        { error: `Tool '${toolName}' is not registered` },
        { status: 400 },
      );
    }

    let result: unknown;
    try {
      result = await toolDef.execute(toolParams, { workspaceId, userId: session.user.id });
    } catch (err) {
      // Executie-fout: proposal blijft pending zodat de user kan retryen.
      const message = err instanceof Error ? err.message : "Tool execution failed";
      return NextResponse.json({ executed: false, error: message, runStatus: run.status });
    }

    await prisma.agentArtifact.update({
      where: { id: artifact.id },
      data: { acceptedAt: new Date() },
    });

    void emitAgentOutputAccepted({
      workspaceId,
      artifactId: artifact.id,
      artifactType: "PROPOSAL",
      runId: run.id,
      agentId: run.agentId,
    }).catch(() => {
      /* logged binnen trackEvent */
    });

    // Content-Creator: goedgekeurd deliverable → volledige pipeline draaien
    // (incl. F-VAL + auto-iterate ín de pipeline) + LINK-artefact met score.
    let generation: { fidelityScore: number | null; error: string | null } | null = null;
    const deliverableId =
      toolName === "create_deliverable" &&
      result &&
      typeof result === "object" &&
      typeof (result as Record<string, unknown>).deliverableId === "string"
        ? ((result as Record<string, unknown>).deliverableId as string)
        : null;

    if (deliverableId) {
      generation = await runDeliverableGeneration(deliverableId, workspaceId);
      const title =
        typeof (result as Record<string, unknown>).deliverableTitle === "string"
          ? ((result as Record<string, unknown>).deliverableTitle as string)
          : "Deliverable";
      await prisma.agentArtifact.create({
        data: {
          workspaceId,
          runId: run.id,
          type: "LINK",
          title: `Created: ${title}`,
          content: {
            entityType: "deliverable",
            entityId: deliverableId,
            label: title,
            ...(generation.error ? { generationError: generation.error } : {}),
            ...(generation.fidelityScore !== null && generation.fidelityScore < 70
              ? { belowThreshold: true }
              : {}),
          },
          fidelityScore: generation.fidelityScore,
        },
      });
    }

    const runStatus = await settleRunStatus(run.id, workspaceId);

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    for (const prefix of TOOL_CACHE_PREFIXES[toolName] ?? []) {
      invalidateCache(prefix(workspaceId));
    }

    return NextResponse.json({
      executed: true,
      result,
      runStatus,
      ...(generation
        ? { generation: { fidelityScore: generation.fidelityScore, error: generation.error } }
        : {}),
    });
  } catch (err) {
    console.error("[POST /api/agents/runs/[runId]/confirm]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Zet de run op COMPLETED zodra er geen open proposals meer zijn.
 * Returnt de actuele run-status.
 */
async function settleRunStatus(runId: string, workspaceId: string): Promise<string> {
  const pending = await prisma.agentArtifact.count({
    where: { runId, workspaceId, type: "PROPOSAL", acceptedAt: null, dismissedAt: null },
  });
  if (pending > 0) return "AWAITING_CONFIRMATION";
  const updated = await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "COMPLETED" },
  });
  return updated.status;
}

/**
 * Draait de canvas-pipeline voor een zojuist aangemaakt deliverable en
 * vangt de F-VAL-score uit de events (patroon: bulk-generate consumer).
 * Fail-soft: een generatie-fout maakt de confirm niet ongedaan — het
 * deliverable bestaat en is via de Canvas alsnog te genereren.
 */
async function runDeliverableGeneration(
  deliverableId: string,
  workspaceId: string,
): Promise<{ fidelityScore: number | null; error: string | null }> {
  let fidelityScore: number | null = null;
  let generationError: string | null = null;
  try {
    const generator = orchestrateContentGeneration(deliverableId, workspaceId);
    for await (const event of generator) {
      if (event.event === "fidelity_score_complete") {
        const data = (event.data ?? {}) as Record<string, unknown>;
        if (typeof data.compositeScore === "number") {
          fidelityScore = data.compositeScore;
        }
      } else if (event.event === "error") {
        const data = (event.data ?? {}) as Record<string, unknown>;
        generationError =
          typeof data.message === "string" ? data.message : "Content generation failed";
        break;
      }
    }
    if (!generationError) {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "IN_PROGRESS" },
      });
    }
  } catch (err) {
    generationError = err instanceof Error ? err.message : "Content generation failed";
    console.warn("[agents confirm] deliverable generation failed", {
      deliverableId,
      message: generationError,
    });
  }
  return { fidelityScore, error: generationError };
}

async function emitAgentOutputAccepted(args: {
  workspaceId: string;
  artifactId: string;
  artifactType: string;
  runId: string;
  agentId: string;
}): Promise<void> {
  const { trackEvent } = await import("@/lib/analytics/posthog");
  await trackEvent({
    event: "agent_output_accepted",
    workspaceId: args.workspaceId,
    properties: {
      artifact_id: args.artifactId,
      artifact_type: args.artifactType,
      run_id: args.runId,
      agent_id: args.agentId,
    },
  });
}
