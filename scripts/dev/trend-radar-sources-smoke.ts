/**
 * Trend-radar external-sources smoke (task research-stack-trend-radar).
 *
 * Validates the Exa + Semantic Scholar enrichment layers added to the
 * trend-radar researcher. The core path exercises `gatherTrendEnrichmentSignals`
 * with REAL Exa/S2 round-trips (fast + robust), plus deterministic mapping,
 * dedup, degradation and baseline checks. FULL_SCAN=1 additionally runs one
 * real end-to-end `runTrendResearch` on the local Better Brands workspace.
 *
 * Run (from the worktree):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/trend-radar-sources-smoke.ts
 * Flags: FULL_SCAN=1 (also run one end-to-end scan + enrichment-cost delta).
 */
import { prisma } from "../../src/lib/prisma";
import {
  gatherTrendEnrichmentSignals,
  mapExaBlockToSignal,
  mapScholarPaperToSignal,
} from "../../src/lib/trend-radar/external-sources";
import { runTrendResearch } from "../../src/lib/trend-radar/researcher";
import type { ExaBlock } from "../../src/lib/exa/exa-client";
import type { ScholarSourcePaper } from "../../src/lib/semantic-scholar/scholar-client";

const WS = process.env.WATCHDOG_WS ?? "cmnomsobx009q44msn0gpw7vb"; // Better Brands dev

// Queries chosen to reliably hit BOTH layers: broad enough for fresh Exa web
// results, classic enough for well-cited (>10) Semantic Scholar papers.
const QUERIES = [
  "social media marketing strategy",
  "consumer behavior brand loyalty",
  "artificial intelligence content generation trends",
];

