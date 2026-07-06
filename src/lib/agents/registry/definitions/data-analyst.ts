// Data Analyst — persona-agent op curated read-only query-tools
// (tasks/agents-data-analyst.md). Enige MVP-agent zonder bestaande motor:
// de "motor" is de vaste tool-set in ../data-analyst/query-tools.ts.
// TABLE-artefacten zijn server-owned (query-resultaat → run-collector);
// het model kan tabel-cijfers niet verzinnen — zie table-contract.ts.

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool } from "../tool-bridge";
import { dataAnalystQueryTools } from "../data-analyst/query-tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Dana", role: "Data Analyst", icon: "BarChart3" };

export const dataAnalystAgent: AgentDefinition = {
  id: "data-analyst",
  agentVersion: "data-analyst@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId }) {
    return buildAgentSystemPrompt({
      workspaceId,
      persona,
      mission:
        "You answer questions about this workspace's own data (content, campaigns, brand-fidelity scores, competitors, agent usage) using curated query tools — never invented numbers.",
      behavior: `- Your query tools run fixed, read-only database queries and attach their full result to this run as a TABLE artifact automatically. Never create TABLE artifacts yourself and never re-list a full table in your prose.
- Every number you mention MUST come from a tool result in this run. If you did not query it, you do not know it — say so instead of estimating.
- If a tool reports zero rows or "no data", state plainly that there is no data for that question. Never fabricate example or placeholder figures.
- Pick the smallest set of tools that answers the question (usually 1-2). Answer in concise prose: what the data shows, notable outliers, and — only when clearly supported by the data — a short recommendation.
- In your final artifacts JSON, return an empty artifacts array; the tables are already attached. Only add a REPORT when the user explicitly asks for a written analysis, and cite which attached table each statement comes from.`,
    });
  },
  promptVersion: "data-analyst-prompt@1",
  toolNamespace: "agent:data-analyst",
  useCases: [
    {
      id: "content-production",
      label: "Content production per month",
      promptTemplate:
        "Show our content production per month. Focus: {{input}}. Use query_content_production (and query_content_inventory if the mix per type matters) and summarize the trend.",
    },
    {
      id: "fval-trend",
      label: "Brand-fidelity (F-VAL) trend",
      promptTemplate:
        "How is our brand-fidelity score developing? Context: {{input}}. Use query_fval_scores and summarize the trend and any months that stand out.",
    },
    {
      id: "persona-coverage",
      label: "Persona coverage in content",
      promptTemplate:
        "Which personas are under-served by our content? Context: {{input}}. Use query_content_coverage with dimension 'personas' and point out the least-covered personas.",
    },
    {
      id: "campaign-status",
      label: "Campaign status overview",
      promptTemplate:
        "Give me a status overview of our campaigns. Focus: {{input}}. Use query_campaign_overview and summarize where the work is concentrated.",
    },
  ],
  featureKey: "agent-data-analyst",
  outputContract: artifactOutputContract,
  // Queries zijn goedkoop en snel — 12 calls is ruim voor elke zinnige vraag;
  // de guard truncate't met nette melding (artifact-contract GUARD_NOTE).
  maxToolCalls: 12,
  maxTokens: 8_000,
};

export function registerDataAnalystTools(): void {
  for (const tool of dataAnalystQueryTools) {
    registerAgentTool("agent:data-analyst", tool);
  }
}
