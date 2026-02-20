// =============================================================
// POST /api/ai/completion
//
// Generic completion endpoint supporting both streaming and
// non-streaming responses, with optional brand context injection.
//
// Request body:
//   {
//     messages: ChatCompletionMessageParam[],
//     useCase?: AiUseCase,       // default: 'CHAT'
//     stream?: boolean,          // default: false
//     includeBrandContext?: boolean, // default: true
//   }
//
// Response (stream=false):
//   { response: string, model: string, usage?: { ... } }
//
// Response (stream=true):
//   SSE stream: data: {"text":"..."}\n\n ... data: [DONE]\n\n
// =============================================================

import { NextResponse } from 'next/server';
import { withAi } from '@/lib/ai/middleware';
import { openaiClient } from '@/lib/ai/openai-client';
import { createStreamingResponse } from '@/lib/ai/streaming';
import { buildSystemMessage } from '@/lib/ai/prompt-templates';
import { aiConfig, type AiUseCase } from '@/lib/ai/config';
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from '@/lib/ai/error-handler';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ─── Request validation ────────────────────────────────────

interface CompletionRequest {
  messages: ChatCompletionMessageParam[];
  useCase?: AiUseCase;
  stream?: boolean;
  includeBrandContext?: boolean;
}

function isValidRequest(body: unknown): body is CompletionRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return false;
  return true;
}

const VALID_USE_CASES = new Set<string>(['ANALYSIS', 'CREATIVE', 'CHAT', 'STRUCTURED']);

// ─── Route handler ─────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: 'Invalid request. Required: messages (non-empty array).' },
      { status: 400 },
    );
  }

  const useCase: AiUseCase =
    body.useCase && VALID_USE_CASES.has(body.useCase) ? body.useCase : 'CHAT';
  const stream = body.stream ?? false;
  const includeBrandContext = body.includeBrandContext ?? true;

  // 2. Run AI middleware (auth + rate limit + brand context)
  const ctx = await withAi(request, {
    skipBrandContext: !includeBrandContext,
  });
  if (ctx instanceof Response) return ctx;

  // 3. Build messages with brand context
  const messages: ChatCompletionMessageParam[] = [];

  // Check if user already provided a system message
  const hasSystemMessage = body.messages.some((m) => m.role === 'system');
  if (!hasSystemMessage) {
    messages.push(buildSystemMessage(includeBrandContext ? ctx.brandContext : undefined));
  }

  messages.push(...body.messages);

  // 4. Execute completion
  try {
    if (stream) {
      // Streaming response
      const streamResult = await openaiClient.createStreamingCompletion(
        messages,
        { useCase },
      );
      return createStreamingResponse(streamResult);
    }

    // Non-streaming response
    const response = await openaiClient.createChatCompletion(
      messages,
      { useCase },
    );

    return NextResponse.json({
      response,
      model: aiConfig.model,
      rateLimit: {
        remaining: ctx.rateLimitResult.remaining,
        resetAt: ctx.rateLimitResult.resetAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[AI completion] Error:', err);
    const parsed = parseAIError(err);
    return NextResponse.json(
      { error: getReadableErrorMessage(parsed) },
      { status: getAIErrorStatus(parsed) },
    );
  }
}
