// =============================================================
// Persona Chat — LLM Streaming (Anthropic primary, OpenAI fallback)
//
// Core function: streamPersonaChat() returns a ReadableStream
// with SSE-formatted chunks for real-time chat UI.
//
// Provider selection comes from PersonaChatConfig in the database.
// Anthropic: system prompt as separate `system` parameter (NOT as message).
// OpenAI: system prompt as first message with role "system".
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { parseAIError, getReadableErrorMessage } from './error-handler';

// ─── Types ─────────────────────────────────────────────────

export interface PersonaChatParams {
  systemPrompt: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  message: string;
  provider: string;   // "anthropic" | "openai"
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface StreamDonePayload {
  done: true;
  fullText: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

// ─── Anthropic Client Singleton ────────────────────────────

const globalForAnthropic = globalThis as unknown as {
  anthropicClient: Anthropic | undefined;
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local.');
  }

  if (!globalForAnthropic.anthropicClient) {
    globalForAnthropic.anthropicClient = new Anthropic({ apiKey });
  }

  return globalForAnthropic.anthropicClient;
}

// ─── OpenAI Client Singleton ───────────────────────────────

const globalForOpenAI = globalThis as unknown as {
  openaiPersonaClient: OpenAI | undefined;
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local.');
  }

  if (!globalForOpenAI.openaiPersonaClient) {
    globalForOpenAI.openaiPersonaClient = new OpenAI({ apiKey });
  }

  return globalForOpenAI.openaiPersonaClient;
}

// ─── Anthropic Streaming ───────────────────────────────────

async function streamAnthropic(params: PersonaChatParams): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropicClient();
  const encoder = new TextEncoder();

  // Build messages array (user + assistant only, system is separate)
  const messages: Anthropic.MessageParam[] = [
    ...params.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: params.message },
  ];

  const stream = client.messages.stream({
    model: params.model,
    system: params.systemPrompt,  // Anthropic: system as separate parameter
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  });

  let fullText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await stream;

        response.on('text', (text) => {
          fullText += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`),
          );
        });

        response.on('message', (msg) => {
          promptTokens = msg.usage?.input_tokens ?? 0;
          completionTokens = msg.usage?.output_tokens ?? 0;
        });

        // Wait for the stream to finish
        await response.finalMessage();

        // Send done event with usage info
        const donePayload: StreamDonePayload = {
          done: true,
          fullText,
          usage: { promptTokens, completionTokens },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`),
        );
        controller.close();
      } catch (err) {
        const errorMsg = getReadableErrorMessage(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`),
        );
        controller.close();
      }
    },
  });
}

// ─── OpenAI Streaming ──────────────────────────────────────

async function streamOpenAI(params: PersonaChatParams): Promise<ReadableStream<Uint8Array>> {
  const client = getOpenAIClient();
  const encoder = new TextEncoder();

  // OpenAI: system prompt as first message
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: params.systemPrompt },
    ...params.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: params.message },
  ];

  const stream = await client.chat.completions.create({
    model: params.model,
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  });

  let fullText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            fullText += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`),
            );
          }

          // Capture usage from final chunk
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0;
            completionTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        const donePayload: StreamDonePayload = {
          done: true,
          fullText,
          usage: { promptTokens, completionTokens },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`),
        );
        controller.close();
      } catch (err) {
        const errorMsg = getReadableErrorMessage(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`),
        );
        controller.close();
      }
    },
  });
}

// ─── Public API ────────────────────────────────────────────

/**
 * Stream a persona chat response using the configured provider.
 * Anthropic is primary; if it fails and OpenAI is available, falls back.
 *
 * Returns a ReadableStream with SSE-formatted events:
 *   data: {"token": "Hi"}
 *   data: {"token": "! I'm"}
 *   data: {"done": true, "fullText": "...", "usage": {...}}
 */
export async function streamPersonaChat(
  params: PersonaChatParams,
): Promise<ReadableStream<Uint8Array>> {
  const provider = params.provider || 'anthropic';

  if (provider === 'anthropic') {
    try {
      return await streamAnthropic(params);
    } catch (err) {
      // Fallback to OpenAI if Anthropic fails and OpenAI key is available
      if (process.env.OPENAI_API_KEY) {
        console.warn(
          '[persona-chat] Anthropic failed, falling back to OpenAI:',
          err instanceof Error ? err.message : err,
        );
        return await streamOpenAI({
          ...params,
          provider: 'openai',
          model: 'gpt-4o',
        });
      }
      throw err;
    }
  }

  // OpenAI primary
  return await streamOpenAI(params);
}
