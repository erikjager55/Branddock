/**
 * Smoke-test voor de Data Analyst-agent (tasks/agents-data-analyst.md).
 *
 * Deterministisch en zonder Anthropic-calls (gratis):
 *   1. Registry: data-analyst geregistreerd + zichtbaar in de catalogus,
 *      7 query-tools onder namespace agent:data-analyst.
 *   2. Table-contract: strikte parser accepteert de server-shape en wijst
 *      misvormde tabellen af (rij-cap, non-scalar cellen, dubbele kolommen).
 *   3. recordTableArtifact: valide tabel → TABLE-draft in de run-collector;
 *      misvormd → REPORT-fallback met "table parse failed"-notitie — nooit
 *      een corrupt TABLE-artefact.
 *   4. Query-tools tegen de échte dev-DB: alle 7 draaien read-only, rij-cap
 *      ≤200, en workspace-isolatie (workspace A ziet geen data van B).
 *
 * De happy-path met echte model-runs loopt via POST /api/agents/run
 * (live smoke in de task-file) — bewust niet hier gedupliceerd.
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/smoke-tests/agents-data-analyst.ts
 */

import { randomUUID } from "node:crypto";
import { getAgentDefinition, listAgents } from "../../src/lib/agents/registry";
import {
  MAX_TABLE_ROWS,
  parseTableContent,
  recordTableArtifact,
} from "../../src/lib/agents/registry/data-analyst/table-contract";
import { dataAnalystQueryTools } from "../../src/lib/agents/registry/data-analyst/query-tools";
import { clearRunCollector, drainArtifacts } from "../../src/lib/agents/registry/run-collector";
import { getToolRegistry } from "../../src/lib/brandclaw/orchestrator/tool-registry";
import type { BrandclawRunContext } from "../../src/lib/brandclaw/orchestrator/types";
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

function fakeCtx(workspaceId: string): BrandclawRunContext {
  return {
    workspaceId,
    nodeType: "agent:data-analyst",
    agentVersion: "data-analyst@smoke",
    promptVersion: "smoke",
    runId: randomUUID(),
    triggerType: "manual",
    triggerSource: "smoke",
    userId: "smoke",
  };
}

interface TableResult {
  status?: string;
  rowCount?: number;
  title?: string;
  note?: string;
}

