// Content Creator — persona-agent op de canvas-pipeline (integratie-
// matrix: create_deliverable via proposal; orchestrateContentGeneration
// draait in de confirm-route ná goedkeuring — nooit in een loop-turn).

import { reportScoringOutputContract } from "../fval-report-contract";
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
- When the user asks to REPURPOSE existing content (turn a blog/case study into social posts): first locate the source deliverable (read_campaigns → read_deliverables), then read_deliverable_content to get its actual text. If hasContent is false, propose nothing — explain that the source has no generated content yet. Otherwise propose one create_deliverable per requested derivative IN THE SOURCE'S CAMPAIGN, each with sourceDeliverableId set to the source, a title that reflects the source topic, and a brief genuinely distilled from the source content (its core message, angle and CTA — never a generic brief). Allowed derivative types FOR REPURPOSING ONLY: linkedin-post, twitter-thread, linkedin-poll. If a repurpose request asks for other derivative types (newsletter, instagram, video…), decline those for the repurpose and offer the allowed types instead. This restriction applies ONLY to repurposing — normal create requests may use any content type from the catalog.
- Your proposals are attached automatically. Always wrap your short final answer (what you proposed and why, or your clarifying question) as a single REPORT artifact per the output format. For repurpose runs: mention that each approved derivative is generated separately after approval.`,
    });
  },
  promptVersion: "content-creator-prompt@2",
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
    {
      id: "repurpose-content",
      label: "Repurpose existing content",
      promptTemplate:
        "Repurpose this existing content into on-brand derivatives: {{input}}. Read the source deliverable's content first, then propose one derivative per requested type (allowed: linkedin-post, twitter-thread, linkedin-poll) in the source's campaign, each derived from the source. Generation starts after my approval.",
    },
  ],
  featureKey: "agent-content-creator",
  // Scoort de inline content-draft (REPORT) met F-VAL ná de run-finalize —
  // ADR D5: nooit een stille ongescoorde content-output (dogfood r1/r2).
  outputContract: reportScoringOutputContract,
  // 12 (was 8): een repurpose-run doet tot 3 reads + 3 proposals (toegestane
  // set is 3 typen) — de oude cap van 8 liet nul ruimte voor een model-retry
  // (task agent-repurposer, risico 3).
  maxToolCalls: 12,
};

export function registerContentCreatorTools(): void {
  registerClawToolsForAgent("agent:content-creator", [
    "read_campaigns",
    "read_deliverables",
    "read_deliverable_content",
    "create_campaign",
    "create_deliverable",
    "update_deliverable_brief",
  ]);
}
