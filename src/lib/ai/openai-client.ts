// =============================================================
// OpenAI Client Singleton (R0.8)
//
// Singleton pattern (like prisma.ts). Three completion methods:
//  - createChatCompletion     → full text response
//  - createStreamingCompletion → ReadableStream (SSE-formatted)
//  - createStructuredCompletion<T> → parsed JSON
//
// Retry with exponential backoff; per-use-case defaults.
// =============================================================

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { aiConfig, type AiUseCase } from './config';

// ─── Types ─────────────────────────────────────────────────

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCase?: AiUseCase;
}

export interface StreamingOptions extends CompletionOptions {
  onChunk?: (chunk: string) => void;
}

// Re-export for convenience
export type { ChatCompletionMessageParam };

// ─── Singleton ─────────────────────────────────────────────

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

function getClient(): OpenAI {
  if (!aiConfig.openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Add it to .env.local to enable AI features.',
    );
  }

  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = new OpenAI({ apiKey: aiConfig.openaiApiKey });
  }

  return globalForOpenAI.openai;
}

// ─── Retry helper ──────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = aiConfig.retry.maxRetries,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry auth or bad-request errors
      if (err instanceof OpenAI.APIError) {
        if (err.status === 401 || err.status === 403 || err.status === 400) {
          throw err;
        }
      }

      if (attempt < maxRetries) {
        const delay = Math.min(
          aiConfig.retry.initialDelayMs * Math.pow(2, attempt),
          aiConfig.retry.maxDelayMs,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// ─── Resolve options from use case defaults ────────────────

function resolveOptions(opts?: CompletionOptions) {
  const useCase = opts?.useCase ?? 'CHAT';
  return {
    model: opts?.model ?? aiConfig.model,
    temperature: opts?.temperature ?? aiConfig.temperature(useCase),
    max_tokens: opts?.maxTokens ?? aiConfig.maxTokens(useCase),
    timeout: aiConfig.timeout(useCase),
  };
}

// ─── Public API ────────────────────────────────────────────

export const openaiClient = {
  /**
   * Standard chat completion (non-streaming).
   * Returns the assistant's response text.
   */
  async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: CompletionOptions,
  ): Promise<string> {
    const { model, temperature, max_tokens, timeout } = resolveOptions(options);
    const client = getClient();

    const response = await withRetry(() =>
      client.chat.completions.create(
        { model, messages, temperature, max_tokens },
        { timeout },
      ),
    );

    return response.choices[0]?.message?.content ?? '';
  },

  /**
   * Streaming chat completion.
   * Returns a ReadableStream with SSE-formatted chunks.
   */
  async createStreamingCompletion(
    messages: ChatCompletionMessageParam[],
    options?: StreamingOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const { model, temperature, max_tokens, timeout } = resolveOptions(options);
    const client = getClient();

    const stream = await withRetry(() =>
      client.chat.completions.create(
        { model, messages, temperature, max_tokens, stream: true },
        { timeout },
      ),
    );

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              options?.onChunk?.(text);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  },

  /**
   * Structured output completion (JSON mode).
   * Parses the response into the expected type T.
   */
  async createStructuredCompletion<T>(
    messages: ChatCompletionMessageParam[],
    options?: CompletionOptions,
  ): Promise<T> {
    const { model, temperature, max_tokens, timeout } = resolveOptions(options);
    const client = getClient();
    const useCase = options?.useCase ?? 'STRUCTURED';

    const response = await withRetry(() =>
      client.chat.completions.create(
        {
          model,
          messages,
          temperature: options?.temperature ?? aiConfig.temperature(useCase),
          max_tokens,
          response_format: { type: 'json_object' },
        },
        { timeout },
      ),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI (structured completion)');
    }

    return JSON.parse(content) as T;
  },
};
