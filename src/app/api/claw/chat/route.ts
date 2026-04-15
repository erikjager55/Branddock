import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { assembleSystemPrompt } from '@/lib/claw/context-assembler';
import { getToolsForClaude, getToolByName } from '@/lib/claw/tools/registry';
import type {
  ClawChatRequest,
  ClawMessage,
  ContextSelection,
  ClawAttachment,
  ClawToolCall,
  ClawToolResult,
  MutationProposal,
} from '@/lib/claw/claw.types';

// ─── Singleton Anthropic Client ────────────────────────────

const globalForClaw = globalThis as unknown as { clawAnthropicClient: Anthropic | undefined };

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForClaw.clawAnthropicClient) {
    globalForClaw.clawAnthropicClient = new Anthropic({ apiKey });
  }
  return globalForClaw.clawAnthropicClient;
}

// ─── Request Validation ────────────────────────────────────

const requestSchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1).max(10000),
  contextSelection: z.object({
    modules: z.array(z.string()),
    entityIds: z.record(z.string(), z.array(z.string())).optional().nullable(),
  }),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'file', 'url']),
    label: z.string(),
    content: z.string(),
    fileMeta: z.object({
      name: z.string(),
      size: z.number(),
      mimeType: z.string(),
    }).optional(),
    sourceUrl: z.string().optional(),
  })).optional(),
});

