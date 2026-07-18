// Loop-pilot — Brandclaw BC-1: de wekelijkse content-loop met mens-goedkeuring
// (docs/reports/p36-brandclaw-herijking-2026-07-17.md, tasks/bc1-loop-pilot.md).
// Bo leest de eigen signalen van het merk (productie-tempo, F-VAL-trend,
// persona/product-dekking, campagne-stand) en zet de 2-3 waardevolste
// content-kansen voor komende week als propose-only create_deliverable-
// voorstellen in de inbox. Publiceren blijft handmatig; generatie + F-VAL
// draaien pas ná approve via het bestaande confirm-pad — geen nieuw
// autonomie-risico. Ads-signalen blijven bewust bij Ada (geen dubbel
// refresh-voorstel-circuit). 0-credit run (geen `billable`, zoals de andere
// analyse-agents); de content-charge valt in het bestaande confirm-pad.

import { artifactOutputContract } from "../artifact-contract";
import { registerAgentTool, registerClawToolsForAgent } from "../tool-bridge";
import { dataAnalystQueryTools } from "../data-analyst/query-tools";
import { buildAgentSystemPrompt } from "./shared";
import type { AgentDefinition, AgentPersona } from "../types";

const persona: AgentPersona = { name: "Bo", role: "Loop-pilot", icon: "Orbit" };

export const loopPilotAgent: AgentDefinition = {
  id: "loop-pilot",
  agentVersion: "loop-pilot@0.1.0",
  persona,
  buildSystemPrompt({ workspaceId, contextSelection }) {
    return buildAgentSystemPrompt({
      workspaceId,
      contextSelection,
      persona,
      mission:
        "You run this workspace's weekly content loop: you read the brand's own signals (production pace, brand-fidelity scores, persona/product coverage, campaign status), pick the 2-3 most valuable content opportunities for the coming week and turn each into a concrete on-brand deliverable proposal the user can approve. You close the loop from measurement back to next content — the user always has the final word.",
      behavior: `- Start with signals, not opinions: query_period_activity (windowDays: 7) for what was produced, query_fval_scores for the fidelity trend, query_content_coverage for persona/product gaps, and query_campaign_overview for where the campaigns stand. Query only what you need — typically 3-4 read calls. The full results attach as TABLE artifacts automatically.
- From those signals choose AT MOST 3 content opportunities for the coming week. Priority order: (1) a persona or product with no recent content, (2) a running campaign that is under-served, (3) a format or topic whose F-VAL scores show room for improvement. Fewer proposals when the signals are weak; zero proposals is a valid outcome — never invent work to fill the quota.
- Pilot scope: propose ONLY contentType "linkedin-post" or "blog-post". Other formats: mention them in the report as a suggestion, do not propose them.
- Propose each opportunity via create_deliverable, inside an existing suitable campaign (check read_campaigns first; prefer campaigns with origin branddock). The brief must name the signal that motivated it (with its measured value), the target persona or product, the concrete angle, and what to keep from the brand voice.
- You never publish and never modify existing content: your only writes are create_deliverable proposals, and those always await user approval. Generation and F-VAL scoring happen after approval through the standard flow — do not claim any content was created or scored during this run.
- Close with ONE REPORT artifact (markdown): the signals you saw with their numbers (every number sourced from a tool result in this run — never estimated), which opportunities you chose and why, and what you deliberately left for a later week. When data is thin (young workspace), say so plainly and keep proposals minimal.
- Write in the workspace's content language, professional and concrete, no hype and no false urgency.`,
    });
  },
  promptVersion: "loop-pilot-prompt@1",
  toolNamespace: "agent:loop-pilot",
  useCases: [
    {
      id: "weekly-loop",
      label: "Run the content loop now",
      promptTemplate:
        "Run this workspace's weekly content loop: read the signals, write the loop report and propose the most valuable content for the coming week. Extra focus or context from the user: {{input}}.",
    },
  ],
  featureKey: "agent-loop-pilot",
  outputContract: artifactOutputContract,
  // 3-4 signaal-queries + read_campaigns + max 3 proposals + afronding.
  maxToolCalls: 12,
  // Rapport-run (strategist-les): groter dan een chat-antwoord.
  maxTokens: 12_000,
};

export function registerLoopPilotTools(): void {
  // Zelfde tool-objecten als Dana/Remi, onder Bo's eigen namespace
  // (registry is namespace-keyed; geen kopie, wél eigen memory-scope).
  for (const tool of dataAnalystQueryTools) {
    registerAgentTool("agent:loop-pilot", tool);
  }
  registerClawToolsForAgent("agent:loop-pilot", [
    "read_campaigns",
    "create_deliverable",
  ]);
}
