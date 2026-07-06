// =============================================================
// Agents registry — Claw→orchestrator tool-bridge (agents-motor-wiring).
//
// De twee tool-werelden zijn incompatibel: Claw-tools zijn
// `ClawToolDefinition` (Zod-inputSchema, `requiresConfirmation`,
// `ToolExecutionContext {workspaceId, userId}`), orchestrator-tools zijn
// `BrandclawTool` (JSON-schema, `BrandclawRunContext`). Deze bridge is
// een mapping-functie — géén tweede registry: de Claw-registry blijft
// source of truth voor tool-implementaties.
//
// Propose-only (ADR D6-verfijning): write-tools worden in agent-context
// NOOIT uitgevoerd. De bridge roept `buildProposal()` aan, registreert
// het proposal in de run-collector (→ PROPOSAL-artefact + run-status
// AWAITING_CONFIRMATION bij finalize) en meldt het model dat de actie
// als voorstel is vastgelegd. Uitvoering gebeurt post-run via
// /api/agents/runs/[runId]/confirm, die de Claw-execute hergebruikt.
// =============================================================

import { getToolByName, zodToJsonSchema } from "@/lib/claw/tools/registry";
import type { ClawToolDefinition } from "@/lib/claw/claw.types";
import { getToolRegistry } from "@/lib/brandclaw/orchestrator/tool-registry";
import type {
  AgentToolNamespace,
  AnthropicToolDefinition,
  BrandclawRunContext,
  BrandclawTool,
} from "@/lib/brandclaw/orchestrator/types";
import { recordProposal } from "./run-collector";

/** Cap op tool-output richting het model — grote payloads jagen de token-kosten op. */
const MAX_TOOL_RESULT_CHARS = 16_000;

function truncateForModel(content: unknown): unknown {
  let json: string;
  try {
    json = JSON.stringify(content);
  } catch {
    return { error: "Tool returned unserializable output" };
  }
  if (json.length <= MAX_TOOL_RESULT_CHARS) return content;
  return {
    truncated: true,
    note: `Tool output exceeded ${MAX_TOOL_RESULT_CHARS} chars and was truncated.`,
    preview: json.slice(0, MAX_TOOL_RESULT_CHARS),
  };
}

/**
 * Adapteert één Claw-tool naar een orchestrator-tool. Read/analyze-tools
 * draaien ongewijzigd; write-tools (`requiresConfirmation`) leveren
 * uitsluitend een proposal op.
 */
export function clawToolToAgentTool(clawTool: ClawToolDefinition): BrandclawTool {
  const definition: AnthropicToolDefinition = {
    name: clawTool.name,
    description: clawTool.requiresConfirmation
      ? `${clawTool.description} NOTE: in agent runs this action is NOT executed directly — it is recorded as a proposal that the user approves after the run. Call it at most once per intended change.`
      : clawTool.description,
    input_schema: zodToJsonSchema(
      clawTool.inputSchema,
    ) as AnthropicToolDefinition["input_schema"],
  };

  return {
    definition,
    async execute(input: Record<string, unknown>, ctx: BrandclawRunContext) {
      // ToolExecutionContext verwacht een userId; voor manual runs draagt
      // triggerSource het user-id (run-agent zet triggerSource: userId).
      const toolCtx = {
        workspaceId: ctx.workspaceId,
        userId: ctx.triggerSource ?? "agent",
      };

      if (clawTool.requiresConfirmation) {
        if (!clawTool.buildProposal) {
          return {
            content: {
              error: `Tool '${clawTool.name}' requires confirmation but has no proposal builder — action skipped.`,
            },
            isError: true,
            errorCode: "NO_PROPOSAL_BUILDER",
          };
        }
        const proposal = await clawTool.buildProposal(input, toolCtx);
        recordProposal(ctx.runId, { ...proposal, params: input });
        return {
          content: {
            status: "proposed_awaiting_user_approval",
            description: proposal.description,
            entityType: proposal.entityType,
            note: "This action was NOT executed. It is recorded as a proposal the user will approve or reject after this run. Do not retry it; continue with your remaining work and mention the pending proposal in your final output.",
          },
        };
      }

      const result = await clawTool.execute(input, toolCtx);
      return { content: truncateForModel(result) };
    },
  };
}

/**
 * Registreert een set Claw-tools (op naam) onder de tool-namespace van een
 * agent. Onbekende namen throwen bij bootstrap — een typo mag niet stil
 * een tool laten wegvallen.
 */
export function registerClawToolsForAgent(
  namespace: AgentToolNamespace,
  toolNames: string[],
): void {
  const registry = getToolRegistry();
  for (const name of toolNames) {
    const clawTool = getToolByName(name);
    if (!clawTool) {
      throw new Error(`[agents tool-bridge] Unknown Claw tool '${name}' for ${namespace}`);
    }
    registry.register(namespace, clawToolToAgentTool(clawTool));
  }
}

/** Registreert een kant-en-klare orchestrator-tool (pipeline-tools). */
export function registerAgentTool(namespace: AgentToolNamespace, tool: BrandclawTool): void {
  getToolRegistry().register(namespace, tool);
}
