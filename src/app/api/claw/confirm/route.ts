import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { getToolByName } from '@/lib/claw/tools/registry';
import type { ClawMessage, ClawToolResult } from '@/lib/claw/claw.types';

const confirmSchema = z.object({
  conversationId: z.string(),
  toolCallId: z.string(),
  approved: z.boolean(),
  editedParams: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/claw/confirm — approve or reject a pending mutation */
export async function POST(req: NextRequest) {
  // M3: executing a mutation via the agent is member+ — viewers are read-only.
  // requireWorkspaceRole levert de (cookie-gebonden) workspaceId + rol in één
  // call; de losse resolveWorkspaceId() is daarmee redundant (review-MINOR
  // #348: 2-3 minder DB/session-roundtrips per request).
  const role = await requireWorkspaceRole(['owner', 'admin', 'member']);
  if (role instanceof NextResponse) return role;
  const workspaceId = role.workspaceId;

  // userId komt uit de sessie (requireWorkspaceRole valideert al dat er een
  // sessie is, maar geeft de user-id niet terug).
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { conversationId, toolCallId, approved, editedParams } = parsed.data;
  const userId = session.user.id;

  const conversation = await prisma.clawConversation.findFirst({
    where: { id: conversationId, workspaceId, userId },
  });

  if (!conversation) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const messages = (conversation.messages as unknown as ClawMessage[]) || [];

  // Find the assistant message with this tool call
  const assistantMsg = messages.find(
    (m) => m.role === 'assistant' && m.toolCalls?.some((tc) => tc.id === toolCallId)
  );

  if (!assistantMsg) {
    return Response.json({ error: 'Tool call not found' }, { status: 404 });
  }

  const toolCall = assistantMsg.toolCalls?.find((tc) => tc.id === toolCallId);
  if (!toolCall) {
    return Response.json({ error: 'Tool call not found' }, { status: 404 });
  }

  const toolDef = getToolByName(toolCall.toolName);
  if (!toolDef) {
    return Response.json({ error: `Unknown tool: ${toolCall.toolName}` }, { status: 400 });
  }

  let result: ClawToolResult;

  if (approved) {
    // Merge edited params if user modified the proposal
    const finalParams = editedParams
      ? { ...toolCall.input, ...editedParams }
      : toolCall.input;

    try {
      const execResult = await toolDef.execute(finalParams, { workspaceId, userId });
      result = {
        toolCallId,
        toolName: toolCall.toolName,
        result: execResult,
      };
    } catch (err) {
      result = {
        toolCallId,
        toolName: toolCall.toolName,
        result: { error: String(err) },
        isError: true,
      };
    }
  } else {
    result = {
      toolCallId,
      toolName: toolCall.toolName,
      result: { skipped: true, message: 'User declined the change' },
    };
  }

  // Append the tool result to the conversation. Reflecteer het echte resultaat
  // in de leesbare content: een execute die `success: false` teruggeeft (bv. geen
  // geldige velden om te wijzigen) mag niet als "applied successfully" loggen.
  const innerResult = result.result as { success?: boolean } | undefined;
  const applied = approved && !result.isError && innerResult?.success !== false;
  const resultContent = approved
    ? applied
      ? 'Change applied successfully.'
      : 'Change could not be applied.'
    : 'Change was declined by user.';
  const toolResultMessage: ClawMessage = {
    id: crypto.randomUUID(),
    role: 'tool_result',
    content: resultContent,
    toolResults: [result],
    createdAt: new Date().toISOString(),
  };
  messages.push(toolResultMessage);

  await prisma.clawConversation.update({
    where: { id: conversationId },
    data: { messages: JSON.parse(JSON.stringify(messages)) },
  });

  // Hint the client which TanStack Query keys to invalidate so the active
  // detail page reflects the mutation without a manual refresh. For create
  // tools we read the new ID from the execute result instead of the input.
  const affected = approved
    ? resolveAffectedEntity(
        toolCall.toolName,
        toolCall.input,
        result.result as Record<string, unknown> | undefined,
      )
    : null;

  return Response.json({ success: true, result, affected });
}

type AffectedEntity = {
  entityType:
    | 'brand_asset'
    | 'persona'
    | 'product'
    | 'competitor'
    | 'strategy'
    | 'trend'
    | 'alignment'
    | 'interview'
    | 'deliverable'
    | 'campaign';
  entityId: string | null;
  entityName: string | null;
  /** Campaign ID for deliverable rows — required to open the Canvas. */
  campaignId?: string | null;
  /** True when this is a freshly created entity (enables "View →" toast). */
  isNew: boolean;
};

/** Map a write-tool name + input + execute result to the affected entity. */
function resolveAffectedEntity(
  toolName: string,
  input: Record<string, unknown>,
  result: Record<string, unknown> | undefined,
): AffectedEntity | null {
  const inputId = (key: string) => {
    const v = input[key];
    return typeof v === 'string' ? v : null;
  };
  const resultStr = (key: string) => {
    const v = result?.[key];
    return typeof v === 'string' ? v : null;
  };

  switch (toolName) {
    case 'update_asset_content':
    case 'update_asset_framework':
      return { entityType: 'brand_asset', entityId: inputId('assetId'), entityName: null, isNew: false };
    case 'update_persona':
      return { entityType: 'persona', entityId: inputId('personaId'), entityName: null, isNew: false };
    case 'create_persona':
      return {
        entityType: 'persona',
        entityId: resultStr('personaId'),
        entityName: resultStr('personaName') ?? (typeof input.name === 'string' ? input.name : null),
        isNew: true,
      };
    case 'update_product':
      return { entityType: 'product', entityId: inputId('productId'), entityName: null, isNew: false };
    case 'create_product':
      return {
        entityType: 'product',
        entityId: resultStr('productId'),
        entityName: resultStr('productName') ?? (typeof input.name === 'string' ? input.name : null),
        isNew: true,
      };
    case 'update_competitor':
      return { entityType: 'competitor', entityId: inputId('competitorId'), entityName: null, isNew: false };
    case 'create_competitor':
      return {
        entityType: 'competitor',
        entityId: resultStr('competitorId'),
        entityName: resultStr('competitorName') ?? (typeof input.name === 'string' ? input.name : null),
        isNew: true,
      };
    case 'link_persona_to_product':
      // Both sides are affected — persona list (shows linked products) and product list (shows linked personas).
      return {
        entityType: 'product',
        entityId: resultStr('productId'),
        entityName: null,
        isNew: false,
      };
    case 'update_interview':
      return {
        entityType: 'interview',
        entityId: inputId('interviewId'),
        entityName: null,
        isNew: false,
      };
    case 'update_strategy_context':
      return { entityType: 'strategy', entityId: inputId('strategyId'), entityName: null, isNew: false };
    case 'start_alignment_scan':
      return { entityType: 'alignment', entityId: null, entityName: null, isNew: false };
    case 'start_trend_scan':
      return { entityType: 'trend', entityId: null, entityName: null, isNew: false };
    case 'create_trend':
      return {
        entityType: 'trend',
        entityId: resultStr('trendId'),
        entityName: resultStr('trendTitle') ?? (typeof input.title === 'string' ? input.title : null),
        isNew: true,
      };
    case 'create_deliverable':
      // Deliverable navigation needs both IDs — Canvas is keyed on
      // (campaignId, deliverableId) in useCampaignStore.
      return {
        entityType: 'deliverable',
        entityId: resultStr('deliverableId'),
        entityName: resultStr('deliverableTitle') ?? (typeof input.title === 'string' ? input.title : null),
        campaignId: resultStr('campaignId') ?? (typeof input.campaignId === 'string' ? input.campaignId : null),
        isNew: true,
      };
    case 'update_deliverable_brief':
    case 'update_deliverable_content_inputs':
    case 'update_deliverable_visual_brief':
    case 'update_landing_page_content':
      return {
        entityType: 'deliverable',
        entityId: inputId('deliverableId'),
        entityName: null,
        isNew: false,
      };
    case 'create_campaign':
      return {
        entityType: 'campaign',
        entityId: resultStr('campaignId'),
        entityName: resultStr('campaignTitle') ?? (typeof input.title === 'string' ? input.title : null),
        isNew: true,
      };
    case 'lock_entity': {
      const entityType = typeof input.entityType === 'string' ? input.entityType : '';
      const map: Record<string, AffectedEntity['entityType']> = {
        brand_asset: 'brand_asset',
        persona: 'persona',
        product: 'product',
        competitor: 'competitor',
      };
      if (entityType in map) {
        return { entityType: map[entityType], entityId: inputId('entityId'), entityName: null, isNew: false };
      }
      return null;
    }
    default:
      return null;
  }
}
