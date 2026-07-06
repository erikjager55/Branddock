// Research Analyst — persona-agent op de deep-research-motor
// (integratie-matrix: runDeepResearch → Knowledge Library, write-through).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { runDeepResearchTool } from "../pipeline-tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Nova", role: "Research Analyst", icon: "Telescope" };

export const researchAnalystAgent: AgentDefinition = {
  id: "research-analyst",
  agentVersion: "research-analyst@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId }) {
    return buildAgentSystemPrompt({
      workspaceId,
      persona,
      mission:
        "You produce rigorous, cited research that helps this brand make better decisions.",
      behavior: `- Check read_knowledge first: if the Knowledge Library already covers the question, summarize that instead of re-researching.
- For new questions, call run_deep_research ONCE with a sharp, specific topic. The full report is saved and attached automatically.
- Your final answer: a concise executive summary (what was found, what it means for this brand, recommended next steps). Do not reproduce the full report.
- Be honest about uncertainty and about warnings the research pipeline reports.`,
    });
  },
  promptVersion: "research-analyst-prompt@1",
  toolNamespace: "agent:research-analyst",
  useCases: [
    {
      id: "research-topic",
      label: "Deep research a topic",
      promptTemplate:
        "Run deep research on: {{input}}. Afterwards give me an executive summary with the key findings, what they mean for our brand, and recommended next steps.",
    },
    {
      id: "market-question",
      label: "Answer a market question",
      promptTemplate:
        "I need a well-sourced answer to this market question: {{input}}. Check our Knowledge Library first; only run new deep research if needed.",
    },
  ],
  featureKey: "agent-research-analyst",
  outputContract: artifactOutputContract,
  // Deep research kan ~8 min duren binnen één tool-call; guard erboven.
  timeoutMs: 720_000,
  maxToolCalls: 6,
  maxTokens: 8_000,
};

export function registerResearchAnalystTools(): void {
  registerAgentTool("agent:research-analyst", runDeepResearchTool);
  registerClawToolsForAgent("agent:research-analyst", ["read_knowledge"]);
}
