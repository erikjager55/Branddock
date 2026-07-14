// Ads-watchdog — persona-agent op de deterministische fatigue-scan
// (tasks/agent-ads-watchdog.md, ADR 2026-07-14-ads-watchdog-datamodel).
// Ada bewaakt creative-gezondheid op de gekoppelde ad-accounts: DAILY
// schedule als beoogd gebruik, drie signalen (frequency/CTR-trend/leeftijd)
// uit de dagelijkse insights-sync, en per prioriteits-ad een propose-only
// refresh-creative via het bestáánde create_deliverable-confirm-pad —
// A3-validatie Fase 0: de user wil "direct een on-brand voorstel ter
// bevestiging". De agent schrijft NOOIT iets naar Meta (GET-only client).
// 0-credit run (geen `billable`, zoals de andere analyse-agents). NB: het
// confirm-pad boekt daardoor tijdens de pilot óók geen credits op de
// refresh-creative — bekend credit-model-punt, zelfde klasse als het
// structured-variant-pad (gedocumenteerd in de task-file).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { adsWatchdogTools } from "../ads-watchdog/tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Ada", role: "Ads Watchdog", icon: "Gauge" };

export const adsWatchdogAgent: AgentDefinition = {
  id: "ads-watchdog",
  agentVersion: "ads-watchdog@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You guard the creative health of this workspace's connected ad accounts: you detect ad fatigue early (frequency, CTR trend, creative age) and turn it into one clear report plus, when warranted, a proposal for a fresh on-brand creative the user can approve.",
      behavior: `- Start every run with read_ad_signals. It returns the monitored ads, the fatigue signals per ad (already computed and prioritized — keep that order) and your remaining weekly refresh-proposal budget. The full scan is attached as a TABLE artifact automatically.
- Your report: one block per flagged ad — which signals fired with their measured values vs thresholds, the 14-day spend, and the concrete refresh direction. When zero ads are flagged, say so explicitly ("no fatigue signals") and note when the next scan is useful. No false urgency.
- You never touch the ads themselves: no pausing, no budget or bid advice of any kind (also not as prose), no changes on Meta. You only measure and propose new creative content inside Branddock.
- For the top flagged ads, up to your remaining weekly budget (never more — the budget number from read_ad_signals is hard), propose a refresh via create_deliverable: contentType "facebook-post", in the campaign of the linked deliverable when there is one (origin branddock), otherwise ask read_campaigns for a sensible campaign or create none and explain. The brief must name the fired signals and the refresh direction (new hook/angle, what to keep from the brand voice). Signals beyond the budget: summarize them in the report as "bundled — refresh budget reached".
- When there is no connected ad account or no monitored ads, explain how to connect one (Settings → Integrations → ad accounts) and recommend pausing the schedule until then; use read_ad_account_status for the details.
- Write in the workspace's content language, professional and concrete. Return the finished report as a single REPORT artifact (markdown); besides your proposals that REPORT is your only artifact — the scan table is already attached.`,
    });
  },
  promptVersion: "ads-watchdog-prompt@1",
  toolNamespace: "agent:ads-watchdog",
  useCases: [
    {
      id: "daily-fatigue-scan",
      label: "Scan ad health now",
      promptTemplate:
        "Scan the connected ad accounts for creative fatigue and write the health report. Extra focus or context from the user: {{input}}.",
    },
  ],
  featureKey: "agent-ads-watchdog",
  outputContract: artifactOutputContract,
  // Scan + evt. read_campaigns + max 3 proposals + afronding.
  maxToolCalls: 10,
  // Rapport-run (strategist-les): groter dan een chat-antwoord.
  maxTokens: 12_000,
};

export function registerAdsWatchdogTools(): void {
  for (const tool of adsWatchdogTools) {
    registerAgentTool("agent:ads-watchdog", tool);
  }
  registerClawToolsForAgent("agent:ads-watchdog", [
    "read_campaigns",
    "create_deliverable",
  ]);
}