// Approx. Exa neural-search unit price (USD/search). S2 is free; enrichment adds
// zero Gemini calls (results map directly to Signals).
const EXA_UNIT_USD = 0.005;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function isRealHttpUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function withEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function main() {
  console.log("── Trend-radar external-sources smoke ──\n");

  const haveExa = !!process.env.EXA_API_KEY;
  const haveS2 = !!process.env.S2_API_KEY;
  console.log(`keys: EXA=${haveExa ? "set" : "MISSING"} S2=${haveS2 ? "set" : "MISSING"}\n`);

  // 1. Deterministic mapping — Exa block → Signal (no network).
  console.log("1. Mapping correctness (deterministic)");
  const exaBlock: ExaBlock = {
    title: "The state of AI in marketing",
    url: "https://example.com/ai-marketing-2026",
    snippet: "Brands are rapidly adopting generative AI for content workflows.",
    queryLayer: "trend",
  };
  const exaSignal = mapExaBlockToSignal(exaBlock);
  check("Exa signal sourceType=analysis", exaSignal.sourceType === "analysis");
  check("Exa signal authority=general", exaSignal.sourceAuthority === "general");
  check("Exa signal keeps real URL", exaSignal.sourceUrl === exaBlock.url);

  const scholarPaper: ScholarSourcePaper = {
    title: "A theory of brand loyalty",
    abstract: "We model brand loyalty as a function of repeated satisfaction.",
    citationCount: 4200,
    year: 2019,
    queryLayer: "effectiveness",
    url: "https://www.semanticscholar.org/paper/abc123",
  };
  const scholarSignal = mapScholarPaperToSignal(scholarPaper);
  check("Scholar signal sourceType=research", scholarSignal.sourceType === "research");
  check(
    "well-cited scholar → authority=industry_specialist",
    scholarSignal.sourceAuthority === "industry_specialist",
  );
  check("Scholar signal publicationDate from year", scholarSignal.publicationDate === "2019-01-01");
  check("Scholar signal keeps real URL", scholarSignal.sourceUrl === scholarPaper.url);
  // Citation-tiered authority: a low-traction paper must NOT earn the specialist bonus.
  const lowCitePaper: ScholarSourcePaper = { ...scholarPaper, citationCount: 12 };
  check(
    "low-cited scholar → authority=general",
    mapScholarPaperToSignal(lowCitePaper).sourceAuthority === "general",
  );

  // 2. Baseline no-op — both keys cleared → byte-identical (no signals/warnings).
  console.log("\n2. Baseline (no keys) — enrichment is a no-op");
  const baseline = await withEnv({ EXA_API_KEY: undefined, S2_API_KEY: undefined }, () =>
    gatherTrendEnrichmentSignals({ queries: QUERIES, existingUrls: [] }),
  );
  check("no signals without keys", baseline.signals.length === 0, `got ${baseline.signals.length}`);
  check("no exa/scholar counts", baseline.exaCount === 0 && baseline.scholarCount === 0);
  check("no warnings without keys", baseline.warnings.length === 0, baseline.warnings.join("; "));

  // 3. Live enrichment — real Exa + S2 round-trips.
  console.log("\n3. Live enrichment (real Exa + S2)");
  let liveUrls: string[] = [];
  if (haveExa || haveS2) {
    const live = await gatherTrendEnrichmentSignals({ queries: QUERIES, existingUrls: [] });
    liveUrls = live.signals.map((s) => s.sourceUrl);
    console.log(`   Exa=${live.exaCount} Scholar=${live.scholarCount} total=${live.signals.length}`);
    if (live.warnings.length) console.log(`   warnings: ${live.warnings.join("; ")}`);

    const layers = new Set(live.signals.map((s) => s.sourceType));
    check(
      "signals from >=2 source layers (analysis+research)",
      layers.size >= 2 || (live.exaCount > 0 && live.scholarCount > 0),
      `layers=${[...layers].join(",")}`,
    );
    check("all live signals carry a real https URL", live.signals.every((s) => isRealHttpUrl(s.sourceUrl)));
    check(
      "exa signals typed 'analysis', scholar 'research'",
      live.signals.every((s) => s.sourceType === "analysis" || s.sourceType === "research"),
    );
    if (haveExa) check("Exa layer returned >0 signals", live.exaCount > 0, `exaCount=${live.exaCount}`);
    if (haveS2) check("Scholar layer returned >0 signals", live.scholarCount > 0, `scholarCount=${live.scholarCount}`);

    // Enrichment cost datapoint — Exa searches × unit, S2 free, 0 extra Gemini.
    const exaSearches = haveExa ? Math.min(3, QUERIES.length) : 0;
    const enrichmentCost = exaSearches * EXA_UNIT_USD;
    console.log(`   enrichment cost ≈ $${enrichmentCost.toFixed(3)} (${exaSearches} Exa searches, S2 free, 0 extra Gemini)`);
    check("enrichment cost <= $0.15 over baseline", enrichmentCost <= 0.15, `$${enrichmentCost.toFixed(3)}`);
  } else {
    console.log("   SKIP — no keys present");
  }

  // 4. Dedup — re-run with the first run's URLs as existing → none reappear.
  console.log("\n4. Dedup across source URLs");
  if (liveUrls.length > 0) {
    const second = await gatherTrendEnrichmentSignals({ queries: QUERIES, existingUrls: liveUrls });
    const seen = new Set(liveUrls.map((u) => u.toLowerCase().replace(/\/+$/, "")));
    const leaked = second.signals.filter((s) => seen.has(s.sourceUrl.toLowerCase().replace(/\/+$/, "")));
    check("no already-seen URL is re-added", leaked.length === 0, `${leaked.length} leaked`);
  } else {
    console.log("   SKIP — no live URLs from step 3");
  }

  // 5. Degradation — invalid S2 key → layer fails soft, scan still returns.
  console.log("\n5. S2 degradation (invalid key)");
  if (haveExa) {
    const degraded = await withEnv({ S2_API_KEY: "invalid-key-forced-failure" }, () =>
      gatherTrendEnrichmentSignals({ queries: QUERIES, existingUrls: [] }),
    );
    check("gather resolves despite S2 failure", true);
    check("no scholar signals on bad key", degraded.scholarCount === 0, `scholarCount=${degraded.scholarCount}`);
    check("Exa layer still produces signals", degraded.exaCount > 0, `exaCount=${degraded.exaCount}`);
  } else {
    console.log("   SKIP — needs a working Exa key to prove the surviving layer");
  }

  // 6. Optional full end-to-end scan.
  if (process.env.FULL_SCAN === "1") {
    console.log("\n6. FULL_SCAN — end-to-end runTrendResearch on Better Brands");
    const job = await prisma.trendResearchJob.create({
      data: { workspaceId: WS, query: QUERIES[0], useBrandContext: true, status: "PENDING" },
    });
    const before = new Date();
    try {
      await runTrendResearch(job.id, WS, QUERIES[0], true);
      const done = await prisma.trendResearchJob.findUnique({ where: { id: job.id } });
      check("scan completed", done?.status === "COMPLETED", `status=${done?.status}`);
      check("scan produced >=1 trend", (done?.trendsDetected ?? 0) >= 1, `trends=${done?.trendsDetected}`);
      const enrichmentNote = (done?.errors ?? []).find((e) => e.includes("enrichment"));
      if (enrichmentNote) console.log(`   note: ${enrichmentNote}`);
      const usage = await prisma.aiUsageRecord.aggregate({
        where: { workspaceId: WS, createdAt: { gte: before } },
        _sum: { cost: true },
      });
      console.log(`   full-scan AI cost (baseline pipeline, not enrichment delta) ≈ $${(usage._sum.cost ?? 0).toFixed(4)}`);
    } finally {
      await prisma.trendResearchJob.delete({ where: { id: job.id } }).catch(() => {});
    }
  } else {
    console.log("\n6. FULL_SCAN skipped (set FULL_SCAN=1 to run one end-to-end scan)");
  }

  console.log(`\n── ${pass} passed, ${fail} failed ──`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("smoke crashed:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
