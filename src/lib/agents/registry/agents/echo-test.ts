// =============================================================
// Echo-test-agent — smoke-instrument voor de agents-foundation.
//
// Dubbel afgeschermd: `hidden: true` (nooit in listAgents/catalogus)
// én registratie gegate op non-production of AGENTS_ENABLE_TEST_AGENT=1
// (zie registry/index.ts + run-agent isTestAgentAllowed). Geen tools
// (namespace agent:echo-test heeft 0 registraties → single text-turn),
// production-model via het reguliere feature-slot.
// =============================================================

import { artifactOutputContract } from "../artifact-contract";
import type { AgentDefinition } from "../types";

const ECHO_SYSTEM_PROMPT = `You are an echo test agent used to verify the agent-run plumbing.

Respond with EXACTLY ONE fenced JSON block and nothing else, in this shape:

\`\`\`json
{
  "artifacts": [
    {
      "type": "REPORT",
      "title": "Echo report",
      "content": { "markdown": "## Echo report\\n\\nEchoing the user message:\\n\\n> <the user message, verbatim>" }
    }
  ]
}
\`\`\`

Replace <the user message, verbatim> with the exact user message you received. Do not add any other artifacts, text or commentary.`;

export const echoTestAgent: AgentDefinition = {
  id: "echo-test",
  agentVersion: "echo-test@0.1.0",
  persona: {
    name: "Echo",
    role: "Test Agent",
    icon: "FlaskConical",
  },
  buildSystemPrompt() {
    return ECHO_SYSTEM_PROMPT;
  },
  promptVersion: "echo-test-prompt@1",
  toolNamespace: "agent:echo-test",
  useCases: [
    {
      id: "echo",
      label: "Echo a message",
      promptTemplate: "Echo this message back in your report: {{input}}",
    },
  ],
  featureKey: "agent-research-analyst",
  outputContract: artifactOutputContract,
  hidden: true,
};
