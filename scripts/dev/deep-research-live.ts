/**
 * scripts/dev/deep-research-live.ts
 *
 * LIVE end-to-end verificatie van de Deep Research-pipeline met de ECHTE deps
 * (echte Gemini grounding + Anthropic synthese). KOST API-budget. Bewust kleine
 * caps. `useBrandContext: false` → geen brand-DB-afhankelijkheid.
 *
 * Run:
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local \
 *     node_modules/.bin/tsx scripts/dev/deep-research-live.ts
 */

import { runDeepResearch } from "@/lib/knowledge-research/orchestrator";
import type { DeepResearchEvent } from "@/lib/knowledge-research/types";

async function main(): Promise<void> {
  const topic =
    "How are mid-market B2B SaaS brands using AI in their content marketing workflows in 2026?";
  const answers = [
    { id: "q1", question: "Welke markt/regio?", answer: "Europa / Benelux, mid-market B2B SaaS" },
    { id: "q2", question: "Welke focus?", answer: "Praktische workflows en tooling, niet hype" },
  ];

  console.log("LIVE deep-research run (echte Gemini + Anthropic calls)…\n");
  const events: DeepResearchEvent[] = [];
  const t0 = Date.now();

  const report = await runDeepResearch({
    workspaceId: "live-test",
    topic,
    answers,
    useBrandContext: false,
    sendEvent: (e) => {
      events.push(e);
      switch (e.type) {
        case "phase":
          console.log(`  [phase] ${e.phase} ${e.status}`);
          break;
        case "plan":
          console.log(`  [plan] ${e.subQuestions.length} sub-questions`);
          break;
        case "source":
          console.log(`  [source ${e.index}] (${e.origin}) ${e.title} — ${e.url}`);
          break;
        case "source-read":
          console.log(`  [read ${e.index}] ${e.status}`);
          break;
        case "verify":
          console.log(`  [verify] checked ${e.claimsChecked}, flagged ${e.flagged}`);
          break;
        case "warning":
          console.log(`  [warning] ${e.message}`);
          break;
        default:
          break;
      }
    },
    signal: new AbortController().signal,
    config: { maxSearchQueries: 3, maxSourcesToScrape: 4, enableVerify: true, deadlineMs: 480_000 },
  });

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== REPORT (${secs}s) ===`);
  console.log("title    :", report.suggestedTitle);
  console.log("category :", report.suggestedCategory);
  console.log("tags     :", report.suggestedTags.join(", "));
  console.log("summary  :", report.summary);
  console.log("takeaways:", report.keyTakeaways);
  console.log(
    "sources  :\n  " +
      report.sources
        .map((s) => `[${s.index}${s.used ? "*" : " "}] ${s.title} — ${s.url || "(no url)"}`)
        .join("\n  "),
  );
  console.log("warnings :", report.warnings.length ? report.warnings : "(none)");
  console.log("\n--- markdown (first 1800 chars) ---\n");
  console.log(report.markdown.slice(0, 1800));
  console.log(`\n--- markdown length: ${report.markdown.length} chars ---`);
  console.log("has `## Sources`:", /^##\s+Sources\s*$/im.test(report.markdown));
  console.log("cited source count:", report.sources.filter((s) => s.used).length);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nLIVE TEST FAILED:", e);
    process.exit(1);
  });
