import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';

// ─── Singleton Clients ──────────────────────────────────────

const globalForCallerAnthropic = globalThis as unknown as {
  callerAnthropicClient: Anthropic | undefined;
};

const globalForCallerOpenAI = globalThis as unknown as {
  callerOpenAIClient: OpenAI | undefined;
};

const globalForCallerGoogle = globalThis as unknown as {
  callerGoogleClient: InstanceType<typeof GoogleGenAI> | undefined;
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForCallerAnthropic.callerAnthropicClient) {
    globalForCallerAnthropic.callerAnthropicClient = new Anthropic({ apiKey });
  }
  return globalForCallerAnthropic.callerAnthropicClient;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  if (!globalForCallerOpenAI.callerOpenAIClient) {
    globalForCallerOpenAI.callerOpenAIClient = new OpenAI({ apiKey });
  }
  return globalForCallerOpenAI.callerOpenAIClient;
}

function getGoogleClient(): InstanceType<typeof GoogleGenAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  if (!globalForCallerGoogle.callerGoogleClient) {
    globalForCallerGoogle.callerGoogleClient = new GoogleGenAI({ apiKey });
  }
  return globalForCallerGoogle.callerGoogleClient;
}

/**
 * Generic AI call — supports Anthropic, OpenAI and Google (Gemini)
 */
export async function generateAIResponse(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  if (provider === 'anthropic') {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
      max_tokens: maxTokens,
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  if (provider === 'google') {
    const client = getGoogleClient();
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
      },
    });
    return response.text?.trim() ?? '';
  }

  if (provider !== 'openai') {
    throw new Error(`Unsupported AI provider: "${provider}". Valid providers: anthropic, google, openai`);
  }

  // OpenAI
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content ?? '';
}

// ─── OpenAI Structured JSON Completion (JSON Schema constrained decoding) ───

interface OpenAICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Call OpenAI (GPT-4.1/4.1-mini) with native JSON Schema constrained decoding.
 * Uses `response_format: { type: 'json_schema' }` for 99.9%+ compliance.
 */
export async function createOpenAIStructuredCompletion<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> },
  options?: OpenAICompletionOptions,
): Promise<T> {
  const client = getOpenAIClient();
  const temperature = options?.temperature ?? 0.3;
  const maxTokens = options?.maxTokens ?? 8000;

  const response = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
    },
    { signal: AbortSignal.timeout(options?.timeoutMs ?? 120_000) },
  );

  const text = response.choices[0]?.message?.content ?? '';
  if (!text) {
    throw new Error(`Empty response from OpenAI ${model} (structured completion)`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (parseError) {
    const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
    throw new Error(`Failed to parse OpenAI ${model} response as JSON: ${msg}. Response starts with: "${text.slice(0, 200)}"`);
  }
}

// ─── JSON Extraction Helper ─────────────────────────────────

/**
 * Extract the first complete JSON object or array from a string.
 * Uses brace/bracket depth tracking that respects string literals,
 * so trailing commentary from the model is correctly discarded.
 */
function extractFirstJson(text: string): string {
  // Determine whether the top-level value is an object or array
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');

  let start: number;
  let open: string;
  let close: string;

  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    start = arrayStart;
    open = '[';
    close = ']';
  } else if (objectStart !== -1) {
    start = objectStart;
    open = '{';
    close = '}';
  } else {
    return text; // no JSON structure found — return as-is for downstream error
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  // Unbalanced — return from start to end as fallback
  return text.slice(start);
}

// ─── Retry Helper ────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Returns true if the error is a transient API error from any provider
 * (Anthropic, OpenAI, Google) that should be retried.
 */
function isTransientError(error: unknown): boolean {
  // Anthropic SDK errors
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429 || error.status === 529 || error.status >= 500) return true;
  }
  // OpenAI SDK errors
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429 || error.status >= 500) return true;
  }
  // Message-based detection (covers Google/Gemini and generic errors)
  const msg = error instanceof Error ? error.message : String(error);
  if (/overloaded|rate.?limit|too many requests|resource.?exhausted|\b529\b|service.?unavailable|quota.?exceeded|internal.?error/i.test(msg)) return true;
  return false;
}

/**
 * Generic retry wrapper with exponential backoff.
 * Retries up to MAX_RETRIES times for transient errors.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isTransientError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[ai-caller] Transient error on attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${label}. Retrying in ${delay}ms...`, error instanceof Error ? error.message : error);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Claude Structured JSON Completion ──────────────────────

const CLAUDE_SONNET = 'claude-sonnet-4-5-20250929';

interface ClaudeCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Enable extended thinking — model reasons internally before responding.
   *  When enabled, temperature MUST be undefined (Anthropic requirement). */
  thinking?: { budgetTokens: number };
}

/**
 * Call Claude for structured JSON output.
 * Claude excels at analytical reasoning and structured data extraction.
 * Parses the JSON from the text response automatically.
 *
 * Uses streaming to avoid the Anthropic SDK 10-minute timeout limit
 * on non-streaming requests (required for large maxTokens on slow models).
 *
 * Retries up to 3 times with exponential backoff for transient API errors
 * (overloaded_error, rate_limit_error, 5xx server errors).
 */
