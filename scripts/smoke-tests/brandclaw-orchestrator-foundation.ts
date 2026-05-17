/**
 * Smoke-test voor Brandclaw orchestrator foundation (Fase 1).
 *
 * Verifieert zonder Anthropic API-call:
 *   1. Tool-registry register + lookup + per-node-isolatie
 *   2. Cost-calculator: known model + fallback
 *   3. createRunRow + persistRun met mock-observations op test-workspace
 *
 * Skipt de agent-loop integration-test (vereist real Anthropic key +
 * gespecialiseerde mock-tools). Echte e2e komt in vervolgsessie samen
 * met de 4 strategy_analyst query-tools.
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/smoke-tests/brandclaw-orchestrator-foundation.ts
 */

import { getRegistryForTests as getToolRegistry } from "../../src/lib/brandclaw/orchestrator/tool-registry";
import { computeRunCost } from "../../src/lib/brandclaw/orchestrator/cost-calculator";
import { createRunRow, persistRun } from "../../src/lib/brandclaw/orchestrator/persistence";
import type { BrandclawTool, AgentLoopResult } from "../../src/lib/brandclaw/orchestrator/types";
import { prisma } from "../../src/lib/prisma";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function mockTool(name: string): BrandclawTool {
  return {
    definition: {
      name,
      description: `Mock tool ${name}`,
      input_schema: { type: "object", properties: {} },
    },
    execute: async () => ({ content: { ok: true } }),
  };
}

