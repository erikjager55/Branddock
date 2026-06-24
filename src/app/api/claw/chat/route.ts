import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { buildAiErrorEvent } from '@/lib/ai/error-handler';
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
  pageContext: z.object({
    page: z.string(),
    entityType: z.enum(['brand_asset', 'persona', 'product', 'competitor', 'deliverable', 'campaign']).optional(),
    entityId: z.string().optional(),
    entityName: z.string().optional(),
    campaignId: z.string().optional(),
    contentType: z.string().optional(),
    // GEO Fase 3 — laat de context-assembler isPuckRenderable evalueren voor
    // long-form GEO. Zonder dit veld in het schema strlooft Zod de door de client
    // (InputBar) meegestuurde contentTypeInputs en valt de assembler-hint terug
    // op "niet bewerkbaar". record(unknown) want de inhoud is type-vrij.
    contentTypeInputs: z.record(z.string(), z.unknown()).nullish(),
    wizardSnapshot: z.object({
      name: z.string(),
      currentStep: z.string().optional(),
      fields: z.array(z.object({
        label: z.string(),
        key: z.string(),
        value: z.string().nullable(),
        isEmpty: z.boolean(),
      })),
      notes: z.string().optional(),
    }).optional(),
    formFillFields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      currentValue: z.string().nullable(),
      isEmpty: z.boolean(),
    })).optional(),
  }).optional(),
});

// ─── POST /api/claw/chat ───────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const rateLimit = await withAiRateLimit(workspaceId);
  if (rateLimit instanceof Response) return rateLimit;

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error('Claw chat validation error:', JSON.stringify(parsed.error.issues, null, 2));
    return Response.json({ error: parsed.error.message, issues: parsed.error.issues }, { status: 400 });
  }

  const { message, contextSelection, attachments, pageContext } = parsed.data as ClawChatRequest;
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
      attachments as ClawAttachment[] | undefined,
      pageContext,
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

          // Collect tool_result blocks for ALL tool_use blocks in this response.
          // Anthropic requires every tool_use to have a matching tool_result in
          // the very next user message — so we append one combined user message
          // after the inner loop, not one per tool_use.
          const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
          let sawWriteTool = false;
          let sawAnyToolUse = false;

          for (const block of response.content) {
            if (block.type === 'text') {
              fullAssistantText += block.text;
              sendEvent('text_delta', { text: block.text });
            }

            if (block.type === 'tool_use') {
              sawAnyToolUse = true;
              const toolDef = getToolByName(block.name);
              if (!toolDef) {
                // Still emit a tool_result so the message stays valid.
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: `Unknown tool: ${block.name}`,
                  is_error: true,
                });
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

                // Synthetic tool_result so Claude sees a complete exchange.
                const waitResult: ClawToolResult = {
                  toolCallId: block.id,
                  toolName: block.name,
                  result: 'Waiting for user confirmation. The change has been proposed to the user.',
                };
                assistantToolResults.push(waitResult);
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: 'Waiting for user confirmation.',
                });

                // After this response we stop the outer loop — user has to
                // confirm via /api/claw/confirm before we talk to Claude again.
                sawWriteTool = true;
                continue;
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

                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              } catch (err) {
                const errorMsg = String(err);
                sendEvent('tool_result', {
                  toolCallId: block.id,
                  toolName: block.name,
                  result: { error: errorMsg },
                  isError: true,
                });
                // Must still emit a tool_result block so the message pair stays
                // valid — otherwise the next Anthropic call will 400.
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: errorMsg,
                  is_error: true,
                });
              }
            }
          }

          // If the model used tools, append ONE assistant + ONE user message
          // covering all tool_uses in this response.
          if (sawAnyToolUse) {
            currentMessages = [
              ...currentMessages,
              {
                role: 'assistant' as const,
                content: response.content as Anthropic.Messages.ContentBlock[],
              },
              {
                role: 'user' as const,
                content: toolResultBlocks,
              },
            ];
            // Only loop again when there were read-tool results to feed back
            // to Claude AND no write tool is pending confirmation.
            continueLoop = !sawWriteTool;
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

        // Initial title comes from the first user message. We'll upgrade to an
        // AI-written summary once the conversation has some substance.
        const initialTitle = generateTitle(message);
        const title = conversation.title || initialTitle;

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

        // ── Async: after 3 assistant turns, upgrade the auto-generated
        // title to a concise AI-written summary. Fire-and-forget — user
        // picks it up on next sidebar refresh. We skip if the user has
        // manually renamed (title differs from the auto-generated one).
        const assistantTurnCount = existingMessages.filter((m) => m.role === 'assistant').length;
        if (assistantTurnCount === 3 && title === initialTitle) {
          void upgradeConversationTitle(conversation.id, existingMessages).catch(() => {
            // Silently swallow — title upgrade is best-effort
          });
        }
      } catch (err) {
        sendEvent('error', buildAiErrorEvent(err));
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

/**
 * Call Claude Haiku to summarize a conversation into a short title.
 * Runs async after the SSE response completes — users see the improved
 * title on next sidebar fetch. Best-effort: errors are swallowed.
 */
async function upgradeConversationTitle(
  conversationId: string,
  messages: ClawMessage[],
): Promise<void> {
  // Use the first few messages — no need to feed the whole conversation.
  const transcript = messages
    .slice(0, 6)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.content || '').slice(0, 400)}`)
    .join('\n\n');

  if (!transcript.trim()) return;

  const client = getClient();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [
      {
        role: 'user',
        content:
          'Summarize the topic of this chat as a short title (3-7 words, no quotes, no trailing punctuation). ' +
          'Respond with ONLY the title.\n\n' + transcript,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return;
  const rawTitle = textBlock.text.trim().replace(/^["']|["']$/g, '').replace(/\.+$/, '');
  if (!rawTitle) return;
  const newTitle = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '...' : rawTitle;

  await prisma.clawConversation.update({
    where: { id: conversationId },
    data: { title: newTitle },
  });
}
