/**
 * Repurpose-smoke (task agent-repurposer) — bewijst de route-A-keten met
 * échte AI-runs op de lokale BB-workspace:
 *
 *  1. tool-unit: read_deliverable_content — happy path, workspace-isolatie,
 *     onbestaand id, truncatie >12k, hasContent=false.
 *  2. agent happy-path: repurpose-use-case → AWAITING_CONFIRMATION met per
 *     gevraagd type één PROPOSAL (sourceDeliverableId gezet, "Derived from"-
 *     regel) + REPORT.
 *  3. confirm-pad: één proposal bevestigen zoals de confirm-route →
 *     deliverable in de bron-campagne mét derivedFromId → generatie → F-VAL.
 *  4. edge: bron zonder content → nul proposals.
 *  5. edge: verboden typen (newsletter/tiktok) → geen proposals van die typen.
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agent-repurpose-smoke.ts
 */

import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { getToolByName } from "../../src/lib/claw/tools/registry";
import { orchestrateContentGeneration } from "../../src/lib/ai/canvas-orchestrator";
import { prisma } from "../../src/lib/prisma";
import type { ToolExecutionContext } from "../../src/lib/claw/claw.types";

const BB = "cmnomsobx009q44msn0gpw7vb";
const USER_ID = "demo-user-erik-001";
const ALLOWED = new Set(["linkedin-post", "twitter-thread", "linkedin-poll"]);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  [ok] ${label}`); }
  else { fail++; console.error(`  [x] ${label}`); }
}

const SOURCE_TEXT = `# Waarom duurzame merkstrategie geen kostenpost is

Veel mkb-ondernemers zien duurzaamheid als een verplicht nummer: iets voor het jaarverslag.
Better brands draait het om — duurzaamheid is de scherpste positionering die er is, mits je
hem verankert in je merk-DNA in plaats van in je marketingkalender.

## De kern: bewijs boven belofte
Consumenten prikken door claims heen. Het verschil tussen greenwashing en geloofwaardigheid
zit in aantoonbaarheid: laat zien wat je doet, meet wat het oplevert, en communiceer de
tussenstand — ook als die nog niet perfect is. Eerlijkheid over de reis wint van gepolijste
eindplaatjes.

## Drie stappen die morgen kunnen
1. Kies één meetbare duurzaamheidsbelofte die past bij je kernactiviteit.
2. Verwerk hem in je merkverhaal — niet als voetnoot maar als hoofdstuk.
3. Rapporteer elk kwartaal de voortgang, intern én extern.