// ─── POST /api/claw/chat ───────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error('Claw chat validation error:', JSON.stringify(parsed.error.issues, null, 2));
    return Response.json({ error: parsed.error.message, issues: parsed.error.issues }, { status: 400 });
  }

  const { message, contextSelection, attachments } = parsed.data as ClawChatRequest;
  const conversationId = parsed.data.conversationId ?? undefined;
  const userId = session.user.id;

  // ── Setup (wrapped in try-catch for 500 diagnostics) ───
  let conversation: Awaited<ReturnType<typeof prisma.clawConversation.findFirst>>;
  let existingMessages: ClawMessage[];
  let systemPrompt: string;
  let claudeMessages: Anthropic.Messages.MessageParam[];
  let tools: ReturnType<typeof getToolsForClaude>;

  try {
    // Load or create conversation
    conversation = conversationId
      ? await prisma.clawConversation.findFirst({
          where: { id: conversationId, workspaceId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.clawConversation.create({
        data: {
          workspaceId,
          userId,
          contextSelection: contextSelection as unknown as Prisma.InputJsonValue,
          messages: JSON.parse('[]'),
        },
      });
    }

    // Append user message
    existingMessages = (conversation!.messages as unknown as ClawMessage[]) || [];
    const userMessage: ClawMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      attachments: attachments as ClawAttachment[] | undefined,
      createdAt: new Date().toISOString(),
    };
    existingMessages.push(userMessage);

    // Build system prompt
    const assembled = await assembleSystemPrompt(
      workspaceId,
      contextSelection as ContextSelection,
      attachments as ClawAttachment[] | undefined
    );
    systemPrompt = assembled.systemPrompt;

    // Build Claude messages from conversation history
    claudeMessages = buildClaudeMessages(existingMessages);

    // Get tools
    tools = getToolsForClaude();
  } catch (err) {
    console.error('Brand Assistant setup error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }

  // ── Stream response ────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        try {
          controller.enqueue(
            new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      // Send conversation metadata
      sendEvent('conversation_meta', {
        conversationId: conversation.id,
        title: conversation.title,
      });

      try {
        const client = getClient();
        let continueLoop = true;
        let currentMessages = claudeMessages;
        const assistantToolCalls: ClawToolCall[] = [];
        const assistantToolResults: ClawToolResult[] = [];
        let fullAssistantText = '';

        // ── Agentic loop: Claude may call tools multiple times ──
        while (continueLoop) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: tools as Anthropic.Messages.Tool[],
          });

          continueLoop = false;

          for (const block of response.content) {
            if (block.type === 'text') {
              fullAssistantText += block.text;
              sendEvent('text_delta', { text: block.text });
            }

            if (block.type === 'tool_use') {
              const toolDef = getToolByName(block.name);
              if (!toolDef) {
                sendEvent('error', { message: `Unknown tool: ${block.name}` });
                continue;
              }

              const toolCall: ClawToolCall = {
                id: block.id,
                toolName: block.name,
                input: block.input as Record<string, unknown>,
              };
              assistantToolCalls.push(toolCall);

              // ── Write tools: propose mutation, don't execute ──
              if (toolDef.requiresConfirmation) {
                let proposal: MutationProposal;
                if (toolDef.buildProposal) {
                  proposal = await toolDef.buildProposal(
                    block.input as Record<string, unknown>,
                    { workspaceId, userId }
                  );
                } else {
                  proposal = {
                    toolCallId: block.id,
                    toolName: block.name,
                    params: block.input as Record<string, unknown>,
                    description: `${block.name} wants to modify data`,
                    entityType: 'unknown',
                  };
                }
                proposal.toolCallId = block.id;

                sendEvent('mutation_proposal', proposal);

                // Add a synthetic tool result telling Claude to wait
                const waitResult: ClawToolResult = {
                  toolCallId: block.id,
                  toolName: block.name,
                  result: 'Waiting for user confirmation. The change has been proposed to the user.',
                };
                assistantToolResults.push(waitResult);

                // Append to messages for the conversation record
                currentMessages = [
                  ...currentMessages,
                  {
                    role: 'assistant' as const,
                    content: response.content as Anthropic.Messages.ContentBlock[],
                  },
                  {
                    role: 'user' as const,
                    content: [{
                      type: 'tool_result' as const,
                      tool_use_id: block.id,
                      content: 'Waiting for user confirmation.',
                    }],
                  },
                ];

                // Don't continue the loop — wait for user to confirm via /api/claw/confirm
                continueLoop = false;
                break;
              }

              // ── Read/Analyze tools: execute immediately ──
              sendEvent('tool_use_start', { toolCallId: block.id, toolName: block.name });

              try {
                const result = await toolDef.execute(
                  block.input as Record<string, unknown>,
                  { workspaceId, userId }
                );

                const toolResult: ClawToolResult = {
                  toolCallId: block.id,
                  toolName: block.name,
                  result,
                };
                assistantToolResults.push(toolResult);

                sendEvent('tool_result', {
                  toolCallId: block.id,
                  toolName: block.name,
                  result,
                });

                // Continue loop — Claude needs to process the tool result
                currentMessages = [
                  ...currentMessages,
                  {
                    role: 'assistant' as const,
                    content: response.content as Anthropic.Messages.ContentBlock[],
                  },
                  {
                    role: 'user' as const,
                    content: [{
                      type: 'tool_result' as const,
                      tool_use_id: block.id,
                      content: JSON.stringify(result),
                    }],
                  },
                ];
                continueLoop = true;
              } catch (err) {
                sendEvent('tool_result', {
                  toolCallId: block.id,
                  toolName: block.name,
                  result: { error: String(err) },
                  isError: true,
                });
              }
            }
          }

          // If Claude stopped naturally (end_turn), break
          if (response.stop_reason === 'end_turn') {
            continueLoop = false;
          }
        }

        // ── Save assistant message to conversation ──────────
        const assistantMessage: ClawMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullAssistantText,
          toolCalls: assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
          toolResults: assistantToolResults.length > 0 ? assistantToolResults : undefined,
          createdAt: new Date().toISOString(),
        };
        existingMessages.push(assistantMessage);

        // Auto-generate title from first user message
        const title = conversation.title || generateTitle(message);

        await prisma.clawConversation.update({
          where: { id: conversation.id },
          data: {
            messages: JSON.parse(JSON.stringify(existingMessages)),
            title,
            contextSelection: contextSelection as unknown as Prisma.InputJsonValue,
          },
        });

        sendEvent('conversation_meta', { conversationId: conversation.id, title });
        sendEvent('done', {});
      } catch (err) {
        sendEvent('error', { message: String(err) });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────

function buildClaudeMessages(
  messages: ClawMessage[]
): Anthropic.Messages.MessageParam[] {
  const result: Anthropic.Messages.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      let content = msg.content;
      if (msg.attachments?.length) {
        const attachmentText = msg.attachments
          .map((a) => `\n\n--- Attachment: ${a.label} ---\n${a.content}`)
          .join('');
        content += attachmentText;
      }
      result.push({ role: 'user', content });
    } else if (msg.role === 'assistant') {
      result.push({ role: 'assistant', content: msg.content });
    }
  }

  return result;
}

function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}
