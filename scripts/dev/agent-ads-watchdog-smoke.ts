/**
 * Ads-watchdog-smoke (Fase 2+3) — unit-checks op de pure signaal-functies,
 * deterministische tool-checks op geseede fixture-data (geen Meta nodig:
 * de agent leest uitsluitend de DB) en echte Ada-runs incl. confirm-pad.
 *
 * Seed: fixture-ConnectedAdAccount + 3 AdCampaign-rijen — A vervallen
 * (60d oud + frequency 4+ + halverende CTR), B gezond, C paused (buiten
 * de scan) — met 8 dagen snapshots.
 *
 * Run (vanuit de worktree):
 *   DATABASE_URL=... node --env-file-if-exists=.env.local \
 *     node_modules/.bin/tsx scripts/dev/agent-ads-watchdog-smoke.ts
 * Flags: SKIP_AI=1, KEEP_SEED=1.
 */
import { prisma } from "../../src/lib/prisma";
import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { getToolByName } from "../../src/lib/claw/tools/registry";
import { orchestrateContentGeneration } from "../../src/lib/ai/canvas-orchestrator";
import {
  computeFrequencySignal,
  computeCtrDropSignal,
  computeCreativeAgeSignal,
  evaluateAdSignals,
  remainingWeeklyProposalBudget,
  WEEKLY_PROPOSAL_CAP,
} from "../../src/lib/agents/registry/ads-watchdog/signals";
import { readAdSignalsTool } from "../../src/lib/agents/registry/ads-watchdog/tools";
import type { BrandclawRunContext } from "../../src/lib/brandclaw/orchestrator/types";

const WS = process.env.ADS_WS ?? "cmnomsobx009q44msn0gpw7vb"; // Better Brands dev
const EMPTY_WS = process.env.ADS_EMPTY_WS ?? "cmnslwqwv0000akmswepx1gsq"; // WRA Juristen
const USER_ID = "demo-user-erik-001";
const SEED_TAG = "ads-watchdog-smoke";
const DAY = 24 * 60 * 60 * 1000;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

function day(offset: number): Date {
  return new Date(Date.now() - offset * DAY);
}

function snapshotDays(spec: Array<{ d: number; impr: number; reach: number; ctr: number }>) {
  return spec.map((s) => ({
    capturedAt: new Date(),
    windowStart: day(s.d),
    windowEnd: day(s.d - 1),
    impressions: s.impr,
    reach: s.reach,
    ctr: s.ctr,
    spend: 8,
    raw: {},
  }));
}

async function cleanup() {
  // Ook de PROPOSAL-artefacten van eerdere smoke-runs weg — het weekbudget
  // telt create_deliverable-proposals van de laatste 7 dagen (dev-DB-only).
  await prisma.agentArtifact.deleteMany({
    where: { workspaceId: WS, type: "PROPOSAL", run: { agentId: "ads-watchdog" } },
  });
  const accounts = await prisma.connectedAdAccount.findMany({
    where: { workspaceId: WS, accountName: SEED_TAG }, select: { id: true },
  });
  for (const a of accounts) {
    const rows = await prisma.adCampaign.findMany({ where: { connectedAccountId: a.id }, select: { id: true } });
    await prisma.adMetricSnapshot.deleteMany({ where: { campaignId: { in: rows.map((r) => r.id) } } });
    await prisma.adCampaign.deleteMany({ where: { connectedAccountId: a.id } });
  }
  await prisma.connectedAdAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
}

