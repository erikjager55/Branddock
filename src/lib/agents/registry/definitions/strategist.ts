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
  buildSystemPrompt({ workspaceId }) {
    return buildAgentSystemPrompt({
      workspaceId,
      persona,
      mission:
        "You build evidence-based campaign strategies on top of this brand's DNA, personas and market context.",
      behavior: `- Default flow: build_strategy_foundation → mine_insights → pick the strongest insight yourself (explain why) → deliver a strategy-DIRECTION report. This fits the run budget; every step is slow (minutes) — never repeat a step.
- generate_creative_concepts and build_concept_driven_strategy exist for explicit follow-up asks, but the full elaboration usually exceeds one run — recommend the campaign wizard for that, and say so.
- Use read_personas/read_products when you need to reference them precisely.
- Deliver ONE REPORT artifact titled after the campaign, containing: foundation summary, the chosen insight + rationale, and your recommended creative direction + next steps. Keep it decision-ready, not exhaustive.
- Only when the user explicitly wants the campaign created in Branddock: propose create_campaign (it executes after user approval). Deliverable-materialization from the blueprint happens later via the campaign wizard — say so.`,
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
  // Het strategie-rapport is groot — default 4096 kapt de artifacts-JSON af.
  maxTokens: 16_000,
};

export function registerStrategistTools(): void {
  registerAgentTool("agent:strategist", buildStrategyFoundationTool);
  registerAgentTool("agent:strategist", mineInsightsTool);
  registerAgentTool("agent:strategist", generateCreativeConceptsTool);
  registerAgentTool("agent:strategist", buildConceptStrategyTool);
  registerClawToolsForAgent("agent:strategist", [
    "read_personas",
    "read_products",
    "read_strategies",
    "create_campaign",
  ]);
}
