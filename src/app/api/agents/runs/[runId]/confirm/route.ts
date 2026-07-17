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
import { drainDeliverableGeneration } from "@/lib/content/headless-create";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { chargeAfter } from "@/lib/billing/credits/meter-generation";
import { getAgentDefinition } from "@/lib/agents/registry";
import { enforceNotLocked } from "@/lib/stripe/enforcement";

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
  start_alignment_scan: [cacheKeys.prefixes.alignment, cacheKeys.prefixes.dashboard],
  start_trend_scan: [cacheKeys.prefixes.trendRadar],
  remember_agent_memory: [cacheKeys.prefixes.agents],
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

    // Fase 4: verlopen no-card trial → geen tool-executes/canvas-generatie
    // meer via confirm (read-only-lock).
    const trialLock = await enforceNotLocked(workspaceId);
    if (trialLock) return trialLock;

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
        // Self-heal: mocht een eerdere confirm ná zijn claim gecrasht zijn
        // vóór settle, dan repareert deze retry de run-status alsnog.
        const healedStatus = await settleRunStatus(run.id, workspaceId);
        invalidateCache(cacheKeys.prefixes.agents(workspaceId));
        return NextResponse.json(
          { error: "Proposal is already resolved", runStatus: healedStatus },
          { status: 409 },
        );
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
      // Self-heal (zie reject-pad): settle + invalidatie zodat een run nooit
      // permanent AWAITING_CONFIRMATION blijft met nul open proposals.
      const healedStatus = await settleRunStatus(run.id, workspaceId);
      invalidateCache(cacheKeys.prefixes.agents(workspaceId));
      return NextResponse.json(
        { error: "Proposal is already resolved", runStatus: healedStatus },
        { status: 409 },
      );
    }

    const releaseClaim = async () => {
      try {
        const released = await prisma.agentArtifact.updateMany({
          where: { id: artifact.id, dismissedAt: null },
          data: { acceptedAt: null },
        });
        if (released.count === 1) {
          // Race-venster (review-ronde 4): een concurrent 409-self-heal kan
          // de run al COMPLETED hebben gezet terwijl deze claim-release het
          // proposal heropent — status moet mee terug, anders is de run
          // COMPLETED mét een open proposal.
          await prisma.agentRun.update({
            where: { id: run.id },
            data: { status: "AWAITING_CONFIRMATION" },
          });
          invalidateCache(cacheKeys.prefixes.agents(workspaceId));
        }
      } catch {
        console.warn("[agents confirm] failed to release claim after execute failure", {
          artifactId: artifact.id,
        });
      }
    };

    let result: unknown;
    try {
      // agentId server-owned vanaf de run-rij — memory-writes scopen erop.
      result = await toolDef.execute(paramsCheck.data as Record<string, unknown>, {
        workspaceId,
        userId: session.user.id,
        agentId: run.agentId,
      });
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
      // Een execute die zélf al genereerde (create_deliverable met generate:true,
      // P3.0b) niet nogmaals draaien — dubbele generatie = dubbele credits.
      const resultRecord = result as Record<string, unknown>;
      const alreadyGenerated = resultRecord.generated === true;
      generation = alreadyGenerated
        ? {
            fidelityScore:
              typeof resultRecord.fidelityScore === "number" ? resultRecord.fidelityScore : null,
            error: null,
          }
        : await withGenerationDeadline(drainDeliverableGeneration(deliverableId, workspaceId), deliverableId);
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

      // Gate C (Fase 3): confirm-time charge. Content-producerende agents leveren
      // hun deliverable pas ná approve — de run zelf eindigt AWAITING_CONFIRMATION,
      // dus run-agent boekt niet. Flat 'agent-deliverable', idempotent per
      // run+deliverable (voorkomt dubbel-charge bij een confirm-retry).
      if (getAgentDefinition(run.agentId)?.billable) {
        await chargeAfter(
          {
            workspaceId,
            action: "agent-deliverable",
            feature: `agent:${run.agentId}`,
            idempotencyKey: `agent-confirm:${run.id}:${deliverableId}`,
          },
          { count: 1 },
        ).catch(() => {});
      }
    }

    // create_campaign: LINK-artefact naar de campagne + (Strategist)
    // strategie-write-through — het strategie-REPORT van de run landt als
    // strategicApproach op de campagne, zodat het resultaat óók in de
    // Campaigns-module leeft (domain-first, dogfood-feedback 2026-07-06).
    const campaignId =
      toolName === "create_campaign" &&
      result &&
      typeof result === "object" &&
      typeof (result as Record<string, unknown>).campaignId === "string"
        ? ((result as Record<string, unknown>).campaignId as string)
        : null;

    if (campaignId) {
      const campaignTitle =
        typeof (result as Record<string, unknown>).campaignTitle === "string"
          ? ((result as Record<string, unknown>).campaignTitle as string)
          : "Campaign";
      let strategyAttached = false;
      if (run.agentId === "strategist") {
        // Langste REPORT van de run = het strategie-rapport (korte
        // narratief-fallbacks kwalificeren niet als campagne-strategie).
        const reports = await prisma.agentArtifact.findMany({
          where: { runId: run.id, workspaceId, type: "REPORT", dismissedAt: null },
        });
        const markdown = reports
          .map((r) => {
            const c = (r.content ?? {}) as Record<string, unknown>;
            // Generieke antwoord-fallbacks zijn geen strategie-rapporten.
            if (c.answerFallback === true) return "";
            return typeof c.markdown === "string" ? c.markdown.trim() : "";
          })
          .sort((a, b) => b.length - a.length)[0] ?? "";
        if (markdown.length >= 500) {
          const updated = await prisma.campaign.updateMany({
            where: { id: campaignId, workspaceId },
            data: { strategicApproach: markdown.slice(0, 100_000) },
          });
          strategyAttached = updated.count === 1;
        }
      }
      await prisma.agentArtifact.create({
        data: {
          workspaceId,
          runId: run.id,
          type: "LINK",
          title: `Created: ${campaignTitle}`,
          content: {
            entityType: "campaign",
            entityId: campaignId,
            label: campaignTitle,
            ...(strategyAttached ? { strategyAttached: true } : {}),
          },
        },
      });
      invalidateCache(cacheKeys.prefixes.agents(workspaceId));
      invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
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