async function seed() {
  const account = await prisma.connectedAdAccount.create({
    data: {
      workspaceId: WS, platform: "meta", externalAccountId: "act_smoke_fixture",
      accountName: SEED_TAG, status: "active",
      accessTokenEncrypted: "fixture-not-decryptable", // agent-tools decrypten nooit
      scopes: ["ads_read"], connectedById: USER_ID,
    },
  });
  // A — vervallen: 60d oud, frequency ~4,3, CTR halveert (4,0 → 1,6)
  const fatigued = await prisma.adCampaign.create({
    data: {
      origin: "external", connectedAccountId: account.id, externalAdId: "smoke_ad_fatigued",
      externalName: `${SEED_TAG} — vermoeide ad`, creativeCreatedAt: day(60), status: "active",
      metrics: { create: snapshotDays([
        { d: 8, impr: 900, reach: 300, ctr: 4.1 }, { d: 7, impr: 950, reach: 290, ctr: 3.9 },
        { d: 6, impr: 900, reach: 280, ctr: 3.8 }, { d: 5, impr: 980, reach: 260, ctr: 3.4 },
        { d: 4, impr: 1000, reach: 250, ctr: 2.2 }, { d: 3, impr: 1100, reach: 250, ctr: 1.9 },
        { d: 2, impr: 1150, reach: 260, ctr: 1.6 }, { d: 1, impr: 1200, reach: 270, ctr: 1.4 },
      ]) },
    },
  });
  // B — gezond: vers, frequency ~1,2, stabiele CTR
  await prisma.adCampaign.create({
    data: {
      origin: "external", connectedAccountId: account.id, externalAdId: "smoke_ad_healthy",
      externalName: `${SEED_TAG} — gezonde ad`, creativeCreatedAt: day(5), status: "active",
      metrics: { create: snapshotDays([
        { d: 4, impr: 500, reach: 420, ctr: 3.8 }, { d: 3, impr: 520, reach: 430, ctr: 3.9 },
        { d: 2, impr: 510, reach: 425, ctr: 3.7 }, { d: 1, impr: 530, reach: 440, ctr: 3.8 },
      ]) },
    },
  });
  // C — paused: hoort buiten de scan te blijven
  await prisma.adCampaign.create({
    data: {
      origin: "external", connectedAccountId: account.id, externalAdId: "smoke_ad_paused",
      externalName: `${SEED_TAG} — gepauzeerde ad`, creativeCreatedAt: day(90), status: "paused",
    },
  });
  return { account, fatigued };
}

function runScanCtx(workspaceId: string): BrandclawRunContext {
  return {
    workspaceId, runId: `${SEED_TAG}-direct`, nodeType: "agent:ads-watchdog",
    agentVersion: "smoke", promptVersion: "smoke", triggerType: "manual",
  } as unknown as BrandclawRunContext;
}

function parseFenced<T>(fenced: string): T {
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  return JSON.parse(fenced.slice(start, end + 1)) as T;
}

