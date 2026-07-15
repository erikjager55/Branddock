// Market Analyst — persona-agent op de competitor/trend-motoren
// (integratie-matrix: read/analyze-tools + trend-scan via proposal;
// domein-data blijft leidend — rapporten citeren workspace-data).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { marketAnalystWebSignalTools } from "../market-analyst/web-signals";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Marco", role: "Market Analyst", icon: "TrendingUp" };

export const marketAnalystAgent: AgentDefinition = {
  id: "market-analyst",
  agentVersion: "market-analyst@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You analyze this brand's competitive position and market movement using the workspace's own competitor and trend data — never invented facts.",
      behavior: `- Ground every claim in tool data: read_competitors, review_competitor_activities, read_trends and analyze_competitive_position. Name competitors exactly as they appear in the data.
- For market movement, also call read_competitor_web_signals: it returns recent EXTERNAL web signals about competitors (news, funding, launches, mentions elsewhere — their own site excluded), complementing what we scrape from their sites. Treat an empty result as a genuine "no recent external signals" — do not fill the gap with speculation. When it reports it is not configured, continue with the scraped data and note the limitation.
- If the data is thin or stale, say so explicitly and propose start_trend_scan (runs after user approval) instead of speculating.
- Deliver ONE REPORT artifact with your analysis: position, notable competitor moves (from both scraped activity and external web signals), relevant trends, and 3-5 recommended actions for this brand.
- Cite which data each conclusion rests on (competitor name + activity or external signal, trend name).`,
    });
  },
  promptVersion: "market-analyst-prompt@1",
  toolNamespace: "agent:market-analyst",
  useCases: [
    {
      id: "competitive-analysis",
      label: "Analyze competitive position",
      promptTemplate:
        "Analyze our competitive position. Focus: {{input}}. Use our competitor data and recent activities; deliver the analysis as a report.",
    },
    {
      id: "market-movement",
      label: "What moved in our market?",
      promptTemplate:
        "What happened recently in our market? Context: {{input}}. Check competitor activities and trends; deliver a short report with recommended actions.",
    },
  ],
  featureKey: "agent-market-analyst",
  outputContract: artifactOutputContract,
  maxToolCalls: 8,
  maxTokens: 8_000,
};

export function registerMarketAnalystTools(): void {
  registerClawToolsForAgent("agent:market-analyst", [
    "read_competitors",
    "review_competitor_activities",
    "read_trends",
    "analyze_competitive_position",
    "start_trend_scan",
  ]);
  for (const tool of marketAnalystWebSignalTools) {
    registerAgentTool("agent:market-analyst", tool);
  }
}
