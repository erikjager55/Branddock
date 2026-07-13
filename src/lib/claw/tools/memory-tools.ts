// =============================================================
// Agent-only Claw-tools — remember_agent_memory (agents-scheduling,
// slice 4).
//
// Propose-only per het no-autonomy-regime: in agent-runs bouwt de
// tool-bridge er een proposal van; de daadwerkelijke `storeMemory`
// draait pas in de confirm-route ná user-goedkeuring ("alleen feiten
// die de user via confirm accepteerde"). De agentId komt uit de
// ToolExecutionContext (bridge/confirm-route, afgeleid van de run)
// — server-owned, nooit een tool-parameter: het model kan geen
// geheugen van een andere agent forgen.
//
// Bewust NIET in de Claw-chat-surface (getToolsForClaude): de chat
// heeft geen agent-context.
// =============================================================

import { z } from 'zod';
import { storeMemory, type MemoryType } from '@/lib/agents/memory';
import type { ClawToolDefinition } from '../claw.types';

const rememberInputSchema = z.object({
  content: z.string().min(3).max(2000),
  memoryType: z.enum(['PREFERENCE', 'FACT', 'DECISION', 'OUTCOME', 'OBSERVATION']),
});

export const rememberAgentMemoryTool: ClawToolDefinition = {
  name: 'remember_agent_memory',
  description:
    "Store a user-confirmed preference, fact, decision or outcome in this agent's long-term memory so future runs can use it. Only propose this for information the user explicitly confirmed or clearly stated — never for your own inferences.",
  inputSchema: rememberInputSchema,
  requiresConfirmation: true,
  category: 'write',
  buildProposal: async (params) => {
    const p = params as z.infer<typeof rememberInputSchema>;
    return {
      toolCallId: '',
      toolName: 'remember_agent_memory',
      params,
      description: `Remember (${p.memoryType.toLowerCase()}): "${p.content.slice(0, 120)}${p.content.length > 120 ? '…' : ''}"`,
      entityType: 'AgentMemory',
      changes: [
        {
          field: 'content',
          label: 'Memory',
          currentValue: null,
          proposedValue: p.content,
        },
      ],
    };
  },
  execute: async (params, ctx) => {
    if (!ctx.agentId) {
      throw new Error('remember_agent_memory requires an agent context');
    }
    const p = rememberInputSchema.parse(params);
    const memoryId = await storeMemory({
      workspaceId: ctx.workspaceId,
      agentId: ctx.agentId,
      content: p.content,
      memoryType: p.memoryType as MemoryType,
      source: 'agent-proposal',
    });
    return { stored: true, memoryId };
  },
};

/** Agent-only: wél opzoekbaar via getToolByName, níet in de chat-surface. */
export const agentOnlyTools: ClawToolDefinition[] = [rememberAgentMemoryTool];