async function main() {
  // ── 1. Unit — pure signaal-functies ───────────────────────────────────
  console.log("## Unit — signals\n");
  const noisy = [
    { windowStart: day(3), impressions: 1000, reach: 250, ctr: 2.0 },
    { windowStart: day(2), impressions: 1100, reach: 260, ctr: 1.8 },
    { windowStart: day(1), impressions: 1200, reach: 270, ctr: 1.6 },
  ];
  const freq = computeFrequencySignal(noisy);
  check("frequency-signaal vuurt boven 3,5", freq?.type === "frequency" && freq.value > 3.5, JSON.stringify(freq));
  check("frequency fail-soft zonder reach",
    computeFrequencySignal([{ windowStart: day(1), impressions: 100, reach: null, ctr: 1 }]) === null);
  const dropSeries = [4.0, 3.9, 3.8, 3.7, 2.0, 1.8, 1.7, 1.6].map((ctr, i) => ({
    windowStart: day(8 - i), impressions: 100, reach: 80, ctr,
  }));
  const drop = computeCtrDropSignal(dropSeries);
  check("ctr-drop-signaal vuurt bij halvering", drop?.type === "ctr-drop" && drop.value >= 25, JSON.stringify(drop));
  check("ctr-drop vereist ≥4 punten (anti-ruis)", computeCtrDropSignal(dropSeries.slice(0, 3)) === null);
  check("creative-age vuurt na 45d", computeCreativeAgeSignal(day(60), new Date())?.value === 60);
  check("creative-age stil onder drempel", computeCreativeAgeSignal(day(10), new Date()) === null);
  check("evaluateAdSignals bundelt alle drie",
    evaluateAdSignals({ externalName: "x", creativeCreatedAt: day(60), snapshots: dropSeries.map((s) => ({ ...s, reach: 20 })) }, new Date()).length === 3);
  check("weekbudget nooit negatief", remainingWeeklyProposalBudget(99) === 0 && remainingWeeklyProposalBudget(1) === WEEKLY_PROPOSAL_CAP - 1);

  // ── 2. Tool — geseede fixtures ─────────────────────────────────────────
  console.log("\n## read_ad_signals — fixtures\n");
  await cleanup();
  const { fatigued } = await seed();
  const res = await readAdSignalsTool.execute({}, runScanCtx(WS));
  const content = (res as { content: Record<string, unknown> }).content;
  check("2 actieve ads gemonitord (paused uitgesloten)", content.adsMonitored === 2, JSON.stringify(content.adsMonitored));
  check("1 ad geflagd", content.flaggedCount === 1, JSON.stringify(content.flaggedCount));
  const flagged = parseFenced<Array<{ adCampaignId: string; signals: Array<{ type: string }> }>>(String(content.flagged));
  check("flag = de vermoeide ad met alle 3 signalen",
    flagged[0]?.adCampaignId === fatigued.id && flagged[0].signals.length === 3,
    JSON.stringify(flagged[0]?.signals?.map((s) => s.type)));
  const budget = content.weeklyProposalBudget as { cap: number; remaining: number };
  check("weekbudget vol bij start", budget.cap === WEEKLY_PROPOSAL_CAP && budget.remaining === WEEKLY_PROPOSAL_CAP);
  const otherWs = await readAdSignalsTool.execute({}, runScanCtx(EMPTY_WS));
  check("workspace-isolatie: lege workspace ziet 0 ads",
    (otherWs as { content: Record<string, unknown> }).content.adsMonitored === 0);

  if (process.env.SKIP_AI === "1") {
    if (process.env.KEEP_SEED !== "1") await cleanup();
    console.log(`\n=== RESULT: ${pass} pass, ${fail} fail (AI geskipt) ===`); process.exit(fail > 0 ? 1 : 0);
  }

  // ── 3. Echte Ada-run — happy path ──────────────────────────────────────
  console.log("\n## Echte Ada-run — happy path\n");
  const run = await runAgent({
    workspaceId: WS, userId: USER_ID, agentId: "ads-watchdog", useCaseId: "daily-fatigue-scan",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  console.log(`  status=${run.status} cost=$${run.totalCostUsd} latency=${Math.round(run.latencyMs / 1000)}s`);
  check("run levert proposal (AWAITING_CONFIRMATION)", run.status === "AWAITING_CONFIRMATION", run.status);
  check("kosten ≤ $0,15", run.totalCostUsd <= 0.15, `$${run.totalCostUsd}`);
  const artifacts = await prisma.agentArtifact.findMany({
    where: { runId: run.runId }, select: { id: true, type: true, title: true, content: true },
  });
  console.log("  artifacts:", artifacts.map((a) => `${a.type}:${a.title}`).join(" | "));
  check("één REPORT + TABLE aanwezig",
    artifacts.filter((a) => a.type === "REPORT").length === 1 && artifacts.some((a) => a.type === "TABLE"));
  const proposals = artifacts.filter((a) => a.type === "PROPOSAL");
  check("1-3 refresh-proposals (binnen weekbudget)", proposals.length >= 1 && proposals.length <= WEEKLY_PROPOSAL_CAP, `${proposals.length}`);
  const proposalContent = (proposals[0]?.content ?? {}) as Record<string, unknown>;
  check("proposal = create_deliverable", proposalContent.toolName === "create_deliverable", String(proposalContent.toolName));
  const md = String(((artifacts.find((a) => a.type === "REPORT")?.content ?? {}) as Record<string, unknown>).markdown ?? "");
  check("rapport benoemt signalen + geen bod/budget-advies",
    md.length > 200 && !/verhoog het budget|verlaag het budget|increase the budget|bid strategy|bodstrategie/i.test(md));
  const tx = await prisma.creditTransaction.findMany({
    where: { workspaceId: WS, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  check("0 credits op de monitoring-run", !tx.some((t) => JSON.stringify(t).includes(run.runId)), `${tx.length} tx`);
  console.log("── REPORT (eerste 1200 chars):\n" + md.slice(0, 1200));

  // ── 4. Confirm-pad: refresh-creative wordt echt deliverable ───────────
  console.log("\n## Confirm-pad — refresh-creative\n");
  const briefTool = getToolByName("create_deliverable");
  const parsed = briefTool!.inputSchema.safeParse(proposalContent.params);
  check("proposal-params valideren", parsed.success);
  if (parsed.success) {
    await prisma.agentArtifact.update({ where: { id: proposals[0].id }, data: { acceptedAt: new Date() } });
    const execRes = (await briefTool!.execute(parsed.data as Record<string, unknown>, { workspaceId: WS, userId: USER_ID })) as Record<string, unknown>;
    check("confirm-execute maakt deliverable", typeof execRes.deliverableId === "string", JSON.stringify(execRes).slice(0, 120));
    if (typeof execRes.deliverableId === "string") {
      let generated = false;
      let genError: string | null = null;
      try {
        for await (const event of orchestrateContentGeneration(execRes.deliverableId, WS)) {
          if (event.event === "complete") generated = true;
          if (event.event === "error") { genError = JSON.stringify(event.data).slice(0, 150); break; }
        }
      } catch (e) { genError = e instanceof Error ? e.message : "unknown"; }
      check("canvas-generatie draait op de refresh-creative (facebook-post)", generated, genError ?? "");
    }
  }

  // ── 5. Weekplafond: budget op → geen nieuwe proposals ─────────────────
  console.log("\n## Weekplafond — budget op\n");
  const res2 = await readAdSignalsTool.execute({}, runScanCtx(WS));
  const budget2 = ((res2 as { content: Record<string, unknown> }).content.weeklyProposalBudget) as { usedThisWeek: number; remaining: number };
  check("weekbudget telt de zojuist gemaakte proposals", budget2.usedThisWeek >= proposals.length, JSON.stringify(budget2));
  // Vul het budget kunstmatig tot de cap met dummy-PROPOSALs op de bestaande run.
  const toFill = Math.max(0, WEEKLY_PROPOSAL_CAP - budget2.usedThisWeek);
  for (let i = 0; i < toFill; i++) {
    await prisma.agentArtifact.create({
      data: { workspaceId: WS, runId: run.runId, type: "PROPOSAL", title: `${SEED_TAG} cap-filler ${i}`, content: { toolName: "create_deliverable", params: {} } },
    });
  }
  const run2 = await runAgent({
    workspaceId: WS, userId: USER_ID, agentId: "ads-watchdog", useCaseId: "daily-fatigue-scan",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  const proposals2 = await prisma.agentArtifact.count({ where: { runId: run2.runId, type: "PROPOSAL" } });
  const md2 = String((((await prisma.agentArtifact.findFirst({ where: { runId: run2.runId, type: "REPORT" } }))?.content ?? {}) as Record<string, unknown>).markdown ?? "");
  check("cap bereikt → 0 nieuwe proposals, run COMPLETED", proposals2 === 0 && run2.status === "COMPLETED", `${proposals2} / ${run2.status}`);
  check("rapport bundelt het signaal i.p.v. te zwijgen", md2.length > 100 && /bundel|budget|cap|plafond|reached/i.test(md2));

  // ── 6. Lege workspace — eerlijke uitleg (scheduled-pad-gedrag) ────────
  console.log("\n## Lege workspace — geen account\n");
  const emptyRun = await runAgent({
    workspaceId: EMPTY_WS, userId: USER_ID, agentId: "ads-watchdog", useCaseId: "daily-fatigue-scan",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  const emptyMd = String((((await prisma.agentArtifact.findFirst({ where: { runId: emptyRun.runId, type: "REPORT" } }))?.content ?? {}) as Record<string, unknown>).markdown ?? "");
  check("lege workspace: COMPLETED + koppel-uitleg", emptyRun.status === "COMPLETED" && /koppel|connect|integrat/i.test(emptyMd), emptyRun.status);

  if (process.env.KEEP_SEED !== "1") await cleanup();
  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
