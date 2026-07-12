/**
 * Agents confirm-pad — bevestigt de openstaande PROPOSALs van de dogfood-sweep
 * (content-creator + strategist) precies zoals de confirm-route dat doet, maar
 * headless. Levert het zuivere guardrail-#1-datapunt: de F-VAL-score van
 * agent-geproduceerde EINDcontent (via de Canvas-pipeline op bevestigen),
 * naast een tweede kosten-datapunt (generatie bovenop orchestratie).
 *
 * Spiegelt het approve-pad van
 * `src/app/api/agents/runs/[runId]/confirm/route.ts`: atomische claim →
 * getToolByName().execute() → settle → runDeliverableGeneration → LINK-artefact
 * → confirm-time credit-charge (Gate C, Fase 3 — no-op bij credits-uit/unlimited-org).
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agents-confirm-path.ts
 */

import { orchestrateContentGeneration } from "../../src/lib/ai/canvas-orchestrator";
import { getAgentDefinition } from "../../src/lib/agents/registry";
import { getToolByName } from "../../src/lib/claw/tools/registry";
import { prisma } from "../../src/lib/prisma";
import { chargeAfter } from "../../src/lib/billing/credits/meter-generation";

const BB = "cmnomsobx009q44msn0gpw7vb";
const USER_ID = "demo-user-erik-001";

/** Draai de canvas-pipeline en vang de F-VAL-score uit de events (route-patroon). */
async function runDeliverableGeneration(
  deliverableId: string,
): Promise<{ fidelityScore: number | null; error: string | null }> {
  let fidelityScore: number | null = null;
  let error: string | null = null;
  try {
    for await (const event of orchestrateContentGeneration(deliverableId, BB)) {
      if (event.event === "fidelity_score_complete") {
        const data = (event.data ?? {}) as Record<string, unknown>;
        if (typeof data.compositeScore === "number") fidelityScore = data.compositeScore;
      } else if (event.event === "error") {
        const data = (event.data ?? {}) as Record<string, unknown>;
        error = typeof data.message === "string" ? data.message : "generation failed";
        break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return { fidelityScore, error };
}

async function confirmRun(agentId: string): Promise<void> {
  const run = await prisma.agentRun.findFirst({
    where: { workspaceId: BB, agentId, status: "AWAITING_CONFIRMATION" },
    orderBy: { createdAt: "desc" },
  });
  if (!run) {
    console.log(`\n[${agentId}] geen AWAITING_CONFIRMATION-run gevonden — skip.`);
    return;
  }
  const artifact = await prisma.agentArtifact.findFirst({
    where: { runId: run.id, workspaceId: BB, type: "PROPOSAL", acceptedAt: null, dismissedAt: null },
  });
  if (!artifact) {
    console.log(`\n[${agentId}] run ${run.id.slice(-6)} heeft geen open PROPOSAL — skip.`);
    return;
  }

  const content = (artifact.content ?? {}) as Record<string, unknown>;
  const toolName = typeof content.toolName === "string" ? content.toolName : null;
  const toolParams =
    content.params && typeof content.params === "object" && !Array.isArray(content.params)
      ? (content.params as Record<string, unknown>)
      : {};
  console.log(`\n[${agentId}] run ${run.id.slice(-6)} · PROPOSAL tool="${toolName}"`);

  if (!toolName) return console.log("  malformed proposal — geen toolName");
  const toolDef = getToolByName(toolName);
  if (!toolDef) return console.log(`  tool '${toolName}' niet geregistreerd`);
  const check = toolDef.inputSchema.safeParse(toolParams);
  if (!check.success) return console.log(`  params-validatie faalde: ${check.error.issues[0]?.message}`);

  // Atomische claim (TOCTOU-guard, route-parity).
  const claim = await prisma.agentArtifact.updateMany({
    where: { id: artifact.id, acceptedAt: null, dismissedAt: null },
    data: { acceptedAt: new Date() },
  });
  if (claim.count !== 1) return console.log("  al afgehandeld (claim verloren)");

  let result: unknown;
  try {
    result = await toolDef.execute(check.data as Record<string, unknown>, { workspaceId: BB, userId: USER_ID });
  } catch (e) {
    await prisma.agentArtifact.updateMany({ where: { id: artifact.id, dismissedAt: null }, data: { acceptedAt: null } });
    return console.log(`  execute faalde: ${e instanceof Error ? e.message : String(e)}`);
  }
  const res = (result ?? {}) as Record<string, unknown>;
  if (res.success === false) {
    await prisma.agentArtifact.updateMany({ where: { id: artifact.id, dismissedAt: null }, data: { acceptedAt: null } });
    return console.log(`  soft-fail: ${res.message ?? "tool reported failure"}`);
  }

  // Settle run → COMPLETED (geen open proposals meer).
  const pending = await prisma.agentArtifact.count({
    where: { runId: run.id, workspaceId: BB, type: "PROPOSAL", acceptedAt: null, dismissedAt: null },
  });
  if (pending === 0) await prisma.agentRun.update({ where: { id: run.id }, data: { status: "COMPLETED" } });

  // create_deliverable → canvas-generatie + F-VAL (het guardrail-datapunt).
  if (toolName === "create_deliverable" && typeof res.deliverableId === "string") {
    console.log(`  deliverable ${res.deliverableId.slice(-6)} aangemaakt — canvas-generatie draait ...`);
    const gen = await runDeliverableGeneration(res.deliverableId);
    console.log(`  → EINDCONTENT F-VAL: ${gen.fidelityScore ?? "—"}${gen.error ? ` (err: ${gen.error})` : ""}`);
    await prisma.agentArtifact.create({
      data: {
        workspaceId: BB, runId: run.id, type: "LINK",
        title: `Created: ${typeof res.deliverableTitle === "string" ? res.deliverableTitle : "Deliverable"}`,
        content: { entityType: "deliverable", entityId: res.deliverableId, label: res.deliverableTitle ?? "Deliverable" },
        fidelityScore: gen.fidelityScore,
      },
    });
    // Gate C route-parity (Fase 3): confirm-time charge — flat 'agent-deliverable',
    // idempotent per run+deliverable. No-op bij credits-uit of unlimited-org.
    if (getAgentDefinition(run.agentId)?.billable) {
      await chargeAfter(
        {
          workspaceId: BB,
          action: "agent-deliverable",
          feature: `agent:${run.agentId}`,
          idempotencyKey: `agent-confirm:${run.id}:${res.deliverableId}`,
        },
        { count: 1 },
      ).catch(() => {});
      console.log("  confirm-time charge aangeroepen (agent-deliverable, route-parity)");
    }
  } else if (toolName === "create_campaign" && typeof res.campaignId === "string") {
    console.log(`  campagne ${res.campaignId.slice(-6)} aangemaakt (strategist write-through, geen content-F-VAL)`);
  } else {
    console.log(`  uitgevoerd — resultaat: ${JSON.stringify(res).slice(0, 120)}`);
  }
}

async function main() {
  console.log("=== Agents confirm-pad · Better Brands ===");
  await confirmRun("content-creator");
  await confirmRun("strategist");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL", e instanceof Error ? e.stack : String(e));
  await prisma.$disconnect();
  process.exit(1);
});
