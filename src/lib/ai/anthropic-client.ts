// =============================================================
// Anthropic Client Singleton
//
// Mirror van openai-client.ts — singleton + retry + use-case defaults.
// Anthropic API splitst system-prompt af van messages, anders dan OpenAI;
// dit wrapper accepteert OpenAI-stijl messages en extraheert het system-block.
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { aiConfig, type AiUseCase } from './config';

export interface AnthropicCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCase?: AiUseCase;
  /** Override the per-useCase default request timeout (ms) */
  timeoutMs?: number;
  /**
   * Optional caller abort signal. When it fires the in-flight HTTP request is
   * cancelled immediately (the SDK throws `APIUserAbortError`), so a long
   * generation stops — and its token cost stops — the moment the caller aborts
   * (e.g. a client disconnect or a deep-research deadline).
   */
  abortSignal?: AbortSignal;
}

export interface AnthropicCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

/**
 * Whether the `temperature` parameter must be omitted for the given Claude
 * model. Anthropic deprecated `temperature` on newer model generations
 * (2026-05-24 gotcha: API returns 400 `temperature is deprecated for this
 * model`). Live-API verified 2026-06-11: only opus-4-7+ actually 400s today;
 * sonnet-4-6 still accepts temperature — the sonnet/opus-5 matches are a
 * precaution against the announced deprecation, not an active breakage.
 *
 * Central guard for all Claude call paths (T7, prompt-audit 2026-06-11) —
 * do not duplicate this regex inline.
 */
export function isTempDeprecatedModel(model: string): boolean {
  return /opus-4-[789]|opus-5|sonnet-4-[6789]|sonnet-5/.test(model);
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local to enable Anthropic AI features.',
    );
  }
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return globalForAnthropic.anthropic;
}

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
      // A caller-initiated abort must never be retried — surface it immediately.
      if (err instanceof Anthropic.APIUserAbortError) throw err;
      if (err instanceof Anthropic.APIError) {
        if (err.status === 401 || err.status === 403 || err.status === 400) throw err;
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

function splitSystemFromMessages(messages: ChatCompletionMessageParam[]): {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
} {
  const systemParts: string[] = [];
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    const content = typeof m.content === 'string' ? m.content : '';
    if (m.role === 'system') {
      if (content) systemParts.push(content);
    } else if (m.role === 'user' || m.role === 'assistant') {
      out.push({ role: m.role, content });
    }
  }
  return { system: systemParts.join('\n\n'), messages: out };
}

export const anthropicClient = {
  /**
   * Standard chat completion. Accepts OpenAI-style messages and splits
   * out the system prompt internally (Anthropic API requires it separate).
   */
  async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: AnthropicCompletionOptions,
  ): Promise<AnthropicCompletionResult> {
    const useCase = options?.useCase ?? 'CHAT';
    const model = options?.model ?? 'claude-sonnet-5';
    const temperature = isTempDeprecatedModel(model)
      ? undefined
      : (options?.temperature ?? aiConfig.temperature(useCase));
    const max_tokens = options?.maxTokens ?? aiConfig.maxTokens(useCase);

    const { system, messages: anthropicMessages } = splitSystemFromMessages(messages);
    if (anthropicMessages.length === 0) {
      throw new Error('Anthropic createChatCompletion requires at least one user/assistant message');
    }

    const client = getClient();
    const response = await withRetry(() =>
      client.messages.create(
        {
          model,
          max_tokens,
          ...(temperature !== undefined ? { temperature } : {}),
          system: system || undefined,
          messages: anthropicMessages,
        },
        {
          timeout: options?.timeoutMs ?? aiConfig.timeout(useCase),
          ...(options?.abortSignal ? { signal: options.abortSignal } : {}),
        },
      ),
    );

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Detect truncation: silent max_tokens cut-offs corrupt downstream
    // parsing/persistence — fail loudly instead (prompt-audit 2026-06-11).
    if (response.stop_reason === 'max_tokens') {
      console.error(
        `[anthropic-client] Claude response truncated (max_tokens reached). Model: ${model}, maxTokens: ${max_tokens}, output length: ${content.length} chars. Increase maxTokens to avoid this.`,
      );
      throw new Error(
        `Claude response was truncated (hit ${max_tokens} token limit). The output is incomplete. ` +
        `Try increasing maxTokens or simplifying the prompt. Output was ${content.length} chars.`,
      );
    }

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  },
};
