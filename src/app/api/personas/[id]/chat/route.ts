import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { streamPersonaChat } from "@/lib/ai/persona-chat";
import {
  buildSystemPrompt,
  DEFAULT_SYSTEM_PROMPT_TEMPLATE,
} from "@/lib/ai/context/prompt-builder";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";

// ─── POST /api/personas/[id]/chat ────────────────────────────
// Two modes:
//   1. Session creation: body has `mode` (no `message`)  → returns sessionId + greeting
//   2. Streaming chat:   body has `message`               → returns SSE stream
// ──────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: personaId } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // ── Mode 1: Session creation (backward compat) ──
    if (!body.message) {
      const mode = body.mode || "FREE_CHAT";

      const chatSession = await prisma.personaChatSession.create({
        data: {
          mode: mode as "FREE_CHAT" | "GUIDED" | "EXPLORE" | "VALIDATE" | "IDEATE" | "CHALLENGE",
          personaId,
          workspaceId,
          createdById: session.user.id,
        },
      });

      // Create initial greeting message
      const taglineText = persona.tagline ? ` ${persona.tagline}.` : "";
      const greetingContent = `Hi, I'm ${persona.name}.${taglineText} Ask me anything about my perspective on brands and products.`;

      const greetingMessage = await prisma.personaChatMessage.create({
        data: {
          role: "ASSISTANT",
          content: greetingContent,
          sessionId: chatSession.id,
        },
      });

      return NextResponse.json({
        sessionId: chatSession.id,
        messages: [
          {
            id: greetingMessage.id,
            role: greetingMessage.role,
            content: greetingMessage.content,
            createdAt: greetingMessage.createdAt.toISOString(),
          },
        ],
      }, { status: 201 });
    }

    // ── Mode 2: Streaming chat ──
    const { message, sessionId } = body as {
      message: string;
      sessionId?: string;
    };

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message must be a non-empty string" },
        { status: 400 }
      );
    }

    // Get or create session
    let chatSessionId = sessionId;
    if (!chatSessionId) {
      const newSession = await prisma.personaChatSession.create({
        data: {
          mode: "FREE_CHAT",
          personaId,
          workspaceId,
          createdById: session.user.id,
        },
      });
      chatSessionId = newSession.id;
    } else {
      // Verify session exists and belongs to this persona
      const existingSession = await prisma.personaChatSession.findFirst({
        where: { id: chatSessionId, personaId },
      });
      if (!existingSession) {
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
      }
    }

    // Check message limit (max 50 per session)
    const messageCount = await prisma.personaChatMessage.count({
      where: { sessionId: chatSessionId },
    });
    if (messageCount >= 50) {
      return NextResponse.json(
        { error: "Maximum messages per session reached (50). Please start a new session." },
        { status: 400 }
      );
    }

    // Save user message
    const userMessage = await prisma.personaChatMessage.create({
      data: {
        role: "USER",
        content: message.trim(),
        sessionId: chatSessionId,
      },
    });

    // Load chat config (provider, model, prompt template)
    const chatConfig = await prisma.personaChatConfig.findUnique({
      where: { workspaceId },
    });

    const provider = chatConfig?.provider || "anthropic";
    const model = chatConfig?.model || "claude-sonnet-4-20250514";
    const temperature = chatConfig?.temperature ?? 0.8;
    const maxTokens = chatConfig?.maxTokens ?? 1000;
    const promptTemplate = chatConfig?.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT_TEMPLATE;

    // Load knowledge context for this session (sourceType + sourceId for dynamic fetcher)
    const contextItems = await prisma.personaChatContext.findMany({
      where: { sessionId: chatSessionId },
    });

    const selectedContext = contextItems.map((c) => ({
      sourceType: c.sourceType,
      sourceId: c.sourceId,
    }));

    // Build system prompt using dynamic context system
    // Persona fields are discovered dynamically — no hardcoded field names
    const systemPrompt = await buildSystemPrompt({
      template: promptTemplate,
      persona: persona as unknown as Record<string, unknown>,
      selectedContext: selectedContext.length > 0 ? selectedContext : undefined,
      workspaceId,
    });

    // Load chat history (last 40 messages to leave room for new exchanges)
    const historyMessages = await prisma.personaChatMessage.findMany({
      where: {
        sessionId: chatSessionId,
        role: { in: ["USER", "ASSISTANT"] },
        id: { not: userMessage.id }, // Exclude the message we just saved
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const history = historyMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

    // Stream the LLM response
    const stream = await streamPersonaChat({
      systemPrompt,
      history,
      message: message.trim(),
      provider,
      model,
      temperature,
      maxTokens,
    });

    // Wrap stream to save assistant message on completion
    const encoder = new TextEncoder();
    const reader = stream.getReader();

    const wrappedStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        // Forward all chunks to client
        controller.enqueue(value);

        // Check if this chunk contains the done event
        const text = new TextDecoder().decode(value);
        if (text.includes('"done":true') || text.includes('"done": true')) {
          // Parse the done payload to save the assistant message
          try {
            const lines = text.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const payload = JSON.parse(trimmed.slice(6));
                if (payload.done && payload.fullText) {
                  // Save assistant message with token tracking
                  const assistantMessage = await prisma.personaChatMessage.create({
                    data: {
                      role: "ASSISTANT",
                      content: payload.fullText,
                      sessionId: chatSessionId!,
                      promptTokens: payload.usage?.promptTokens || null,
                      completionTokens: payload.usage?.completionTokens || null,
                    },
                  });

                  // Send message metadata as a final SSE event
                  const metaEvent = `data: ${JSON.stringify({
                    meta: true,
                    messageId: assistantMessage.id,
                    userMessageId: userMessage.id,
                    sessionId: chatSessionId,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(metaEvent));

                  // Auto-generate title after 3 user messages
                  const userMsgCount = await prisma.personaChatMessage.count({
                    where: { sessionId: chatSessionId!, role: "USER" },
                  });
                  if (userMsgCount === 3) {
                    const existingTitle = await prisma.personaChatSession.findUnique({
                      where: { id: chatSessionId! },
                      select: { title: true },
                    });
                    if (!existingTitle?.title) {
                      // Use first user message as title
                      const firstMsg = await prisma.personaChatMessage.findFirst({
                        where: { sessionId: chatSessionId!, role: "USER" },
                        orderBy: { createdAt: "asc" },
                        select: { content: true },
                      });
                      if (firstMsg) {
                        const title = firstMsg.content.slice(0, 60) + (firstMsg.content.length > 60 ? "..." : "");
                        await prisma.personaChatSession.update({
                          where: { id: chatSessionId! },
                          data: { title },
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch {
            // Parsing error in save — non-critical, stream still works
          }
        }
      },
    });

    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/chat]", error);
    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}

// ─── GET /api/personas/[id]/chat ─────────────────────────────
// List all chat sessions for this persona
// ──────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: personaId } = await params;

    // Verify persona exists in workspace
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
      select: { id: true },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const sessions = await prisma.personaChatSession.findMany({
      where: { personaId, workspaceId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        mode: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true, insights: true },
        },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        mode: s.mode,
        title: s.title,
        messageCount: s._count.messages,
        insightCount: s._count.insights,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/personas/:id/chat]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
