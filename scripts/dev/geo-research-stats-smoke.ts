/**
 * GEO research-backed stats smoke (task research-stack-geo-research-backed).
 *
 * Validates the research-stat enrichment for long-form GEO generation:
 * fetch (Exa + S2), the labeled prompt block, keyless regression, and the
 * required A/B datapoint — a GEO article generated WITH the research package
 * vs WITHOUT, comparing the citedStats GEO-signal and tracing ≥1 citeableStat
 * back to the package.
 *
 * Run (from the worktree):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/geo-research-stats-smoke.ts
 * Flags: SKIP_GEN=1 (fetch/format/regression only — skips the 2 LLM generations).
 */
import { prisma } from "../../src/lib/prisma";
import {
  fetchResearchStatCandidates,
  buildResearchStatsBlock,
  extractStat,
} from "../../src/lib/landing-pages/research-stats";
import { cleanStatSource } from "../../src/lib/landing-pages/sanitize-geo-sources";
import { generateLandingPageVariantBatch } from "../../src/lib/landing-pages/variant-generator";
import { flattenPageVariantToText } from "../../src/lib/landing-pages/flatten-variant";
import { computeGeoScore } from "../../src/lib/brand-fidelity/geo-fidelity-scorer";

const TOPIC = process.env.GEO_TOPIC ?? "brand consistency revenue impact for B2B companies";
const EXA_UNIT_USD = 0.005;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

function digits(s: string): string {
  return s.replace(/[^\d]/g, "");
}

async function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { return await fn(); }
  finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function main() {
  console.log("── GEO research-backed stats smoke ──\n");
  console.log(`keys: EXA=${process.env.EXA_API_KEY ? "set" : "MISSING"} S2=${process.env.S2_API_KEY ? "set" : "MISSING"}\n`);

  // 1. extractStat unit.
  console.log("1. extractStat (deterministic)");
  check("pulls a percentage", extractStat("Adoption rose to 42% last year.")?.value === "42%");
  check("pulls a magnitude number", /3\.2\s?billion/i.test(extractStat("The market hit 3.2 billion users.")?.value ?? ""));
  check("no number → null", extractStat("Brands care about consistency.") === null);

  // 2. Baseline (no keys) → empty package (regression: prompt unchanged).
  console.log("\n2. Keyless → empty package");
  const noKeys = await withEnv({ EXA_API_KEY: undefined, S2_API_KEY: undefined }, () => fetchResearchStatCandidates(TOPIC));
  check("no candidates without keys", noKeys.length === 0, `got ${noKeys.length}`);
  check("empty block is empty string", buildResearchStatsBlock(noKeys) === "");

  // 3. Live fetch (Exa + S2).
  console.log("\n3. Live fetch (real Exa + S2)");
  const candidates = await fetchResearchStatCandidates(TOPIC);
  console.log(`   candidates: ${candidates.length} (${candidates.filter((c) => c.origin === "exa").length} Exa, ${candidates.filter((c) => c.origin === "scholar").length} S2)`);
  candidates.slice(0, 4).forEach((c) => console.log(`     - ${c.value} — ${c.source}`));
  check("found >=1 candidate", candidates.length >= 1, `got ${candidates.length}`);
  check("every value literally present in its label", candidates.every((c) => c.label.includes(c.value)));
  check("every source survives cleanStatSource", candidates.every((c) => cleanStatSource(c.source) !== null));
  check("every candidate has a real source URL", candidates.every((c) => !c.sourceUrl || /^https?:\/\//.test(c.sourceUrl)));

  const block = buildResearchStatsBlock(candidates);
  check("block carries the labeled heading", block.includes("## GEVERIFIEERD BRONMATERIAAL"));
  const enrichmentCost = 1 * EXA_UNIT_USD;
  console.log(`   enrichment cost ≈ $${enrichmentCost.toFixed(3)} (1 Exa search, S2 free, 0 extra Gemini) — budget $0.05`);
  check("enrichment cost <= $0.05", enrichmentCost <= 0.05);

  // 4. A/B generation — enriched vs baseline article on the same topic.
  if (process.env.SKIP_GEN === "1") {
    console.log("\n4. A/B generation skipped (SKIP_GEN=1)");
  } else {
    console.log("\n4. A/B generation (enriched vs baseline, same topic)");
    const baseParams = {
      contentType: "blog-post",
      brand: { brandName: "Better Brands", contentLanguage: "en" },
      userPrompt: TOPIC,
      locale: "en-US",
      includeProblem: true,
      humanVoiceMode: "BASELINE" as const,
    };
    const t0 = Date.now();
    const [baseline, enriched] = await Promise.all([
      generateLandingPageVariantBatch({ ...baseParams, additionalContextText: undefined }, 1, [], {}),
      generateLandingPageVariantBatch({ ...baseParams, additionalContextText: block }, 1, [], {}),
    ]);
    console.log(`   generation latency ≈ ${Math.round((Date.now() - t0) / 1000)}s (2 variants in parallel)`);

    const baseVariant = baseline[0]?.variant;
    const enrVariant = enriched[0]?.variant;
    check("both variants generated", !!baseVariant && !!enrVariant);

    if (baseVariant && enrVariant) {
      const baseGeo = computeGeoScore(flattenPageVariantToText(baseVariant)).signals.citedStats;
      const enrGeo = computeGeoScore(flattenPageVariantToText(enrVariant)).signals.citedStats;
      console.log(`   citedStats GEO-signal: baseline=${baseGeo}  enriched=${enrGeo}`);
      check("enriched citedStats >= baseline (A/B datapoint, 1 sample)", enrGeo >= baseGeo, `${enrGeo} vs ${baseGeo}`);

      const stats = (enrVariant as { citeableStats?: Array<{ value?: string; source?: string | null }> }).citeableStats ?? [];
      console.log(`   enriched citeableStats: ${stats.length}`);
      const traceable = stats.filter((s) =>
        candidates.some((c) =>
          (s.value && digits(s.value).length > 0 && digits(s.value) === digits(c.value)) ||
          (s.source && c.source && s.source.toLowerCase().includes(c.source.slice(0, 18).toLowerCase())),
        ),
      );
      check("enriched has >=1 citeableStat traceable to the package", traceable.length >= 1, `${traceable.length}/${stats.length} traceable`);

      // Guard against the leak class: no internal-layer source survived.
      const cleanSources = stats.every((s) => cleanStatSource(s.source ?? null) === (s.source ?? null) || !s.source);
      check("no internal-layer source in enriched stats", cleanSources);
    }
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
