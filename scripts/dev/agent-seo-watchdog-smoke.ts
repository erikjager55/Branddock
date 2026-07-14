/**
 * SEO-watchdog-smoke (task agent-seo-watchdog) — valideert de scan-tool
 * deterministisch (unit + geseede dev-DB) en draait daarna echte Iris-runs.
 *
 * Seed: eigen smoke-campagne met 3 "gepubliceerde" GEO-deliverables —
 * A vervallen (stale −120d + score-drift + canonical-drift + schema-drift +
 * aged stat), B gezond (verse meting), C corrupt (analysis zonder signals →
 * skip). De analyses komen uit de échte buildGeoOptimizationAnalysis (zelfde
 * schrijver als de publish-meet-haak); de smoke seedt alleen de DB-rijen.
 *
 * Run (vanuit de worktree):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/agent-seo-watchdog-smoke.ts
 * Flags: SKIP_AI=1 (alleen deterministische checks), KEEP_SEED=1.
 */
import { prisma } from "../../src/lib/prisma";
import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { enqueueDueSchedules } from "../../src/lib/agents/schedules/enqueue";
import { runPendingJobs } from "../../src/lib/agents/jobs/runner";
import {
  scanPublishedGeoContentTool,
  diffSchemaTypes,
  findAgedStats,
  weakSignalKeys,
  compareFlagPriority,
  type GeoDecayFlag,
} from "../../src/lib/agents/registry/seo-watchdog-scan";
import { buildGeoOptimizationAnalysis } from "../../src/lib/landing-pages/geo-analysis";
import type { LongFormGeoVariantContent } from "../../src/lib/landing-pages/page-type-schemas";
import type { BrandclawRunContext } from "../../src/lib/brandclaw/orchestrator/types";

const WS = process.env.WATCHDOG_WS ?? "cmnomsobx009q44msn0gpw7vb"; // Better Brands dev
const EMPTY_WS = process.env.WATCHDOG_EMPTY_WS ?? "cmnslwqwv0000akmswepx1gsq"; // WRA Juristen
const USER_ID = "demo-user-erik-001";
const SEED_TAG = "seo-watchdog-smoke";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

function makeVariant(overrides?: Partial<LongFormGeoVariantContent>): LongFormGeoVariantContent {
  return {
    geoArticle: true,
    hero: { headline: "Merkconsistentie meten in de praktijk", subline: "Hoe je on-brand blijft op schaal." },
    answerFirstIntro:
      "Merkconsistentie meet je door elke publicatie tegen het merk-DNA te scoren. Een vaste meetlat per kanaal voorkomt drift en maakt afwijkingen direct zichtbaar, nog voordat publiek ze opmerkt.",
    tldr: ["Score elke publicatie tegen het merk-DNA.", "Meet wekelijks, niet per kwartaal.", "Automatiseer de meetlat per kanaal."],
    sections: [
      { heading: "Waarom drift ontstaat", body: "Drift ontstaat wanneer teams zonder gedeelde meetlat publiceren. Elke afwijking lijkt klein. Samen verschuiven ze de merkbeleving." },
      { heading: "De vaste meetlat", body: "Een deterministische score per publicatie maakt kwaliteit bespreekbaar. Teams zien direct welk signaal zwak is. Herstel wordt een gewone werkstap." },
    ],
    qa: [
      { question: "Hoe vaak meet je merkconsistentie?", answer: "Wekelijks. Een weekritme houdt de feedbackloop kort en herstelacties klein." },
      { question: "Wat is een goede score?", answer: "Boven de 70 is publiceerbaar; onder de 60 vraagt om herschrijven vóór publicatie." },
    ],
    citeableStats: [{ label: "Merkconsistente bedrijven groeien sneller", value: "23%", source: "Lucidpress onderzoek" }],
    definitions: [{ term: "Merkdrift", definition: "Het sluipend afwijken van de merkidentiteit door ongecoördineerde publicaties." }],
    finalCta: { heading: "Klaar om drift te stoppen?", ctaLabel: "Start de merkscan" },
    ...overrides,
  };
}

