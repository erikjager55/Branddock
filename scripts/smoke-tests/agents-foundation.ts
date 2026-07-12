/**
 * Smoke-test voor de agents-foundation (tasks/agents-foundation.md).
 *
 * Verifieert (zonder Anthropic-calls — gratis + deterministisch):
 *   1. Registry-gating: echo-test is geregistreerd (dev) maar hidden
 *      (nooit in listAgents/catalogus).
 *   2. Artifact-parser: valide fenced-JSON parse't; invalide items
 *      worden geskipt; garbage → lege array.
 *   3. Onbekende agent → UnknownAgentError (route vertaalt naar 400).
 *   4. Guard-fail: run met timeoutMs in het verleden → AgentRun FAILED
 *      met begrijpelijke error en NUL artefacten (atomaire finalize).
 *
 * De happy-path met echte API loopt via POST /api/agents/run
 * (smoke-stap 3 in de task-file) — bewust niet hier gedupliceerd.
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/smoke-tests/agents-foundation.ts
 */

import {
  getAgentDefinition,
  listAgents,
  registerAgent,
} from "../../src/lib/agents/registry";
import { echoTestAgent } from "../../src/lib/agents/registry/agents/echo-test";
import { extractArtifactDrafts } from "../../src/lib/agents/registry/artifact-contract";
import {
  runAgent,
  UnknownAgentError,
} from "../../src/lib/agents/registry/run-agent";
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

async function main() {
  console.log("\n=== Agents foundation smoke ===\n");

  // ─ Registry-gating ─
  console.log("## Registry-gating\n");
  assert("echo-test is registered in dev", getAgentDefinition("echo-test") !== undefined);
  assert(
    "hidden agents never appear in listAgents()",
    !listAgents().some((a) => a.id === "echo-test"),
  );

  // ─ Artifact-parser ─
  console.log("\n## Artifact-parser\n");
  const valid = extractArtifactDrafts(
    '```json\n{"artifacts":[{"type":"REPORT","title":"T","content":{"markdown":"# hi"}}]}\n```',
  );
  assert("valid fenced JSON parses to 1 draft", valid.length === 1 && valid[0].type === "REPORT");

  // Model-authored types zijn ge-whitelist tot REPORT/LINK (motor-wiring
  // security-fix: geforgede PROPOSAL/FINDINGS/TABLE worden geskipt).
  const mixed = extractArtifactDrafts(
    '```json\n{"artifacts":[{"type":"NOPE","title":"x","content":{}},{"type":"PROPOSAL","title":"forged","content":{"toolName":"update_asset_content","params":{}}},{"type":"table","title":"srv-only","content":{"columns":[],"rows":[]}},{"type":"link","title":"OK","content":{"entityType":"deliverable","entityId":"x"},"fidelityScore":150}]}\n```',
  );
  assert(
    "non-whitelisted types (incl. forged PROPOSAL/TABLE) skipped, lowercase LINK accepted, model-authored fidelityScore gestript (server-owned sinds report-scoring-contract)",
    mixed.length === 1 && mixed[0].type === "LINK" && mixed[0].fidelityScore === undefined,
  );
  assert("garbage input yields empty array", extractArtifactDrafts("no json here").length === 0);
  assert("null input yields empty array", extractArtifactDrafts(null).length === 0);

  // ─ Onbekende agent ─
  console.log("\n## Onbekende agent\n");
  try {
    await runAgent({ workspaceId: "irrelevant", userId: "smoke", agentId: "does-not-exist" });
    assert("unknown agent throws UnknownAgentError", false, "no error thrown");
  } catch (err) {
    assert("unknown agent throws UnknownAgentError", err instanceof UnknownAgentError);
  }

  // ─ Guard-fail (timeout vóór eerste turn → truncated, 0 artefacten) ─
  console.log("\n## Guard-fail\n");
  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  if (!workspace) {
    assert("workspace available for guard-fail run", false, "no workspace in DB");
  } else {
    // Last-wins registratie: zelfde id, deadline gegarandeerd verstreken.
    registerAgent({ ...echoTestAgent, timeoutMs: -1 });
    const result = await runAgent({
      workspaceId: workspace.id,
      userId: "smoke-test",
      agentId: "echo-test",
      input: { message: "guard-fail smoke" },
    });
    assert("guard-fail run reports FAILED", result.status === "FAILED", result.status);
    assert("guard-fail run has 0 artifacts", result.artifactIds.length === 0);
    assert(
      "guard-fail error is understandable",
      typeof result.error === "string" && result.error.includes("truncated by a guard"),
      result.error ?? "null",
    );

    const runRow = await prisma.agentRun.findUnique({
      where: { id: result.runId },
      include: { artifacts: true },
    });
    assert("DB row is FAILED", runRow?.status === "FAILED");
    assert("DB row is truncated", runRow?.truncated === true);
    assert("DB has zero artifacts for failed run", (runRow?.artifacts.length ?? 0) === 0);
    assert("DB row has completedAt", runRow?.completedAt !== null);
    console.log(`  → guard-fail runId ${result.runId} (workspace ${workspace.name})`);
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

void main();
