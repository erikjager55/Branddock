import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
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
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

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

  // Append the tool result to the conversation
  const toolResultMessage: ClawMessage = {
    id: crypto.randomUUID(),
    role: 'tool_result',
    content: approved ? 'Change applied successfully.' : 'Change was declined by user.',
    toolResults: [result],
    createdAt: new Date().toISOString(),
  };
  messages.push(toolResultMessage);

  await prisma.clawConversation.update({
    where: { id: conversationId },
    data: { messages: JSON.parse(JSON.stringify(messages)) },
  });

  return Response.json({ success: true, result });
}
