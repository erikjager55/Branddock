/**
 * Per-agent memory smoke (agents-scheduling, slice 4) — tegen de dev-DB.
 * Deterministisch (geen model-keuze nodig): valideert de mechaniek die
 * task-smoke-stap 5 draagt.
 *
 *   1. registratie: recall + remember staan op de agent-namespace;
 *      remember zit NIET in de Claw-chat-surface;
 *   2. remember-execute (zoals de confirm-route hem aanroept) → rij mét
 *      agentId; zonder agentId → hard error (forge-guard);
 *   3. recall-tool vindt hem voor déze agent; een andere agent niet;
 *   4. delete → recall leeg.
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agent-memory-smoke.ts
 */

import { prisma } from "../../src/lib/prisma";
import "../../src/lib/agents/registry"; // bootstrap: registreert agents + tools
import { getToolRegistry } from "../../src/lib/brandclaw/orchestrator/tool-registry";
import { getToolByName, getToolsForClaude } from "../../src/lib/claw/tools/registry";
import type {
  BrandclawRunContext,
  ToolNamespace,
} from "../../src/lib/brandclaw/orchestrator/types";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better Brands (dev-DB)
const USER_ID = "demo-user-erik-001";
const MARKER = `memory-smoke ${new Date().toISOString()}`;

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function runCtx(namespace: string): BrandclawRunContext {
  return {
    workspaceId: WORKSPACE_ID,
    nodeType: namespace,
    agentVersion: "smoke@0",
    promptVersion: "smoke@0",
    runId: "smoke-run",
    triggerType: "manual",
    triggerSource: USER_ID,
    userId: USER_ID,
  } as BrandclawRunContext;
}

async function main() {
  await prisma.agentMemory.deleteMany({
    where: { workspaceId: WORKSPACE_ID, content: { contains: "memory-smoke" } },
  });

  // ── 1: registratie ─────────────────────────────────────────────────────
  const strategistTools = getToolRegistry()
    .getToolsForNode("agent:strategist")
    .map((t) => t.definition.name);
  if (!strategistTools.includes("recall_agent_memory")) fail("recall_agent_memory niet op agent:strategist");
  if (!strategistTools.includes("remember_agent_memory")) fail("remember_agent_memory niet op agent:strategist");
  if (getToolsForClaude().some((t) => t.name === "remember_agent_memory")) {
    fail("remember_agent_memory lekt naar de Claw-chat-surface");
  }
  console.log("✓ registratie: memory-tools op agent-namespace, niet in de chat-surface");

  // ── 2: remember-execute (confirm-pad) + forge-guard ────────────────────
  const rememberTool = getToolByName("remember_agent_memory");
  if (!rememberTool) fail("remember_agent_memory niet opzoekbaar via getToolByName");
  const params = { content: `${MARKER} — Erik wil rapporten altijd in het Nederlands.`, memoryType: "PREFERENCE" };
  let forged = false;
  try {
    await rememberTool.execute(params, { workspaceId: WORKSPACE_ID, userId: USER_ID });
    forged = true;
  } catch {
    /* verwacht: geen agent-context */
  }
  if (forged) fail("remember zonder agentId hoort te throwen (forge-guard)");
  const result = (await rememberTool.execute(params, {
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    agentId: "strategist",
  })) as { stored?: boolean; memoryId?: string };
  if (!result.stored || !result.memoryId) fail("remember-execute sloeg niet op");
  const row = await prisma.agentMemory.findUnique({ where: { id: result.memoryId } });
  if (row?.agentId !== "strategist") fail(`rij hoort agentId 'strategist' te hebben, is ${row?.agentId}`);
  console.log("✓ remember: forge-guard + opslag mét agentId");

  // ── 3: recall-tool — eigen agent wél, andere agent níet ────────────────
  const recallVia = async (namespace: ToolNamespace) => {
    const tool = getToolRegistry()
      .getToolsForNode(namespace)
      .find((t) => t.definition.name === "recall_agent_memory");
    if (!tool) fail(`recall-tool ontbreekt op ${namespace}`);
    const res = (await tool.execute({ query: "taal voorkeur rapporten" }, runCtx(namespace))) as {
      content: { memories?: Array<{ content: string }> };
    };
    return res.content.memories ?? [];
  };
  const own = await recallVia("agent:strategist");
  if (!own.some((m) => m.content.includes("memory-smoke"))) fail("strategist-recall vindt de memory niet");
  const other = await recallVia("agent:content-creator");
  if (other.some((m) => m.content.includes("memory-smoke"))) fail("cross-agent-lek: content-creator ziet strategist-memory");
  console.log("✓ recall: agent-gescoped (eigen agent wél, andere agent níet)");

  // ── 4: delete → recall leeg ─────────────────────────────────────────────
  await prisma.agentMemory.delete({ where: { id: result.memoryId } });
  const afterDelete = await recallVia("agent:strategist");
  if (afterDelete.some((m) => m.content.includes("memory-smoke"))) fail("memory na delete nog vindbaar");
  console.log("✓ delete: memory weg uit recall");

  console.log("✅ agent-memory-smoke geslaagd");
}

main()
  .catch((err) => {
    console.error("❌ smoke crashte:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