async function cleanupSeed() {
  const camp = await prisma.campaign.findFirst({ where: { workspaceId: WS, title: SEED_TAG } });
  if (camp) {
    await prisma.deliverable.deleteMany({ where: { campaignId: camp.id } });
    await prisma.campaign.delete({ where: { id: camp.id } });
  }
  const scheds = await prisma.agentSchedule.findMany({
    where: { workspaceId: WS, input: { path: ["message"], string_starts_with: SEED_TAG } }, select: { id: true },
  });
  for (const s of scheds) {
    await prisma.agentJob.deleteMany({ where: { idempotencyKey: { startsWith: `agent-schedule:${s.id}:` } } });
  }
  await prisma.agentSchedule.deleteMany({ where: { id: { in: scheds.map((s) => s.id) } } });
}

async function seed() {
  const now = new Date();
  const campaign = await prisma.campaign.create({
    data: { workspaceId: WS, title: SEED_TAG, slug: `${SEED_TAG}-${Date.now()}`, type: "CONTENT" },
  });

  // A — vervallen: analyse op −120d berekend op een variant MÉT definities
  // (DefinedTermSet in de publish-types) en een 2023-stat; de opgeslagen
  // variant mist daarna tldr+definities → score-drift + schema-drift, en de
  // publishedUrl wijkt af van de canonical → canonical-drift.
  const publishVariantA = makeVariant({
    citeableStats: [{ label: "Onderzoek merkwaarde", value: "31% groei in 2023", source: "Rapport 2023" }],
  });
  const analysisA = buildGeoOptimizationAnalysis({
    variant: publishVariantA,
    canonicalUrl: "https://pilot.example/geo/merkconsistentie",
    now: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
  });
  // Verzwak de scoring-signalen zelf (answer-first vaag, één run-on-sectie
  // → atomicChunking/entityClarity omlaag, bronloze stat → citedStats omlaag);
  // definitions weg → DefinedTermSet verdwijnt uit de JSON-LD (schema-drift).
  const storedVariantA = {
    ...publishVariantA,
    answerFirstIntro: "Het is iets waar veel over gezegd wordt. Dit hangt er natuurlijk helemaal vanaf. Het kan op allerlei manieren en dat maakt het lastig om er iets algemeens over te zeggen in de praktijk.",
    sections: [{
      heading: "Alles in één",
      body: "Dit is een heel lang verhaal zonder structuur. Het gaat maar door en door. Dat maakt het moeilijk te citeren. Het is ook niet duidelijk waar het over gaat. Dit soort teksten scoren slecht. Het blijft maar doorgaan. Dat is precies het probleem. Het wordt er niet beter op. Dit is zin negen. Het is zin tien. Dat is zin elf. Dit is zin twaalf.",
    }],
    citeableStats: [{ label: "Onderzoek merkwaarde", value: "31% groei in 2023", source: null }],
    definitions: null,
  };
  const decayed = await prisma.deliverable.create({
    data: {
      campaignId: campaign.id, title: `${SEED_TAG} — vervallen artikel`, contentType: "Landing Page",
      approvalStatus: "PUBLISHED", publishedUrl: "https://pilot.example/geo/merkconsistentie-v2",
      settings: JSON.parse(JSON.stringify({ structuredVariant: storedVariantA, geoOptimizationAnalysis: analysisA })),
    },
  });

  // B — gezond: verse meting op exact de opgeslagen variant, URL ongewijzigd,
  // stats zonder oude jaartallen.
  const variantB = makeVariant();
  const analysisB = buildGeoOptimizationAnalysis({
    variant: variantB, canonicalUrl: "https://pilot.example/geo/meetlat", now,
  });
  const healthy = await prisma.deliverable.create({
    data: {
      campaignId: campaign.id, title: `${SEED_TAG} — gezond artikel`, contentType: "Landing Page",
      approvalStatus: "PUBLISHED", publishedUrl: "https://pilot.example/geo/meetlat",
      settings: JSON.parse(JSON.stringify({ structuredVariant: variantB, geoOptimizationAnalysis: analysisB })),
    },
  });

  // C — corrupt: analysis zonder signals (format-drift) → skip-teller.
  await prisma.deliverable.create({
    data: {
      campaignId: campaign.id, title: `${SEED_TAG} — corrupt record`, contentType: "Landing Page",
      approvalStatus: "PUBLISHED", publishedUrl: "https://pilot.example/geo/corrupt",
      settings: JSON.parse(JSON.stringify({
        structuredVariant: makeVariant(),
        geoOptimizationAnalysis: { geoScore: 80, findings: [], schemaTypes: [], canonicalUrl: "x", measuredAt: now.toISOString() },
      })),
    },
  });

  return { campaign, decayed, healthy, analysisA };
}

