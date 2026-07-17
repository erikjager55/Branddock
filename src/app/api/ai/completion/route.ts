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
import { z } from 'zod';
import { withAi } from '@/lib/ai/middleware';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { openaiClient } from '@/lib/ai/openai-client';
import { createStreamingResponse } from '@/lib/ai/streaming';
import { buildSystemMessage } from '@/lib/ai/prompt-templates';
import { aiConfig, type AiUseCase } from '@/lib/ai/config';
import { parseAIError, getReadableErrorMessage, getAIErrorStatus, isModelUnavailable } from '@/lib/ai/error-handler';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ─── Request validation ────────────────────────────────────

interface CompletionRequest {
  messages: ChatCompletionMessageParam[];
  useCase?: AiUseCase;
  stream?: boolean;
  includeBrandContext?: boolean;
}

// L8 Zod-sweep (audit 2026-06-26, batch 4): messages gingen zonder per-message
// shape-check door naar OpenAI (alleen een top-level array-guard). Content mag
// per OpenAI-contract een string óf parts-array zijn; onbekende use-cases
// blijven op 'CHAT' terugvallen (gedrag ongewijzigd, dus geen enum hier).
const completionRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.enum(['system', 'user', 'assistant', 'developer', 'tool', 'function']),
          content: z.union([z.string().max(200_000), z.array(z.unknown()).max(100)]).nullish(),
        })
        .passthrough(),
    )
    .min(1)
    .max(200),
  useCase: z.string().max(50).optional(),
  stream: z.boolean().optional(),
  includeBrandContext: z.boolean().optional(),
});

const VALID_USE_CASES = new Set<string>(['ANALYSIS', 'CREATIVE', 'CHAT', 'STRUCTURED']);

// ─── Route handler ─────────────────────────────────────────

// Serverless: streaming completion kan lang lopen; expliciete duur voorkomt
// truncatie op de korte platform-default. Fluid Compute-ceiling is 800s.
export const maxDuration = 300;

export async function POST(request: Request) {
  // 1. Parse body
  const parsed = await parseJsonBody(request, completionRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as unknown as CompletionRequest;

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
      {
        error: getReadableErrorMessage(parsed),
        errorType: parsed.type,
        unavailable: isModelUnavailable(parsed),
        retryable: parsed.retryable,
      },
      { status: getAIErrorStatus(parsed) },
    );
  }
}