Wie duurzaamheid behandelt als merkfundament in plaats van campagnethema bouwt een voorsprong
die concurrenten niet kunnen kopiëren met een grotere mediabudget.`;

async function main() {
  console.log("=== Repurpose-smoke · Better Brands (lokaal) ===");

  // ── Setup: bron-campagne + bron-deliverables ─────────────
  const campaign = await prisma.campaign.create({
    data: { workspaceId: BB, title: "_repurpose-smoke", slug: `repurpose-smoke-${Date.now()}`, type: "QUICK" },
  });
  const source = await prisma.deliverable.create({
    data: { campaignId: campaign.id, title: "Duurzame merkstrategie als voorsprong", contentType: "blog-post", status: "COMPLETED" },
  });
  await prisma.deliverableComponent.create({
    data: {
      deliverableId: source.id, componentType: "body", groupType: "variant", order: 0,
      variantGroup: "body", variantIndex: 0, isSelected: true,
      generatedContent: SOURCE_TEXT, status: "GENERATED", generatedAt: new Date(),
    },
  });
  const emptySource = await prisma.deliverable.create({
    data: { campaignId: campaign.id, title: "Lege bron (alleen brief)", contentType: "blog-post", status: "NOT_STARTED" },
  });
  const longSource = await prisma.deliverable.create({
    data: { campaignId: campaign.id, title: "Lange bron", contentType: "whitepaper", status: "COMPLETED" },
  });
  await prisma.deliverableComponent.create({
    data: {
      deliverableId: longSource.id, componentType: "body", groupType: "variant", order: 0,
      variantGroup: "body", variantIndex: 0, isSelected: true,
      generatedContent: "A".repeat(13_000), status: "GENERATED", generatedAt: new Date(),
    },
  });
  const created: string[] = [source.id, emptySource.id, longSource.id];

  try {
    // ── 1. Tool-unit ────────────────────────────────────────
    console.log("\n[1] read_deliverable_content — unit");
    const tool = getToolByName("read_deliverable_content");
    check("tool geregistreerd", !!tool);
    const ctx = { workspaceId: BB, userId: USER_ID } as ToolExecutionContext;
    const ok = (await tool!.execute({ deliverableId: source.id }, ctx)) as Record<string, unknown>;
    check("happy path: hasContent=true + campagne-meta", ok.hasContent === true && ok.campaignId === campaign.id && String(ok.content).includes("merk-DNA"));
    const missing = (await tool!.execute({ deliverableId: "cl_bestaat_niet" }, ctx)) as Record<string, unknown>;
    check("onbestaand id → 'Deliverable not found'", missing.error === "Deliverable not found");
    const foreignCtx = { workspaceId: "ws_andere_workspace", userId: USER_ID } as ToolExecutionContext;
    const foreign = (await tool!.execute({ deliverableId: source.id }, foreignCtx)) as Record<string, unknown>;
    check("cross-workspace → 'Deliverable not found' (geen leak)", foreign.error === "Deliverable not found");
    const long = (await tool!.execute({ deliverableId: longSource.id }, ctx)) as Record<string, unknown>;
    check("truncatie >12k: truncated=true, content ≤12k", long.truncated === true && String(long.content).length <= 12_000);
    const empty = (await tool!.execute({ deliverableId: emptySource.id }, ctx)) as Record<string, unknown>;
    check("lege bron: hasContent=false", empty.hasContent === false);

    // ── 2. Agent happy-path (echte AI) ──────────────────────
    console.log("\n[2] agent-run: repurpose naar linkedin-post + twitter-thread");
    const res = await runAgent({
      workspaceId: BB, userId: USER_ID, agentId: "content-creator", useCaseId: "repurpose-content",
      input: { message: `Repurpose the deliverable "${source.title}" (id: ${source.id}, campaign "_repurpose-smoke") into a linkedin-post and a twitter-thread.` },
      triggerType: "manual",
    });
    check("run AWAITING_CONFIRMATION", res.status === "AWAITING_CONFIRMATION");
    const artifacts = await prisma.agentArtifact.findMany({ where: { runId: res.runId }, orderBy: { createdAt: "asc" } });
    const proposals = artifacts.filter((a) => a.type === "PROPOSAL");
    check("exact 2 PROPOSALs", proposals.length === 2);
    check("≥1 REPORT", artifacts.some((a) => a.type === "REPORT"));
    const payloads = proposals.map((a) => a.content as Record<string, unknown>);
    const allSourced = payloads.every((p) => {
      const params = (p.params ?? {}) as Record<string, unknown>;
      return params.sourceDeliverableId === source.id;
    });
    check("elke proposal draagt sourceDeliverableId=bron", allSourced);
    const typesOk = payloads.every((p) => ALLOWED.has(String(((p.params ?? {}) as Record<string, unknown>).contentType)));
    check("alle voorgestelde typen ∈ toegestane set", typesOk);
    const derivedLine = payloads.some((p) => JSON.stringify(p.changes ?? []).includes("Derived from"));
    check('proposal toont "Derived from"-regel', derivedLine);

    // ── 3. Confirm-pad: één proposal → deliverable + generatie + F-VAL ──
    console.log("\n[3] confirm één proposal (generatie + F-VAL — duurt even)");
    const chosen = proposals[0];
    const chosenParams = ((chosen.content as Record<string, unknown>).params ?? {}) as Record<string, unknown>;
    const createTool = getToolByName("create_deliverable");
    const exec = (await createTool!.execute(chosenParams, ctx)) as Record<string, unknown>;
    check("create_deliverable execute ok", exec.success === true && typeof exec.deliverableId === "string");
    const newId = String(exec.deliverableId);
    created.push(newId);
    const row = await prisma.deliverable.findUnique({ where: { id: newId }, select: { derivedFromId: true, campaignId: true } });
    check("derivedFromId = bron én in bron-campagne", row?.derivedFromId === source.id && row?.campaignId === campaign.id);
    let fval: number | null = null;
    for await (const event of orchestrateContentGeneration(newId, BB)) {
      if (event.event === "fidelity_score_complete") {
        const d = (event.data ?? {}) as Record<string, unknown>;
        if (typeof d.compositeScore === "number") fval = d.compositeScore;
      } else if (event.event === "error") break;
    }
    check(`generatie + F-VAL-score aanwezig (score=${fval})`, typeof fval === "number");

    // ── 4. Edge: bron zonder content ─────────────────────────
    console.log("\n[4] edge: bron zonder content");
    const resEmpty = await runAgent({
      workspaceId: BB, userId: USER_ID, agentId: "content-creator", useCaseId: "repurpose-content",
      input: { message: `Repurpose the deliverable "${emptySource.title}" (id: ${emptySource.id}) into a linkedin-post.` },
      triggerType: "manual",
    });
    const emptyProposals = await prisma.agentArtifact.count({ where: { runId: resEmpty.runId, type: "PROPOSAL" } });
    check("nul proposals bij lege bron", emptyProposals === 0);

    // ── 5. Edge: verboden typen ──────────────────────────────
    console.log("\n[5] edge: verboden typen (newsletter + tiktok)");
    const resForbidden = await runAgent({
      workspaceId: BB, userId: USER_ID, agentId: "content-creator", useCaseId: "repurpose-content",
      input: { message: `Repurpose "${source.title}" (id: ${source.id}) into a newsletter and a tiktok-video.` },
      triggerType: "manual",
    });
    const forbidden = await prisma.agentArtifact.findMany({ where: { runId: resForbidden.runId, type: "PROPOSAL" } });
    const noForbiddenTypes = forbidden.every((a) => {
      const params = ((a.content as Record<string, unknown>).params ?? {}) as Record<string, unknown>;
      return ALLOWED.has(String(params.contentType));
    });
    check("geen proposals met verboden typen", noForbiddenTypes);
  } finally {
    // ── Cleanup ──────────────────────────────────────────────
    await prisma.deliverable.deleteMany({ where: { id: { in: created } } }).catch(() => {});
    await prisma.campaign.delete({ where: { id: campaign.id } }).catch(() => {});
    console.log("\ncleanup ok");
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
