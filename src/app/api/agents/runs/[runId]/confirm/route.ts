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
import { getServerSession } from "@/lib/auth-server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
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
    // Zelfde policy als /api/claw/confirm: mutaties uitvoeren is member+ —
    // viewers zijn read-only. requireWorkspaceRole dekt sessie + membership.
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;
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

    const content = (artifact.content ?? {}) as Record<string, unknown>;
    const toolName = typeof content.toolName === "string" ? content.toolName : null;
    const toolParams =
      content.params && typeof content.params === "object" && !Array.isArray(content.params)
        ? (content.params as Record<string, unknown>)
        : {};

    // ─── Afwijzen ────────────────────────────────────────────
    // Bewust vóór de toolName-guard: een malformed proposal moet altijd
    // afwijsbaar blijven, anders telt settleRunStatus hem eeuwig als pending.
    if (!parsed.data.approved) {
      // Atomische claim: een concurrent approve/reject verliest hier (409).
      const claim = await prisma.agentArtifact.updateMany({
        where: { id: artifact.id, acceptedAt: null, dismissedAt: null },
        data: { dismissedAt: new Date() },
      });
      if (claim.count !== 1) {
        return NextResponse.json({ error: "Proposal is already resolved" }, { status: 409 });
      }
      const runStatus = await settleRunStatus(run.id, workspaceId);
      invalidateCache(cacheKeys.prefixes.agents(workspaceId));
      return NextResponse.json({ executed: false, runStatus });
    }

    // ─── Goedkeuren: uitvoeren via de Claw-registry ──────────
    if (!toolName) {
      return NextResponse.json({ error: "Malformed proposal — missing toolName" }, { status: 400 });
    }
    const toolDef = getToolByName(toolName);
    if (!toolDef) {
      return NextResponse.json(
        { error: `Tool '${toolName}' is not registered` },
        { status: 400 },
      );
    }
    // Defense-in-depth op de propose-only-garantie: alleen confirmatie-
    // plichtige tools zijn via proposals uitvoerbaar, en de persisted params
    // moeten het tool-schema halen (params zijn origineel model-output).
    if (!toolDef.requiresConfirmation) {
      return NextResponse.json(
        { error: `Tool '${toolName}' is not a confirmable write-tool` },
        { status: 400 },
      );
    }
    const paramsCheck = toolDef.inputSchema.safeParse(toolParams);
    if (!paramsCheck.success) {
      return NextResponse.json(
        { error: `Proposal params failed validation for '${toolName}'` },
        { status: 400 },
      );
    }

    // Atomische claim VÓÓR executie (TOCTOU-guard): een dubbelklik/concurrent
    // confirm kan de mutatie anders twee keer uitvoeren. Verliezer krijgt 409.
    const claim = await prisma.agentArtifact.updateMany({
      where: { id: artifact.id, acceptedAt: null, dismissedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ error: "Proposal is already resolved" }, { status: 409 });
    }

    const releaseClaim = async () => {
      try {
        await prisma.agentArtifact.updateMany({
          where: { id: artifact.id, dismissedAt: null },
          data: { acceptedAt: null },
        });
      } catch {
        console.warn("[agents confirm] failed to release claim after execute failure", {
          artifactId: artifact.id,
        });
      }
    };

    let result: unknown;
    try {
      result = await toolDef.execute(paramsCheck.data as Record<string, unknown>, { workspaceId, userId: session.user.id });
    } catch (err) {
      // Executie-fout: claim terugrollen zodat de user kan retryen; non-2xx
      // zodat clients dit niet als succes lezen.
      await releaseClaim();
      const message = err instanceof Error ? err.message : "Tool execution failed";
      return NextResponse.json(
        { executed: false, error: message, runStatus: run.status },
        { status: 502 },
      );
    }
    // Claw-parity: tools kunnen soft-failen met { success: false } i.p.v. throwen.
    if (result && typeof result === "object" && (result as Record<string, unknown>).success === false) {
      await releaseClaim();
      const softMessage =
        typeof (result as Record<string, unknown>).message === "string"
          ? ((result as Record<string, unknown>).message as string)
          : "Tool reported failure";
      return NextResponse.json(
        { executed: false, error: softMessage, runStatus: run.status },
        { status: 502 },
      );
    }

    void emitAgentOutputAccepted({
      workspaceId,
      artifactId: artifact.id,
      artifactType: "PROPOSAL",
      runId: run.id,
      agentId: run.agentId,
    }).catch(() => {
      /* logged binnen trackEvent */
    });

    // Settle + invalidatie VÓÓR de (minutenlange) generatie-stap: een crash
    // of platform-timeout tijdens de generatie mag de run niet permanent op
    // AWAITING_CONFIRMATION laten staan terwijl alle proposals resolved zijn.
    const runStatus = await settleRunStatus(run.id, workspaceId);
    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    for (const prefix of TOOL_CACHE_PREFIXES[toolName] ?? []) {
      invalidateCache(prefix(workspaceId));
    }

    // Content-Creator: goedgekeurd deliverable → volledige pipeline draaien
    // (incl. F-VAL + auto-iterate ín de pipeline) + LINK-artefact met score.
    // Fulfillment-status leeft op het deliverable zelf (Canvas); de run is
    // met het resolved proposal afgerond.
    let generation: { fidelityScore: number | null; error: string | null } | null = null;
    const deliverableId =
      toolName === "create_deliverable" &&
      result &&
      typeof result === "object" &&
      typeof (result as Record<string, unknown>).deliverableId === "string"
        ? ((result as Record<string, unknown>).deliverableId as string)
        : null;

    if (deliverableId) {
      generation = await withGenerationDeadline(runDeliverableGeneration(deliverableId, workspaceId), deliverableId);
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
      // Nieuw artefact + gegenereerde content → verse invalidatie.
      invalidateCache(cacheKeys.prefixes.agents(workspaceId));
      invalidateCache(cacheKeys.prefixes.studio(workspaceId));
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
 * Deadline om de generatie-consumptie: een hangende generator mag de route
 * niet tot de platform-kill (800s) laten doorlopen. Bij overschrijding is de
 * uitkomst "abandoned" — het deliverable bestaat en is via de Canvas alsnog
 * te genereren.
 */
const GENERATION_DEADLINE_MS = 10 * 60 * 1000;

async function withGenerationDeadline(
  promise: Promise<{ fidelityScore: number | null; error: string | null }>,
  deliverableId: string,
): Promise<{ fidelityScore: number | null; error: string | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<{ fidelityScore: number | null; error: string | null }>((resolve) => {
        timer = setTimeout(() => {
          console.warn("[agents confirm] deliverable generation abandoned past deadline", {
            deliverableId,
          });
          resolve({
            fidelityScore: null,
            error: `Content generation exceeded ${Math.round(GENERATION_DEADLINE_MS / 1000)}s and was abandoned — open the deliverable in the Canvas to (re)generate.`,
          });
        }, GENERATION_DEADLINE_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
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
