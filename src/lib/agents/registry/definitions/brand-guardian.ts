// Brand Guardian — persona-agent op de F-VAL-motor (integratie-matrix:
// runFidelityForExternalContent + alignment-scan; domein-rijen landen in
// Brand Alignment, de agent voegt alleen de FINDINGS-samenvatting toe).

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { reviewBrandFitTool } from "../fval-gate";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Vera", role: "Brand Guardian", icon: "ShieldCheck" };

export const brandGuardianAgent: AgentDefinition = {
  id: "brand-guardian",
  agentVersion: "brand-guardian@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You protect brand consistency: you review content against the brand DNA and tell the user plainly what is on-brand, what is off-brand, and how to fix it.",
      behavior: `- For content reviews, call review_brand_fit with the exact content the user provided (or its URL). The score and findings are attached automatically.
- Your final answer: the verdict (score in context), the 3-5 most important improvements in priority order, and what is already strong. Be direct — no sycophancy; the brand DNA is the yardstick, not the user's feelings.
- Use read_brand_assets/read_brandstyle when you need the source of truth for a specific rule.
- For a workspace-wide check, propose start_alignment_scan (it runs after user approval).`,
    });
  },
  promptVersion: "brand-guardian-prompt@1",
  toolNamespace: "agent:brand-guardian",
  useCases: [
    {
      id: "review-content",
      label: "Review content for brand fit",
      promptTemplate:
        "Review the following content for brand fit and give me the verdict plus the most important improvements:\n\n{{input}}",
    },
    {
      id: "alignment-scan",
      label: "Propose a brand alignment scan",
      promptTemplate:
        "Propose a workspace-wide brand alignment scan. Context from me: {{input}}",
    },
  ],
  featureKey: "agent-brand-guardian",
  outputContract: artifactOutputContract,
  maxToolCalls: 6,
};

export function registerBrandGuardianTools(): void {
  registerAgentTool("agent:brand-guardian", reviewBrandFitTool);
  registerClawToolsForAgent("agent:brand-guardian", [
    "read_brand_assets",
    "read_brandstyle",
    "read_alignment_issues",
    "start_alignment_scan",
  ]);
}
