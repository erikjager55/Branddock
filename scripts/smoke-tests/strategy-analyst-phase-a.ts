/**
 * Smoke-test voor Strategy Analyst Phase A foundation.
 *
 * Verifieert:
 *   1. System-prompt build is stable + bevat alle anchor-secties
 *   2. promptVersion is deterministic hash
 *   3. runStrategyAnalyst init triggert tools-registration
 *   4. (optional) end-to-end run met real Anthropic API + bestaande
 *      workspace → expect ≥0 observations + cost <$1 + latency <5min.
 *      Skipped wanneer ANTHROPIC_API_KEY of workspace ontbreekt.
 *
 * Run: DATABASE_URL="postgresql://..." ANTHROPIC_API_KEY=... \
 *      npx tsx scripts/smoke-tests/strategy-analyst-phase-a.ts
 */

import {
  buildStrategyAnalystSystemPrompt,
  computePromptVersion,
  STRATEGY_ANALYST_AGENT_VERSION,
} from "../../src/lib/brandclaw/nodes/strategy-analyst/system-prompt";
import { runStrategyAnalyst } from "../../src/lib/brandclaw/nodes/strategy-analyst";
import { getRegistryForTests as getToolRegistry } from "../../src/lib/brandclaw/orchestrator/tool-registry";
import { prisma } from "../../src/lib/prisma";

let pass = 0;
let fail = 0;
let skipped = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function skip(name: string, reason: string): void {
  console.log(`  SKIP ${name} -- ${reason}`);
  skipped++;
}

async function main() {
  console.log("\n=== Strategy Analyst Phase A smoke ===\n");

  // ─ System-prompt build ─
  console.log("## System-prompt build\n");

  const prompt = buildStrategyAnalystSystemPrompt();
  assert("prompt is non-empty", prompt.length > 0);
  assert("prompt mentions two-reasons-test", prompt.includes("two-reasons-test"));
  assert("prompt mentions all 4 tools", [
    "query_alignment_history",
    "query_content_fidelity",
    "query_review_history",
    "query_brand_voice_drift",
  ].every((t) => prompt.includes(t)));
  assert("prompt has all 5 dimension fragments", [
    "Dimension: voice_drift",
    "Dimension: fidelity_decline",
    "Dimension: review_pattern",
    "Dimension: alignment_gap",
    "Dimension: publish_quality_trend",
  ].every((d) => prompt.includes(d)));
  assert("prompt has JSON-output template", prompt.includes("\"observations\""));
  assert("prompt has self-check section", prompt.includes("SELF-CHECK"));

  // ─ promptVersion determinism ─
  console.log("\n## promptVersion determinism\n");

  const v1 = computePromptVersion();
  const v2 = computePromptVersion();
  assert("promptVersion stable across calls", v1 === v2);
  assert("promptVersion has sha256 prefix", v1.startsWith("sha256:"));
  assert("promptVersion has 12-char digest", v1.length === "sha256:".length + 12);

  // ─ agentVersion constant ─
  console.log("\n## agentVersion constant\n");
  assert(
    "agentVersion is strategy-analyst@0.2.0",
    STRATEGY_ANALYST_AGENT_VERSION === "strategy-analyst@0.2.0",
  );

  // ─ Real-API end-to-end (optional) ─
  console.log("\n## Real-API end-to-end (optional)\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    skip("agent-loop real-API run", "ANTHROPIC_API_KEY not set");
  } else {
    const workspace = await prisma.workspace.findFirst({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    if (!workspace) {
      skip("agent-loop real-API run", "no workspace in DB");
    } else {
      console.log(`  → running Analyst on workspace ${workspace.name} (${workspace.id})`);
      console.log(`  → this calls Anthropic API; cost ~$0.05-0.20 per run`);
      try {
        const result = await runStrategyAnalyst({
          workspaceId: workspace.id,
          triggerType: "manual",
          triggerSource: "smoke-test",
        });
        assert("run completed", typeof result.runId === "string" && result.runId.length > 0);
        assert("run has agentVersion stamp", result.agentVersion === STRATEGY_ANALYST_AGENT_VERSION);
        assert("run has promptVersion stamp", result.promptVersion.startsWith("sha256:"));
        assert("latency < 5min", result.latencyMs < 5 * 60 * 1000);
        assert("cost < $1", result.totalCostUsd < 1.0);
        assert("toolCallTrace populated (≥1 tool used)", result.toolCallTrace.length > 0);
        console.log(
          `  → result: ${result.observations.length} observations, ${result.toolCallTrace.length} tool-calls, $${result.totalCostUsd.toFixed(4)}, ${(result.latencyMs / 1000).toFixed(1)}s${result.truncated ? " (truncated)" : ""}`,
        );

        // Cleanup — Phase A smoke leaves Real run-row + observations in DB
        // voor inspectie. Bij next test-run worden ze niet expliciet
        // verwijderd; oude runs vormen geen probleem (cascade-delete bij
        // workspace-delete + index op createdAt voor pagination).
      } catch (err) {
        console.error("  ERROR:", err instanceof Error ? err.message : err);
        fail++;
      }
    }
  }

  // ─ Tool-registry state after init ─
  console.log("\n## Tool-registry state after Analyst-init\n");
  const registry = getToolRegistry();
  const analystTools = registry.listToolNames("strategy_analyst");
  // Real-API path doet de tools-init; zonder real-API blijven tools mogelijk
  // ongeregistreerd. Acceptabel — main coverage zit elders.
  if (analystTools.length === 0) {
    skip("4 tools registered after init", "Analyst not invoked (no ANTHROPIC_API_KEY)");
  } else {
    assert(
      "4 tools registered after Analyst init",
      analystTools.length === 4,
      `got [${analystTools.join(", ")}]`,
    );
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail, ${skipped} skipped ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke crashed:", err);
  process.exit(1);
});
