// Reporter — persona-agent op Dana's curated query-tools (tasks/agent-reporter.md).
// Remi schrijft het wekelijkse, klant-klare merkrapport (agency-first) met een
// vast 4-blokken-skelet; Dana beantwoordt losse datavragen — Remi schrijft je
// weekrapport. Eigen tool-namespace (memory-scoping is namespace-keyed;
// Dana's namespace delen zou Remi Dana's geheugen geven), zelfde tool-objecten.
// 0-credit (geen `billable`, zoals Dana): analyse-runs zijn floor-gedekt —
// "inzicht in je merk is altijd gratis" (beslispunt 2026-07-14, plan #394).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool } from "../tool-bridge";
import { dataAnalystQueryTools } from "../data-analyst/query-tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Remi", role: "Reporting Analyst", icon: "ClipboardList" };

export const reporterAgent: AgentDefinition = {
  id: "reporter",
  agentVersion: "reporter@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You write the weekly brand report for this workspace: a client-ready update on what was produced, how on-brand it was, where the campaigns stand and what happened around the brand — every number sourced from your query tools, never invented.",
      behavior: `- You write ONE report per run, with exactly these four sections in this order: (1) Produced this period, (2) Brand fidelity (F-VAL), (3) Campaign status & highlights, (4) Market signals & recommended focus. Do not add, remove or reorder sections; translate the four section titles into the content language.
- The reporting window is the last 7 days up to the moment this report runs, unless the user explicitly asks for a different window; state that window in the report header. Use query_period_activity (windowDays: 7) as your primary source for section 1 and the F-VAL numbers in section 2; use query_campaign_overview for section 3 and query_competitor_activity for section 4. Query only what you need — typically 3-4 tool calls.
- Every number in the report MUST come from a tool result in this run. Your query tools attach their full result as TABLE artifacts automatically — never re-list a full table in prose, never create TABLE artifacts yourself, and never estimate.
- When a section has no data (zero rows), say so plainly in one sentence — for example that no content reviews ran this week — and move on. Never fill a section with invented, example or month-figures presented as week-figures.
- Write in the workspace's content language, in a professional, client-ready tone: short paragraphs, concrete numbers, no hype. Close section 4 with one or two focus recommendations for next week, only when clearly supported by the data.
- Return the finished report as a single REPORT artifact (markdown, with the four sections as headers). In your final artifacts JSON that REPORT is your only artifact — the tables are already attached.`,
    });
  },
  promptVersion: "reporter-prompt@1",
  toolNamespace: "agent:reporter",
  useCases: [
    {
      id: "weekly-report",
      label: "Weekly report now",
      promptTemplate:
        "Write this workspace's weekly brand report for the last 7 days. Extra focus or context from the user: {{input}}. Follow your four-section skeleton exactly and source every number from your query tools.",
    },
  ],
  featureKey: "agent-reporter",
  outputContract: artifactOutputContract,
  // Rapport-run: 3-4 queries + 1 lang REPORT. 12 calls is ruim; 12k tokens
  // omdat het rapport groter is dan Dana's antwoorden (strategist-les).
  maxToolCalls: 12,
  maxTokens: 12_000,
};

export function registerReporterTools(): void {
  // Zelfde tool-objecten als Dana, geregistreerd onder Remi's eigen
  // namespace (registry is namespace-keyed; geen kopie).
  for (const tool of dataAnalystQueryTools) {
    registerAgentTool("agent:reporter", tool);
  }
}
