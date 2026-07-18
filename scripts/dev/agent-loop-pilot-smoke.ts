// Loop-pilot (BC-1) smoke — echte runAgent-run op de dev-workspace:
// signalen → REPORT + max 3 propose-only create_deliverable-voorstellen,
// daarna het confirm-pad voor één voorstel t/m echte canvas-generatie.
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/agent-loop-pilot-smoke.ts

import { prisma } from "../../src/lib/prisma";
import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { getToolByName } from "../../src/lib/claw/tools/registry";
import { orchestrateContentGeneration } from "../../src/lib/ai/canvas-orchestrator";

const WS = process.env.LOOP_WS ?? "cmnomsobx009q44msn0gpw7vb"; // Better Brands dev
const USER_ID = "demo-user-erik-001";
const PILOT_TYPES = new Set(["linkedin-post", "blog-post"]);

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  console.log("# Loop-pilot smoke (BC-1)\n");

  // ── 1. Echte run: signalen → rapport + voorstellen ────────────────────
  const run = await runAgent({
    workspaceId: WS, userId: USER_ID, agentId: "loop-pilot", useCaseId: "weekly-loop",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  console.log(`  status=${run.status} cost=$${run.totalCostUsd} latency=${Math.round(run.latencyMs / 1000)}s`);
  check("run rondt af (COMPLETED of AWAITING_CONFIRMATION)",
    run.status === "COMPLETED" || run.status === "AWAITING_CONFIRMATION", run.status);
  // Runaway-guard, geen productgrens: 4 queries + ≤3 proposals + lang rapport ≈ $0,25.
  check("kosten ≤ $0,40", run.totalCostUsd <= 0.4, `$${run.totalCostUsd}`);

  const artifacts = await prisma.agentArtifact.findMany({
    where: { runId: run.runId }, select: { id: true, type: true, title: true, content: true },
  });
  console.log("  artifacts:", artifacts.map((a) => `${a.type}:${a.title}`).join(" | "));
  check("precies één REPORT", artifacts.filter((a) => a.type === "REPORT").length === 1);
  check("≥1 TABLE (signaal-queries)", artifacts.some((a) => a.type === "TABLE"));

  const proposals = artifacts.filter((a) => a.type === "PROPOSAL");
  check("0-3 voorstellen (harde BC-1-cap)", proposals.length <= 3, `${proposals.length}`);
  for (const p of proposals) {
    const content = (p.content ?? {}) as Record<string, unknown>;
    const params = (content.params ?? {}) as Record<string, unknown>;
    check(`voorstel "${p.title}" = create_deliverable`, content.toolName === "create_deliverable", String(content.toolName));
    check(`voorstel-type in pilot-scope (linkedin/blog)`, PILOT_TYPES.has(String(params.contentType)), String(params.contentType));
  }

  const md = String(((artifacts.find((a) => a.type === "REPORT")?.content ?? {}) as Record<string, unknown>).markdown ?? "");
  check("rapport is substantieel (>200 chars)", md.length > 200, `${md.length}`);
  const tx = await prisma.creditTransaction.findMany({
    where: { workspaceId: WS, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  check("0 credits op de loop-run zelf", !tx.some((t) => JSON.stringify(t).includes(run.runId)), `${tx.length} tx`);
  console.log("── REPORT (eerste 1200 chars):\n" + md.slice(0, 1200));

  // ── 2. Confirm-pad: één voorstel → echte deliverable + generatie ──────
  let deliverableId: string | null = null;
  if (proposals.length > 0) {
    console.log("\n## Confirm-pad — eerste voorstel\n");
    const tool = getToolByName("create_deliverable");
    const content = (proposals[0].content ?? {}) as Record<string, unknown>;
    const parsed = tool!.inputSchema.safeParse(content.params);
    check("voorstel-params valideren tegen tool-schema", parsed.success);
    if (parsed.success) {
      await prisma.agentArtifact.update({ where: { id: proposals[0].id }, data: { acceptedAt: new Date() } });
      const execRes = (await tool!.execute(parsed.data as Record<string, unknown>, { workspaceId: WS, userId: USER_ID })) as Record<string, unknown>;
      check("confirm-execute maakt deliverable", typeof execRes.deliverableId === "string", JSON.stringify(execRes).slice(0, 120));
      if (typeof execRes.deliverableId === "string") {
        deliverableId = execRes.deliverableId;
        let generated = false;
        let genError: string | null = null;
        try {
          for await (const event of orchestrateContentGeneration(deliverableId, WS)) {
            if (event.event === "complete") generated = true;
            if (event.event === "error") { genError = JSON.stringify(event.data).slice(0, 150); break; }
          }
        } catch (e) { genError = e instanceof Error ? e.message : "unknown"; }
        check("canvas-generatie draait op het loop-voorstel", generated, genError ?? "");
      }
    }
  } else {
    console.log("\n(geen voorstellen deze run — confirm-pad overgeslagen; geldig BC-1-resultaat)");
  }

  // ── 3. Cleanup — smoke-artefacten weg uit de dev-DB ───────────────────
  if (deliverableId) {
    await prisma.deliverable.delete({ where: { id: deliverableId } }).catch(() => undefined);
  }
  await prisma.agentArtifact.deleteMany({ where: { runId: run.runId } });
  await prisma.agentRun.delete({ where: { id: run.runId } }).catch(() => undefined);

  console.log(`\n== ${pass} PASS / ${fail} FAIL ==`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
