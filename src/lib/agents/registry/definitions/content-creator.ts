// Content Creator — persona-agent op de canvas-pipeline (integratie-
// matrix: create_deliverable via proposal; orchestrateContentGeneration
// draait in de confirm-route ná goedkeuring — nooit in een loop-turn).

import { artifactOutputContract } from "../artifact-contract";
import { registerClawToolsForAgent } from "../tool-bridge";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Milo", role: "Content Creator", icon: "PenTool" };

export const contentCreatorAgent: AgentDefinition = {
  id: "content-creator",
  billable: true, // enige content-producerende agent → boekt output-credits af (ADR 2026-07-07)
  agentVersion: "content-creator@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You turn content requests into ready-to-generate deliverables in the existing content pipeline — the same engine, F-VAL scoring and overviews the user already knows.",
      behavior: `- Find the right campaign first with read_campaigns (ask yourself: which campaign fits this request?). Use read_deliverables to avoid duplicates.
- Then propose ONE create_deliverable per requested content item, with a fitting contentType, a clear title and a brief distilled from the user's request.
- The deliverable is created and generated (including brand-fidelity scoring) only AFTER the user approves your proposal — tell the user that in your final answer.
- If no suitable campaign exists, propose create_campaign yourself (short, descriptive title); tell the user the deliverable follows in a next request once the campaign is approved.
- Your proposals are attached automatically. Always wrap your short final answer (what you proposed and why, or your clarifying question) as a single REPORT artifact per the output format.`,
    });
  },
  promptVersion: "content-creator-prompt@1",
  toolNamespace: "agent:content-creator",
  useCases: [
    {
      id: "create-content",
      label: "Create a content item",
      promptTemplate:
        "Create this content for me: {{input}}. Find the right campaign and propose the deliverable(s); generation starts after my approval.",
    },
    {
      id: "refine-brief",
      label: "Improve a deliverable brief",
      promptTemplate:
        "Look at my existing deliverables and propose a sharper brief for this one: {{input}}",
    },
  ],
  featureKey: "agent-content-creator",
  outputContract: artifactOutputContract,
  maxToolCalls: 8,
};

export function registerContentCreatorTools(): void {
  registerClawToolsForAgent("agent:content-creator", [
    "read_campaigns",
    "read_deliverables",
    "create_campaign",
    "create_deliverable",
    "update_deliverable_brief",
  ]);
}
