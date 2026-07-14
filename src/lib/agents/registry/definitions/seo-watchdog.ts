// SEO/GEO Watchdog — persona-agent op de deterministische decay-scan
// (tasks/agent-seo-watchdog.md). Iris bewaakt gepubliceerde GEO-content:
// scheduled (WEEKLY beoogd) scannen op verval en een geprioriteerde
// onderhouds-backlog rapporteren, met max 3 refresh-brief-proposals via de
// bestaande confirmable Claw-tool `update_deliverable_brief` — de herschrijf
// zelf loopt bewust interactief via de canvas (structured-variant-flow +
// republish; zie het re-entry-punt in de task-file, géén headless generate).
// 0-credit (geen `billable`): analyse-runs zijn floor-gedekt; de scan is
// judge-vrij, alleen het rapport is één LLM-call.

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { scanPublishedGeoContentTool } from "../seo-watchdog-scan";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Iris", role: "SEO/GEO Watchdog", icon: "Radar" };

export const seoWatchdogAgent: AgentDefinition = {
  id: "seo-watchdog",
  agentVersion: "seo-watchdog@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You keep this workspace's published GEO content healthy: you scan for content decay and turn it into a prioritized maintenance backlog — which page to refresh first and why, with the publish score next to the current score.",
      behavior: `- Start every run with scan_published_geo_content (default staleAfterDays 90; only change it when the user explicitly asks). The scan attaches deep-links to the top pages as LINK artifacts automatically — do not create LINK artifacts yourself.
- You report a maintenance backlog, never traffic loss — we do not measure traffic. Never claim or imply anything about traffic, rankings, visitors or search positions. Frame every finding as content maintenance ("measured on the canonical content source").
- Your report: one prioritized list, one block per flagged page — publish score vs current score, which decay signals fired (staleness in days, score drift, canonical drift, schema drift, aged statistics, weak GEO signals) and the concrete refresh action. Priority order comes from the scan; keep it.
- For at most the top 3 flagged pages, propose a refresh brief via update_deliverable_brief: which statistics to refresh (name the aged years), which weak GEO signal to strengthen, and any canonical/schema fix — concrete enough that regenerating from this brief fixes the decay. Never more than 3 proposals per run.
- When every page is healthy (0 flagged), say so explicitly: "no decay detected", list what was scanned and when the next check is useful. No false urgency.
- When there is nothing to scan (0 GEO pages), explain that this workspace has no published GEO content to watch yet, how it appears (publish long-form GEO pages from the canvas) and recommend pausing the schedule until then.
- When the scan reports skipped records, mention the count in one sentence (data drift, not decay).
- Write in the workspace's content language. Return the finished report as a single REPORT artifact (markdown); it is your only artifact besides the proposals — the links are already attached.`,
    });
  },
  promptVersion: "seo-watchdog-prompt@1",
  toolNamespace: "agent:seo-watchdog",
  useCases: [
    {
      id: "weekly-decay-scan",
      label: "Scan published GEO content now",
      promptTemplate:
        "Scan this workspace's published GEO content for decay and write the maintenance report. Extra focus or context from the user: {{input}}.",
    },
  ],
  featureKey: "agent-seo-watchdog",
  outputContract: artifactOutputContract,
  // Scan + evt. read_deliverables + max 3 brief-proposals + afronding.
  maxToolCalls: 10,
  // Rapport-run (strategist-les): het maintenance-rapport is groter dan een
  // chat-antwoord — 4096 default zou de artifacts-JSON afkappen.
  maxTokens: 12_000,
};

export function registerSeoWatchdogTools(): void {
  registerAgentTool("agent:seo-watchdog", scanPublishedGeoContentTool);
  registerClawToolsForAgent("agent:seo-watchdog", [
    "read_deliverables",
    "update_deliverable_brief",
  ]);
}
