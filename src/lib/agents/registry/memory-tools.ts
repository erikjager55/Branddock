// =============================================================
// Per-agent memory — recall-tool (agents-scheduling, slice 4).
//
// Recall is een vrije read-tool op orchestrator-niveau: hij draait
// direct in de loop (geen proposal). De agentId komt uit de tool-
// namespace van de run (`agent:<id>`) — server-owned, het model kan
// geen ander agent-geheugen lezen. De remember-tegenhanger is een
// propose-only Claw-tool (src/lib/claw/tools/memory-tools.ts) zodat
// elke write via het confirm-pad loopt (no-autonomy-regel).
// =============================================================

import { recallRelevant } from "@/lib/agents/memory";
import type {
  AgentToolNamespace,
  BrandclawTool,
} from "@/lib/brandclaw/orchestrator/types";
import { registerAgentTool } from "./tool-bridge";

/** `agent:<id>` → `<id>`; null voor Brandclaw-node-namespaces. */
export function agentIdFromNamespace(nodeType: string): string | null {
  return nodeType.startsWith("agent:") ? nodeType.slice("agent:".length) : null;
}

const recallMemoryTool: BrandclawTool = {
  definition: {
    name: "recall_agent_memory",
    description:
      "Search this agent's long-term memory for user-confirmed preferences, facts, decisions and outcomes from earlier runs. Call this once at the start of a task with a query describing what you are about to do.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look for (topic, task or preference domain).",
        },
        limit: { type: "number", description: "Max results (default 5, max 10)." },
      },
      required: ["query"],
    },
  },
  async execute(input, ctx) {
    const agentId = agentIdFromNamespace(ctx.nodeType);
    if (!agentId) {
      return {
        content: { error: "Memory is only available for catalog agents." },
        isError: true,
        errorCode: "NO_AGENT_CONTEXT",
      };
    }
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (!query) return { content: { memories: [] } };
    const rawLimit = typeof input.limit === "number" ? input.limit : 5;
    const memories = await recallRelevant({
      workspaceId: ctx.workspaceId,
      agentId,
      query,
      limit: Math.max(1, Math.min(10, rawLimit)),
    });
    return {
      content: {
        memories: memories.map((m) => ({
          id: m.id,
          content: m.content,
          memoryType: m.memoryType,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    };
  },
};

/** Registreert de recall-tool op de namespace van één agent. */
export function registerMemoryTools(namespace: AgentToolNamespace): void {
  registerAgentTool(namespace, recallMemoryTool);
}