export async function createClaudeStructuredCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: ClaudeCompletionOptions,
): Promise<T> {
  const client = getAnthropicClient();
  const model = options?.model ?? CLAUDE_SONNET;
  const maxTokens = options?.maxTokens ?? 8000;
  const useThinking = !!options?.thinking;
  // When extended thinking is enabled, temperature MUST be undefined (Anthropic requirement)
  const temperature = useThinking ? undefined : (options?.temperature ?? 0.3);
  // Extended thinking needs more time (thinking + generation) — default 10 min
  const defaultTimeout = useThinking ? 600_000 : 90_000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Build request params — conditionally include thinking config
      const requestParams: Record<string, unknown> = {
        model,
        system: `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.`,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: maxTokens,
      };

      if (temperature !== undefined) {
        requestParams.temperature = temperature;
      }

      if (useThinking) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: options!.thinking!.budgetTokens,
        };
      }

      // Use streaming to avoid the Anthropic SDK's 10-minute timeout on
      // non-streaming requests. This is required for Claude Opus with high
      // maxTokens where generation can exceed 10 minutes.
      const stream = client.messages.stream(
        requestParams as Parameters<typeof client.messages.stream>[0],
        { signal: AbortSignal.timeout(options?.timeoutMs ?? defaultTimeout) },
      );

      // Collect the full response via the stream's finalMessage helper
      const response = await stream.finalMessage();

      // Detect truncation: if the model stopped because it ran out of tokens,
      // the JSON will be incomplete and unparseable
      if (response.stop_reason === 'max_tokens') {
        const partialText = response.content.find(b => b.type === 'text');
        const partialLen = partialText && 'text' in partialText ? partialText.text.length : 0;
        console.error(`[ai-caller] Claude response truncated (max_tokens reached). Model: ${model}, maxTokens: ${maxTokens}, output length: ${partialLen} chars. Increase maxTokens to avoid this.`);
        throw new Error(
          `Claude response was truncated (hit ${maxTokens} token limit). The JSON output is incomplete. ` +
          `Try increasing maxTokens or simplifying the prompt. Output was ${partialLen} chars.`
        );
      }

      // Extract text from response — skip thinking blocks, take only text blocks
      const textBlock = response.content.find(b => b.type === 'text');
      const text = textBlock && 'text' in textBlock ? textBlock.text.trim() : '';

      if (!text) {
        throw new Error('Empty response from Claude (structured completion)');
      }

      // Parse JSON — handle markdown code blocks that the model sometimes wraps
      let cleaned = text;
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      }

      // Extract the first complete JSON value using brace/bracket depth tracking.
      // This correctly ignores braces inside string literals and stops at the
      // matching close, so trailing commentary from the model is discarded.
      cleaned = extractFirstJson(cleaned);

      try {
        return JSON.parse(cleaned) as T;
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        throw new Error(`Failed to parse Claude response as JSON: ${msg}. Response starts with: "${cleaned.slice(0, 200)}"`);
      }
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES && isTransientError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
        console.warn(`[ai-caller] Transient error on attempt ${attempt + 1}/${MAX_RETRIES + 1} for model ${model}. Retrying in ${delay}ms...`, error instanceof Error ? error.message : error);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError;
}

// ─── Generic Structured Completion (Multi-Provider) ─────

interface StructuredCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Gemini-specific: JSON Schema for responseSchema */
  responseSchema?: Record<string, unknown>;
  /** Deep thinking / reasoning — per-provider configuration */
  thinking?: {
    anthropic?: { budgetTokens: number };
    openai?: { reasoningEffort: 'low' | 'medium' | 'high' };
    google?: { thinkingBudget: number };
  };
}

/**
 * Provider-agnostic structured JSON completion.
 * Dispatches to Claude, OpenAI, or Gemini based on the provider string.
 */
export async function createStructuredCompletion<T>(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: StructuredCompletionOptions,
): Promise<T> {
  if (provider === 'anthropic') {
    return createClaudeStructuredCompletion<T>(systemPrompt, userPrompt, {
      model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      timeoutMs: options?.timeoutMs,
      thinking: options?.thinking?.anthropic,
    });
  }

  if (provider === 'google') {
    // No withRetry here — createGeminiStructuredCompletion has its own internal retry loop
    return createGeminiStructuredCompletion<T>(systemPrompt, userPrompt, {
      model,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      responseSchema: options?.responseSchema,
      timeoutMs: options?.timeoutMs,
      thinkingConfig: options?.thinking?.google,
    });
  }

  if (provider === 'openai') {
    return withRetry('OpenAI ' + model, async () => {
      const client = getOpenAIClient();
      const reasoningConfig = options?.thinking?.openai;
      // When reasoning is enabled, temperature should be 1 (OpenAI requirement for reasoning models)
      const temperature = reasoningConfig ? 1 : (options?.temperature ?? 0.3);
      const maxTokens = options?.maxTokens ?? 8000;
      const defaultTimeout = reasoningConfig ? 600_000 : 120_000;

      const requestBody: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.` },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      };

      if (reasoningConfig) {
        requestBody.reasoning_effort = reasoningConfig.reasoningEffort;
      }

      const response = await client.chat.completions.create(
        requestBody as unknown as Parameters<typeof client.chat.completions.create>[0],
        { signal: AbortSignal.timeout(options?.timeoutMs ?? defaultTimeout) },
      ) as OpenAI.Chat.Completions.ChatCompletion;

      const text = response.choices[0]?.message?.content ?? '';
      if (!text) {
        throw new Error(`Empty response from OpenAI ${model} (structured completion)`);
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        throw new Error(`Failed to parse OpenAI ${model} response as JSON: ${msg}. Response starts with: "${text.slice(0, 200)}"`);
      }
    });
  }

  throw new Error(`Unsupported AI provider: "${provider}". Valid providers: anthropic, google, openai`);
}