async function main() {
  console.log("\n=== Brandclaw orchestrator foundation smoke ===\n");

  // ─ Tool-registry isolation ─
  console.log("## Tool-registry per-node isolation\n");
  const registry = getToolRegistry();
  registry.reset();

  registry.register("strategy_analyst", mockTool("query_x"));
  registry.register("strategy_analyst", mockTool("query_y"));
  registry.register("campaign_builder", mockTool("query_z"));

  const analystTools = registry.getToolsForNode("strategy_analyst");
  assert("strategy_analyst has 2 tools", analystTools.length === 2);

  const builderTools = registry.getToolsForNode("campaign_builder");
  assert("campaign_builder has 1 tool", builderTools.length === 1);

  assert(
    "isolation: campaign_builder cannot see analyst tools",
    builderTools.every((t) => t.definition.name === "query_z"),
  );

  assert(
    "getTool found analyst.query_x",
    registry.getTool("strategy_analyst", "query_x") !== undefined,
  );
  assert(
    "getTool returns undefined for unknown tool",
    registry.getTool("strategy_analyst", "nonexistent") === undefined,
  );
  assert(
    "getTool returns undefined for unknown node",
    registry.getTool("measurement_eval", "query_x") === undefined,
  );

  registry.reset();
  assert("reset clears all tools", registry.getToolsForNode("strategy_analyst").length === 0);

  // ─ Cost-calculator ─
  console.log("\n## Cost-calculator (Anthropic pricing)\n");

  const sonnet = computeRunCost({
    model: "claude-sonnet-4-6-20251001",
    inputTokens: 1_000_000,
    outputTokens: 500_000,
  });
  assert(
    "Sonnet 1M input = $3.0",
    sonnet.inputCostUsd === 3.0,
    `got ${sonnet.inputCostUsd}`,
  );
  assert(
    "Sonnet 500K output = $7.5",
    sonnet.outputCostUsd === 7.5,
    `got ${sonnet.outputCostUsd}`,
  );
  assert(
    "Sonnet total = $10.5",
    sonnet.totalUsd === 10.5,
    `got ${sonnet.totalUsd}`,
  );
  assert("Sonnet not fallback", !sonnet.fallback);

  const tiny = computeRunCost({
    model: "claude-sonnet-4-6-20251001",
    inputTokens: 1000,
    outputTokens: 200,
  });
  // 1000 tokens × $3/M = $0.003; 200 × $15/M = $0.003; total $0.006
  assert("Tiny run rounds to 6 decimals", tiny.totalUsd === 0.006);

  const unknown = computeRunCost({
    model: "claude-x-future",
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  });
  assert("Unknown model uses fallback pricing", unknown.fallback);
  assert(
    "Unknown model fallback price $3 + $15 = $18",
    unknown.totalUsd === 18.0,
  );

  // ─ Persistence: createRunRow + persistRun met mock data ─
  console.log("\n## Persistence helpers\n");

  // Setup: gebruik een bestaande workspace voor de smoke. Persistence
  // graceful skip wanneer geen workspace bestaat (test-DB clean state).
  const workspace = await prisma.workspace.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!workspace) {
    console.warn(`  SKIP persistence tests — no workspace in DB`);
    console.log(`\n=== RESULT: ${pass} pass, ${fail} fail (persistence skipped) ===\n`);
    process.exit(fail === 0 ? 0 : 1);
  }

  const runId = `smoke-run-${Date.now()}`;
  await createRunRow({
    runId,
    ctx: {
      workspaceId: workspace.id,
      nodeType: "strategy_analyst",
      agentVersion: "smoke@0.0.1",
      promptVersion: "smoke-prompt-v1",
      runId,
      triggerType: "manual",
      triggerSource: "smoke-test",
    },
  });

  const placeholderRun = await prisma.strategyObservationRun.findUnique({
    where: { id: runId },
    select: { id: true, totalCostUsd: true, latencyMs: true },
  });
  assert("placeholder run created", placeholderRun !== null);
  assert("placeholder latencyMs is 0", placeholderRun?.latencyMs === 0);

  // Finalize met mock result
  const mockResult: AgentLoopResult = {
    runId,
    workspaceId: workspace.id,
    nodeType: "strategy_analyst",
    agentVersion: "smoke@0.0.1",
    promptVersion: "smoke-prompt-v1",
    toolCallTrace: [
      {
        toolUseId: "tu_1",
        toolName: "query_x",
        input: { workspaceId: workspace.id },
        output: { ok: true },
        isError: false,
        errorCode: null,
        latencyMs: 42,
        calledAt: new Date().toISOString(),
      },
    ],
    observations: [
      {
        dimension: "voice_drift",
        severity: "MEDIUM",
        confidence: "HIGH",
        summary: "Smoke-test observation — wordsWeAvoid grew 12 → 18 in last 30d.",
        evidence: { snapshotIds: ["snap_mock_1"] },
      },
    ],
    latencyMs: 1234,
    totalCostUsd: 0.05,
    totalInputTokens: 1000,
    totalOutputTokens: 200,
    truncated: false,
    finalMessage: "{\"observations\":[...]}",
  };

  const cost = computeRunCost({
    model: "claude-sonnet-4-6-20251001",
    inputTokens: 1000,
    outputTokens: 200,
  });
  const persisted = await persistRun(mockResult, cost);
  assert("persistRun returns observationsWritten=1", persisted.observationsWritten === 1);

  const finalRun = await prisma.strategyObservationRun.findUnique({
    where: { id: runId },
    select: { latencyMs: true, totalCostUsd: true, toolCallTrace: true },
  });
  assert("finalize sets latencyMs to 1234", finalRun?.latencyMs === 1234);
  assert(
    "finalize sets totalCostUsd to 0.006 (Sonnet pricing for tiny tokens)",
    finalRun?.totalCostUsd.toString() === "0.006",
    `got ${finalRun?.totalCostUsd.toString()}`,
  );
  assert(
    "toolCallTrace persisted as array",
    Array.isArray(finalRun?.toolCallTrace),
  );

  const obs = await prisma.strategyObservation.findMany({
    where: { runId },
    select: { dimension: true, severity: true, confidence: true },
  });
  assert("observation persisted", obs.length === 1);
  assert("observation dimension correct", obs[0]?.dimension === "voice_drift");
  assert("observation severity HIGH/MEDIUM/LOW casting works", obs[0]?.severity === "MEDIUM");

  // Cleanup
  await prisma.strategyObservation.deleteMany({ where: { runId } });
  await prisma.strategyObservationRun.delete({ where: { id: runId } });

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke crashed:", err);
  process.exit(1);
});