async function main() {
  console.log("\n=== Agents data-analyst smoke ===\n");

  // ─ 1. Registry ─
  console.log("## Registry\n");
  const def = getAgentDefinition("data-analyst");
  assert("data-analyst is registered", def !== undefined);
  assert("data-analyst is visible in the catalog", listAgents().some((a) => a.id === "data-analyst"));
  assert("featureKey is agent-data-analyst", def?.featureKey === "agent-data-analyst");
  assert("has 4 use-cases", def?.useCases.length === 4);
  const toolNames = getToolRegistry().listToolNames("agent:data-analyst");
  assert(
    "7 query-tools registered under agent:data-analyst",
    toolNames.length === 7,
    `got: ${toolNames.join(", ")}`,
  );

  // ─ 2. Table-contract parser ─
  console.log("\n## Table-contract parser\n");
  const validTable = {
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "count", label: "Count", type: "number" },
    ],
    rows: [{ name: "a", count: 1 }, { name: "b" }],
    summary: "2 rows.",
  };
  const parsedValid = parseTableContent(validTable);
  assert(
    "valid table parses; missing cell normalized to null",
    parsedValid.ok && parsedValid.table.rows[1].count === null,
  );
  assert("non-object content rejected", !parseTableContent("nope").ok);
  assert(
    "duplicate column keys rejected",
    !parseTableContent({ columns: [validTable.columns[0], validTable.columns[0]], rows: [] }).ok,
  );
  assert(
    "unknown column type rejected",
    !parseTableContent({ columns: [{ key: "x", label: "X", type: "chart" }], rows: [] }).ok,
  );
  assert(
    "non-scalar cell value rejected",
    !parseTableContent({ columns: validTable.columns, rows: [{ name: "a", count: { nested: true } }] }).ok,
  );
  const tooManyRows = {
    columns: validTable.columns,
    rows: Array.from({ length: MAX_TABLE_ROWS + 1 }, (_, i) => ({ name: `r${i}`, count: i })),
  };
  assert(`row cap (${MAX_TABLE_ROWS}) enforced by parser`, !parseTableContent(tooManyRows).ok);

  // ─ 3. recordTableArtifact (collector-gedrag) ─
  console.log("\n## recordTableArtifact\n");
  const okCtx = fakeCtx("smoke-ws");
  const okSummary = recordTableArtifact(okCtx, { title: "Smoke table", content: validTable }) as TableResult;
  const okDrafts = drainArtifacts(okCtx.runId);
  assert(
    "valid table → TABLE artifact draft + table_attached summary",
    okSummary.status === "table_attached" &&
      okSummary.rowCount === 2 &&
      okDrafts.length === 1 &&
      okDrafts[0].type === "TABLE",
  );

  const badCtx = fakeCtx("smoke-ws");
  const badSummary = recordTableArtifact(badCtx, {
    title: "Broken table",
    content: { columns: [], rows: "not-an-array" },
  }) as TableResult;
  const badDrafts = drainArtifacts(badCtx.runId);
  assert(
    "malformed table → REPORT fallback with parse-failed note, never a TABLE",
    badSummary.status === "table_parse_failed" &&
      badDrafts.length === 1 &&
      badDrafts[0].type === "REPORT" &&
      badDrafts[0].title.includes("table parse failed") &&
      String((badDrafts[0].content as { markdown?: string }).markdown).includes("Table parse failed"),
  );

  // ─ 4. Query-tools tegen de échte DB ─
  console.log("\n## Query-tools (real dev DB, read-only)\n");
  const wsA = await prisma.workspace.findFirst({ where: { name: "Zwarthout" }, select: { id: true, name: true } });
  const wsB = await prisma.workspace.findFirst({ where: { name: "Linfi" }, select: { id: true, name: true } });
  if (!wsA || !wsB) {
    assert("dev workspaces Zwarthout + Linfi exist", false, "seed the dev DB first");
  } else {
    for (const tool of dataAnalystQueryTools) {
      const ctx = fakeCtx(wsA.id);
      const input = tool.definition.name === "query_content_coverage" ? { dimension: "personas" } : {};
      const result = await tool.execute(input, ctx);
      const drafts = drainArtifacts(ctx.runId);
      const content = result.content as TableResult;
      const draft = drafts[0];
      const rows = (draft?.content as { rows?: unknown[] })?.rows;
      assert(
        `${tool.definition.name}: table_attached, rows ≤ ${MAX_TABLE_ROWS}`,
        !result.isError &&
          content.status === "table_attached" &&
          drafts.length === 1 &&
          draft.type === "TABLE" &&
          Array.isArray(rows) &&
          rows.length <= MAX_TABLE_ROWS,
        result.isError ? JSON.stringify(result.content).slice(0, 200) : `rows=${rows?.length}`,
      );
      clearRunCollector(ctx.runId);
    }

    // Workspace-isolatie: competitor-namen van A en B mogen niet overlappen.
    const ctxA = fakeCtx(wsA.id);
    const ctxB = fakeCtx(wsB.id);
    const competitorTool = dataAnalystQueryTools.find(
      (t) => t.definition.name === "query_competitor_activity",
    )!;
    await competitorTool.execute({}, ctxA);
    await competitorTool.execute({}, ctxB);
    const namesA = new Set(
      ((drainArtifacts(ctxA.runId)[0]?.content as { rows?: Array<{ name?: unknown }> })?.rows ?? []).map(
        (r) => String(r.name),
      ),
    );
    const rowsB = (drainArtifacts(ctxB.runId)[0]?.content as { rows?: Array<{ name?: unknown }> })?.rows ?? [];
    const overlap = rowsB.filter((r) => namesA.has(String(r.name)));
    assert(
      `workspace isolation: '${wsA.name}' and '${wsB.name}' competitor tables do not overlap`,
      namesA.size > 0 && rowsB.length > 0 && overlap.length === 0,
      `A=${namesA.size} B=${rowsB.length} overlap=${overlap.length}`,
    );

    // Cijfer-verificatie: query_content_production totaal == onafhankelijke Prisma-count.
    const ctxCount = fakeCtx(wsA.id);
    const productionTool = dataAnalystQueryTools.find(
      (t) => t.definition.name === "query_content_production",
    )!;
    await productionTool.execute({ months: 24 }, ctxCount);
    const prodRows =
      ((drainArtifacts(ctxCount.runId)[0]?.content as { rows?: Array<{ total?: number }> })?.rows ?? []);
    const toolTotal = prodRows.reduce((sum, r) => sum + (r.total ?? 0), 0);
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 23, 1));
    const dbTotal = await prisma.deliverable.count({
      where: { campaign: { workspaceId: wsA.id }, createdAt: { gte: start } },
    });
    assert(
      `content-production totals match independent DB count (${dbTotal})`,
      toolTotal === dbTotal,
      `tool=${toolTotal} db=${dbTotal}`,
    );
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Smoke crashed:", err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