/** Haalt de JSON-payload uit het gefencede flagged-veld van het tool-result. */
function parseFlagged(fenced: string): GeoDecayFlag[] {
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  return JSON.parse(fenced.slice(start, end + 1)) as GeoDecayFlag[];
}

async function runScan(workspaceId: string) {
  const ctx = {
    workspaceId, runId: `${SEED_TAG}-direct`, nodeType: "agent:seo-watchdog",
    agentVersion: "smoke", promptVersion: "smoke", triggerType: "manual",
  } as unknown as BrandclawRunContext;
  const res = await scanPublishedGeoContentTool.execute({}, ctx);
  if ("error" in res && res.error) throw new Error(String(res.error));
  return (res as { content: Record<string, unknown> }).content;
}

async function main() {
  // ── 1. Unit: pure helpers ──────────────────────────────────────────────
  console.log("## Unit — pure helpers\n");
  const drift = diffSchemaTypes(["BlogPosting", "FAQPage", "DefinedTermSet"], ["BlogPosting", "FAQPage", "QAPage"]);
  check("diffSchemaTypes: missing + added", drift.missing.join() === "DefinedTermSet" && drift.added.join() === "QAPage");
  const aged = findAgedStats(makeVariant({
    citeableStats: [
      { label: "oud", value: "12% in 2022", source: null },
      { label: "vers", value: `9% in ${new Date().getFullYear()}`, source: null },
      { label: "vorig jaar", value: `5% in ${new Date().getFullYear() - 1}`, source: null },
    ],
  }), new Date());
  check("findAgedStats: alleen jaartallen ouder dan vorig jaar", aged.length === 1 && aged[0].year === 2022, JSON.stringify(aged));
  check("weakSignalKeys: <60 spiegelt findings-drempel",
    weakSignalKeys({ answerFirst: 59, atomicChunking: 60, citedStats: 100, entityClarity: 0, structuredCues: 61 }).join() === "answerFirst,entityClarity");
  const mk = (o: Partial<GeoDecayFlag>): GeoDecayFlag => ({
    deliverableId: "", campaignId: "", title: "", publishedUrl: null, publishScore: 0, currentScore: 0,
    scoreDelta: 0, measuredAt: "", staleDays: 0, isStale: false, canonicalDrift: false,
    schemaDrift: { missing: [], added: [] }, agedStats: [], weakSignals: [], ...o,
  });
  const sorted = [mk({ title: "drift", scoreDelta: -20 }), mk({ title: "stale", isStale: true, scoreDelta: -1 }), mk({ title: "staleDeep", isStale: true, scoreDelta: -9 })].sort(compareFlagPriority);
  check("compareFlagPriority: stale eerst, dan grootste daling", sorted.map((f) => f.title).join() === "staleDeep,stale,drift");

  // ── 2. Seed + directe tool-executie ───────────────────────────────────
  console.log("\n## Scan-tool — geseede dev-DB\n");
  await cleanupSeed();
  const { decayed, analysisA } = await seed();

  const content = await runScan(WS);
  check("pagesScanned = 3 (alleen GEO-pagina's)", content.pagesScanned === 3, JSON.stringify(content.pagesScanned));
  check("healthy = 1", content.healthy === 1, JSON.stringify(content.healthy));
  check("skipped = 1 (corrupt record, geen throw)", content.skipped === 1, JSON.stringify(content.skipped));
  check("flaggedCount = 1", content.flaggedCount === 1, JSON.stringify(content.flaggedCount));
  const flags = parseFlagged(String(content.flagged));
  const flag = flags[0];
  check("flag = het vervallen deliverable", flag?.deliverableId === decayed.id);
  check("staleness: isStale + ±120 staleDays", flag.isStale && flag.staleDays >= 119 && flag.staleDays <= 121, `staleDays=${flag.staleDays}`);
  check("score-drift: currentScore < publishScore", flag.scoreDelta < 0 && flag.publishScore === analysisA.geoScore,
    `publish=${flag.publishScore} current=${flag.currentScore}`);
  check("canonical-drift gedetecteerd", flag.canonicalDrift === true);
  check("schema-drift: DefinedTermSet missing", flag.schemaDrift.missing.includes("DefinedTermSet"), JSON.stringify(flag.schemaDrift));
  check("aged stat 2023 gevonden", flag.agedStats.some((s) => s.year === 2023), JSON.stringify(flag.agedStats));

  // ── 3. Workspace-isolatie ─────────────────────────────────────────────
  const other = await runScan(EMPTY_WS);
  check("workspace-isolatie: lege workspace ziet 0 pagina's", other.pagesScanned === 0, JSON.stringify(other.pagesScanned));

  if (process.env.SKIP_AI === "1") { console.log(`\n=== RESULT: ${pass} pass, ${fail} fail (AI-stappen geskipt) ===`); process.exit(fail > 0 ? 1 : 0); }

  // ── 4. Echte run — happy path ─────────────────────────────────────────
  console.log("\n## Echte Iris-run — happy path\n");
  const run = await runAgent({
    workspaceId: WS, userId: USER_ID, agentId: "seo-watchdog", useCaseId: "weekly-decay-scan",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  console.log(`  status=${run.status} cost=$${run.totalCostUsd} latency=${Math.round(run.latencyMs / 1000)}s`);
  check("run slaagt (COMPLETED of AWAITING_CONFIRMATION)", run.status === "COMPLETED" || run.status === "AWAITING_CONFIRMATION", run.status);
  check("kosten-gate ≤ $0,15", run.totalCostUsd <= 0.15, `$${run.totalCostUsd}`);
  const artifacts = await prisma.agentArtifact.findMany({ where: { runId: run.runId }, select: { type: true, title: true, content: true } });
  console.log("  artifacts:", artifacts.map((a) => `${a.type}:${a.title}`).join(" | "));
  const report = artifacts.find((a) => a.type === "REPORT");
  check("één REPORT-artefact", artifacts.filter((a) => a.type === "REPORT").length === 1);
  check("LINK-artefact(en) met canvas-deep-link", artifacts.some((a) => a.type === "LINK"));
  const proposals = artifacts.filter((a) => a.type === "PROPOSAL");
  check("max 3 refresh-brief-proposals", proposals.length <= 3, `${proposals.length}`);
  const md = String((report?.content as Record<string, unknown>)?.markdown ?? "");
  check("framing: geen traffic-/ranking-claims", !/traffic|ranking|bezoeker|zoekpositie|websiteverkeer/i.test(md));
  check("rapport noemt publish- vs actuele score", md.includes(String(analysisA.geoScore)));
  const tx = await prisma.creditTransaction.findMany({
    where: { workspaceId: WS, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  check("0 credits afgeboekt (geen CreditTransaction voor deze run)",
    !tx.some((t) => JSON.stringify(t).includes(run.runId)), `${tx.length} recente tx`);
  console.log("── REPORT (eerste 1800 chars):\n" + md.slice(0, 1800));

  // ── 4b. Herschrijf-loop: proposal confirmen → brief geüpdatet ─────────
  // Spiegelt het approve-pad van de confirm-route headless (patroon
  // agents-confirm-path.ts): claim → getToolByName().execute() → settle.
  console.log("\n## Herschrijf-loop — refresh-brief confirmen\n");
  const proposalArtifact = await prisma.agentArtifact.findFirst({
    where: { runId: run.runId, type: "PROPOSAL", acceptedAt: null, dismissedAt: null },
  });
  const pContent = (proposalArtifact?.content ?? {}) as Record<string, unknown>;
  check("proposal is update_deliverable_brief", pContent.toolName === "update_deliverable_brief", String(pContent.toolName));
  const { getToolByName } = await import("../../src/lib/claw/tools/registry");
  const briefTool = getToolByName("update_deliverable_brief");
  const parsed = briefTool!.inputSchema.safeParse(pContent.params);
  check("proposal-params valideren tegen het tool-schema", parsed.success);
  if (proposalArtifact && parsed.success) {
    await prisma.agentArtifact.update({ where: { id: proposalArtifact.id }, data: { acceptedAt: new Date() } });
    const execRes = (await briefTool!.execute(parsed.data as Record<string, unknown>, { workspaceId: WS, userId: USER_ID })) as Record<string, unknown>;
    check("confirm-execute slaagt", execRes.success !== false, JSON.stringify(execRes).slice(0, 120));
    const freshDeliverable = await prisma.deliverable.findUnique({ where: { id: decayed.id }, select: { settings: true } });
    const brief = ((freshDeliverable?.settings as Record<string, unknown>)?.brief ?? {}) as Record<string, string>;
    const filled = ["objective", "keyMessage", "toneDirection", "callToAction"].filter((k) => (brief[k] ?? "").length > 0);
    check("brief-velden geüpdatet op het vervallen deliverable", filled.length >= 1, `gevuld: ${filled.join(",")}`);
    console.log(`  brief.objective: ${String(brief.objective ?? "").slice(0, 120)}`);
  }

  // ── 5. Echte run — lege workspace ─────────────────────────────────────
  console.log("\n## Echte Iris-run — lege workspace\n");
  const empty = await runAgent({
    workspaceId: EMPTY_WS, userId: USER_ID, agentId: "seo-watchdog", useCaseId: "weekly-decay-scan",
    input: { message: "geen extra focus" }, triggerType: "manual",
  });
  console.log(`  status=${empty.status} cost=$${empty.totalCostUsd}`);
  check("lege workspace: run COMPLETED", empty.status === "COMPLETED", empty.status);
  const emptyReport = await prisma.agentArtifact.findFirst({ where: { runId: empty.runId, type: "REPORT" } });
  const emptyMd = String((emptyReport?.content as Record<string, unknown>)?.markdown ?? "");
  check("lege workspace: rapport legt 'niets te bewaken' uit + schedule-advies",
    emptyMd.length > 100 && /schedule|schema|pauze|pauzeer/i.test(emptyMd));
  console.log("── REPORT (eerste 800 chars):\n" + emptyMd.slice(0, 800));

  // ── 6. Scheduled-run-bewijs ───────────────────────────────────────────
  console.log("\n## Scheduled-run-bewijs (enqueue → runner → run + notificatie)\n");
  const schedule = await prisma.agentSchedule.create({
    data: {
      workspaceId: WS, agentId: "seo-watchdog", useCaseId: "weekly-decay-scan",
      input: { message: `${SEED_TAG} scheduled` }, cadence: "EVERY_MINUTE",
      nextRunAt: new Date(Date.now() - 1000), createdByUserId: USER_ID,
    },
  });
  const enq = await enqueueDueSchedules();
  check("due schedule enqueued", enq.enqueued >= 1, JSON.stringify(enq));
  // De agent-lane verwerkt één AGENT_TASK per workspace per pass — een
  // concurrente/stale job in dezelfde workspace kan de eerste pass claimen.
  let schedRun = null;
  for (let i = 0; i < 4 && !schedRun; i++) {
    await runPendingJobs({ budgetMs: 240_000 });
    schedRun = await prisma.agentRun.findFirst({
      where: { scheduleId: schedule.id }, orderBy: { createdAt: "desc" },
    });
  }
  check("AgentRun met triggerType 'scheduled' + scheduleId", schedRun?.triggerType === "scheduled" && schedRun.scheduleId === schedule.id,
    schedRun ? `${schedRun.triggerType}` : "geen run");
  const schedArtifacts = schedRun ? await prisma.agentArtifact.count({ where: { runId: schedRun.id } }) : 0;
  check("scheduled run heeft artefacten (inbox)", schedArtifacts > 0, `${schedArtifacts}`);
  const notif = schedRun ? await prisma.notification.count({
    where: { workspaceId: WS, actionUrl: `agents-inbox?run=${schedRun.id}` },
  }) : 0;
  check("precies run-notificatie(s) voor deze run", notif > 0, `${notif}`);
  const freshSchedule = await prisma.agentSchedule.findUnique({ where: { id: schedule.id } });
  check("nextRunAt opgeschoven", (freshSchedule?.nextRunAt?.getTime() ?? 0) > Date.now() - 1000);

  if (process.env.KEEP_SEED !== "1") await cleanupSeed();
  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
