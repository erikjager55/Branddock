// Strategist — persona-agent op de campagne-strategie-motor
// (integratie-matrix: strategy-chain-stappen als tools; campagne-creatie
// uitsluitend via het proposal-pad).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import {
  buildConceptStrategyTool,
  buildStrategyFoundationTool,
  generateCreativeConceptsTool,
  mineInsightsTool,
} from "../pipeline-tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Stella", role: "Strategist", icon: "Compass" };

export const strategistAgent: AgentDefinition = {
  id: "strategist",
  agentVersion: "strategist@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You build evidence-based campaign strategies on top of this brand's DNA, personas and market context.",
      behavior: `- Default flow: build_strategy_foundation → mine_insights → pick the strongest insight yourself (explain why) → deliver a strategy-DIRECTION report. This fits the run budget; every step is slow (minutes) — never repeat a step.
- generate_creative_concepts and build_concept_driven_strategy exist for explicit follow-up asks, but the full elaboration usually exceeds one run — recommend the campaign wizard for that, and say so.
- Use read_personas/read_products when you need to reference them precisely.
- Deliver ONE REPORT artifact titled after the campaign, containing: foundation summary, the chosen insight + rationale, and your recommended creative direction + next steps. Keep it decision-ready, not exhaustive. Proposing a campaign does NOT replace this report — your final message must contain the artifacts JSON with the full strategy REPORT even when you also propose create_campaign (after approval the report is attached to the campaign).
- For a campaign-strategy request, call create_campaign (short descriptive title, one-sentence description) BEFORE writing your final message — tool calls are impossible after it — after approval your strategy report is saved onto that campaign so it lives in the Campaigns module. If a fitting campaign already exists (check read_campaigns), reference it instead and say the strategy report can be attached there.
- Deliverable-materialization from the strategy happens later via the campaign wizard or the Content Creator — say so.`,
    });
  },
  promptVersion: "strategist-prompt@1",
  toolNamespace: "agent:strategist",
  useCases: [
    {
      id: "campaign-strategy",
      label: "Develop a campaign strategy",
      promptTemplate:
        "Develop a campaign strategy direction for: {{input}}. Run foundation and insights, pick the strongest insight, and deliver a decision-ready strategy-direction report with recommended next steps.",
    },
    {
      id: "strategy-foundation",
      label: "Quick strategy foundation",
      promptTemplate:
        "Build a strategy foundation (audience, positioning, direction) for: {{input}}. Foundation only — no concepts.",
    },
  ],
  featureKey: "agent-strategist",
  outputContract: artifactOutputContract,
  // Volledige keten = 4 zware stappen van 1-3 min + model-turns.
  timeoutMs: 720_000,
  maxToolCalls: 8,
  // Het strategie-rapport is groot — default 4096 kapt de artifacts-JSON af;
  // 16k bleek te krap voor een zware turn (~57k chars, dogfood 2026-07-07).
  // Sinds de streaming-refactor (agents-scheduling slice 5) geldt het oude
  // non-streaming SDK-plafond van 21.333 niet meer; 32k geeft ruime marge
  // binnen de wallclock-guard (timeoutMs blijft de echte begrenzing).
  maxTokens: 32_000,
};

export function registerStrategistTools(): void {
  registerAgentTool("agent:strategist", buildStrategyFoundationTool);
  registerAgentTool("agent:strategist", mineInsightsTool);
  registerAgentTool("agent:strategist", generateCreativeConceptsTool);
  registerAgentTool("agent:strategist", buildConceptStrategyTool);
  registerClawToolsForAgent("agent:strategist", [
    "read_campaigns",
    "read_personas",
    "read_products",
    "read_strategies",
    "create_campaign",
  ]);
}
