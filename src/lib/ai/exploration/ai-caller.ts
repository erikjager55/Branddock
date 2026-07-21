import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { timeoutForTokens } from '@/lib/ai/call-budget';
import { isTempDeprecatedModel } from '@/lib/ai/anthropic-client';

import type {
  AICallPayload,
  AICallResponseMetadata,
} from '@/types/learning-loop';
import {
  tryTrackStart,
  tryTrackComplete,
  buildErrorMetadata,
  type AICallTracking,
} from '@/lib/learning-loop';

// Re-export voor callers die direct uit ai-caller importeren
export type { AICallTracking };

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

// ─── Learning Loop Tracking ──────────────────────────────────────────────
// Tracking-helpers (tryTrackStart, tryTrackComplete, buildErrorMetadata,
// AICallTracking) worden geïmporteerd uit `@/lib/learning-loop`.
// Zelfde helpers worden gebruikt door gemini-client.ts.

/**
 * Generic AI call — supports Anthropic, OpenAI and Google (Gemini).
 *
 * Optional `tracking` parameter enables learning-loop tracking with
 * fine response-metadata (token counts, stop_reason). Backwards compatible.
 */
export async function generateAIResponse(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  tracking?: AICallTracking,
): Promise<string> {
  const startTime = Date.now();
  // 120s floor: this generic path serves workspace-configurable models, and
  // Opus-class generation (~30 tok/s) outruns the 10ms/token rule-of-thumb
  // at small budgets. Previously these calls ran on SDK defaults (~600s).
  const timeoutMs = Math.max(timeoutForTokens(maxTokens), 120_000);
  let traceId: string | null = null;

  if (tracking) {
    const payload: AICallPayload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      params: { temperature, max_tokens: maxTokens },
    };
    traceId = await tryTrackStart(tracking, payload);
  }

  try {
    if (provider === 'anthropic') {
      const client = getAnthropicClient();
      const response = await client.messages.create(
        {
          model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          // Workspace-configurable models can be temp-deprecated generations
          // (opus-4-7+ 400s on temperature) — same guard as the other paths.
          ...(isTempDeprecatedModel(model) ? {} : { temperature }),
          max_tokens: maxTokens,
        },
        { timeout: timeoutMs },
      );
      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

      if (response.stop_reason === 'max_tokens') {
        console.error(`[ai-caller] Claude response truncated (max_tokens reached). Model: ${model}, maxTokens: ${maxTokens}, output length: ${text.length} chars. Increase maxTokens to avoid this.`);
        throw new Error(
          `Claude response was truncated (hit ${maxTokens} token limit). The output is incomplete. ` +
          `Try increasing maxTokens or simplifying the prompt. Output was ${text.length} chars.`
        );
      }

      if (traceId) {
        const usage = response.usage;
        await tryTrackComplete(traceId, {
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          cacheReadTokens: usage?.cache_read_input_tokens ?? undefined,
          cacheWriteTokens: usage?.cache_creation_input_tokens ?? undefined,
          stopReason: response.stop_reason ?? 'end_turn',
          latencyMs: Date.now() - startTime,
          wasFromCache: tracking?.wasFromCache ?? false,
          cacheAgeSeconds: tracking?.cacheAgeSeconds,
        });
      }
      return text;
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
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
      const text = response.text?.trim() ?? '';

      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        console.error(`[ai-caller] Gemini response truncated (MAX_TOKENS). Model: ${model}, maxTokens: ${maxTokens}, output length: ${text.length} chars. Increase maxTokens to avoid this.`);
        throw new Error(
          `Gemini response was truncated (hit ${maxTokens} token limit). The output is incomplete. ` +
          `Try increasing maxTokens or simplifying the prompt. Output was ${text.length} chars.`
        );
      }

      if (traceId) {
        const usage = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata;
        const finishReason = response.candidates?.[0]?.finishReason;
        await tryTrackComplete(traceId, {
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          stopReason: finishReason ?? 'STOP',
          latencyMs: Date.now() - startTime,
          wasFromCache: tracking?.wasFromCache ?? false,
          cacheAgeSeconds: tracking?.cacheAgeSeconds,
        });
      }
      return text;
    }

    if (provider !== 'openai') {
      throw new Error(`Unsupported AI provider: "${provider}". Valid providers: anthropic, google, openai`);
    }

    // OpenAI
    const client = getOpenAIClient();
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_completion_tokens: maxTokens,
      },
      { timeout: timeoutMs },
    );
    const text = response.choices[0]?.message?.content ?? '';

    if (response.choices[0]?.finish_reason === 'length') {
      console.error(`[ai-caller] OpenAI response truncated (finish_reason=length). Model: ${model}, maxTokens: ${maxTokens}, output length: ${text.length} chars. Increase maxTokens to avoid this.`);
      throw new Error(
        `OpenAI response was truncated (hit ${maxTokens} token limit). The output is incomplete. ` +
        `Try increasing maxTokens or simplifying the prompt. Output was ${text.length} chars.`
      );
    }

    if (traceId) {
      await tryTrackComplete(traceId, {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        stopReason: response.choices[0]?.finish_reason ?? 'unknown',
        latencyMs: Date.now() - startTime,
        wasFromCache: tracking?.wasFromCache ?? false,
        cacheAgeSeconds: tracking?.cacheAgeSeconds,
      });
    }
    return text;
  } catch (err) {
    if (traceId && tracking) {
      await tryTrackComplete(traceId, buildErrorMetadata(startTime, err, tracking));
    }
    throw err;
  }
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
      max_completion_tokens: maxTokens,
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

  // Truncated JSON would otherwise surface as an opaque parse error
  // that hides the real cause (token budget, not malformed output).
  if (response.choices[0]?.finish_reason === 'length') {
    console.error(`[ai-caller] OpenAI structured response truncated (finish_reason=length). Model: ${model}, maxTokens: ${maxTokens}, output length: ${text.length} chars. Increase maxTokens to avoid this.`);
    throw new Error(
      `OpenAI response was truncated (hit ${maxTokens} token limit). ` +
      `Try increasing maxTokens or simplifying the prompt. Output was ${text.length} chars.`
    );
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

const CLAUDE_SONNET = 'claude-sonnet-5';

interface ClaudeCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Enable extended thinking — model reasons internally before responding.
   *  When enabled, temperature MUST be undefined (Anthropic requirement). */
  thinking?: { budgetTokens: number };
  /** Optional image attachments. When provided, the user message is sent
   *  as a multipart content array (images + text) instead of plain text.
   *  Use this for Vision-grounded prompts (e.g. "here's the page screenshot,
   *  classify these colors"). */
  images?: Array<{ buffer: Buffer; mediaType: "image/png" | "image/jpeg" | "image/webp" }>;
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
  tracking?: AICallTracking,
): Promise<T> {
  const client = getAnthropicClient();
  const model = options?.model ?? CLAUDE_SONNET;
  // 2026-05-24: default verhoogd 8000 → 16000. SEO pipeline Step 8
  // (Publication Prep) hit het 8K-limit met 16749 chars output;
  // pipeline-aggregate steps die alle voorgaande outputs samenbrengen
  // groeien snel boven 8K JSON. Callers met short-output (kleine
  // structured-extraction) kunnen alsnog explicit lager zetten.
  const maxTokens = options?.maxTokens ?? 16000;
  const useThinking = !!options?.thinking;
  // Temperature-deprecated models (zie isTempDeprecatedModel JSDoc): net als
  // thinking-mode temperature undefined laten.
  const temperature = (useThinking || isTempDeprecatedModel(model)) ? undefined : (options?.temperature ?? 0.3);
  // Extended thinking needs more time (thinking + generation) — default 10 min
  const defaultTimeout = useThinking ? 600_000 : 90_000;

  // Learning Loop tracking — opt-in via `tracking` parameter
  const startTime = Date.now();
  let traceId: string | null = null;
  if (tracking) {
    const payload: AICallPayload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }, // multimodal content omitted from snapshot for v1
      ],
      params: {
        temperature,
        max_tokens: maxTokens,
      },
      providerExtensions: useThinking
        ? { extended_thinking: { budget_tokens: options!.thinking!.budgetTokens } }
        : undefined,
    };
    traceId = await tryTrackStart(tracking, payload);
  }

  let lastError: unknown;

  try {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Build user message content. When `images` is provided, send as a
      // multipart content array (image blocks + text). Otherwise plain text.
      const userContent = options?.images && options.images.length > 0
        ? [
            ...options.images.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mediaType,
                data: img.buffer.toString('base64'),
              },
            })),
            { type: 'text' as const, text: userPrompt },
          ]
        : userPrompt;

      // Build request params — conditionally include thinking config
      const requestParams: Record<string, unknown> = {
        model,
        system: `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.`,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: maxTokens,
      };

      if (temperature !== undefined) {
        requestParams.temperature = temperature;
      }

      if (useThinking) {
        // F27 (audit 2026-05-13): Opus 4.7 vereist NIEUWE thinking-API
        // (type: 'adaptive' + output_config.effort) ipv legacy
        // (type: 'enabled' + budget_tokens). Voorheen falden Opus calls
        // silently: 400 error → fallback-provider takeover.
        // Sonnet 4.6 + 4.5 + Opus 4.5/4.6 ondersteunen nog legacy syntax.
        const isOpus47Plus = /opus-4-7|opus-4-8|opus-5/.test(model);
        if (isOpus47Plus) {
          // Adaptive thinking met effort-level afgeleid van budget-tokens.
          // <4000 = low, 4000-8000 = medium, >8000 = high.
          const budget = options!.thinking!.budgetTokens;
          const effort = budget < 4000 ? 'low' : budget < 8000 ? 'medium' : 'high';
          requestParams.thinking = { type: 'adaptive' };
          requestParams.output_config = { effort };
        } else {
          requestParams.thinking = {
            type: 'enabled',
            budget_tokens: options!.thinking!.budgetTokens,
          };
        }
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

      let parsed: T;
      try {
        parsed = JSON.parse(cleaned) as T;
      } catch (parseError) {
        // Bad escape sequences komen vooral voor wanneer Claude lange markdown-
        // content in een JSON-string verpakt en daarbij chars als `\€`, `\(`,
        // `\;` produceert die geen valide JSON-escape zijn (JSON staat alleen
        // `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX` toe).
        // Repair-pass: dubbele elke backslash die NIET gevolgd wordt door een
        // valide escape-char, en probeer opnieuw te parsen. Voorkomt dat een
        // anders volledig valide response sneuvelt op één illegale char.
        const repaired = cleaned.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
        try {
          parsed = JSON.parse(repaired) as T;
          console.warn('[ai-caller] JSON parse needed escape-repair (Claude produced invalid \\X sequence in string)');
        } catch (repairError) {
          const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
          const repairMsg = repairError instanceof Error ? repairError.message : 'unknown';
          throw new Error(`Failed to parse Claude response as JSON: ${msg} (escape-repair also failed: ${repairMsg}). Response starts with: "${cleaned.slice(0, 200)}"`);
        }
      }

      // Success — track met fine response-metadata
      if (traceId) {
        const usage = response.usage;
        await tryTrackComplete(traceId, {
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          cacheReadTokens: usage?.cache_read_input_tokens ?? undefined,
          cacheWriteTokens: usage?.cache_creation_input_tokens ?? undefined,
          stopReason: response.stop_reason ?? 'unknown',
          latencyMs: Date.now() - startTime,
          wasFromCache: tracking?.wasFromCache ?? false,
          cacheAgeSeconds: tracking?.cacheAgeSeconds,
        });
      }
      return parsed;
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
  } catch (err) {
    // Terminal failure — track error metadata
    if (traceId && tracking) {
      await tryTrackComplete(traceId, buildErrorMetadata(startTime, err, tracking));
    }
    throw err;
  }
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
 *
 * Optional `tracking` parameter enables learning-loop tracking — schrijft
 * BrandContextSnapshot + AICallSnapshot + AICallTrace voor deze call.
 * Backwards-compatible: zonder `tracking` werkt deze functie ongewijzigd.
 *
 * Tracking-granulariteit is **coarse** voor anthropic/google (geen toegang
 * tot response.usage zonder `createClaude/GeminiStructuredCompletion` aan
 * te passen). Voor openai is tracking **fine** met token counts en
 * stop_reason. Sessie 3b/3c kan fine tracking voor anthropic/google toevoegen.
 */
export async function createStructuredCompletion<T>(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: StructuredCompletionOptions,
  tracking?: AICallTracking,
): Promise<T> {
  // Anthropic + Google: pure dispatch — lower-level wrappers doen eigen tracking
  // (zie createClaudeStructuredCompletion + createGeminiStructuredCompletion).
  if (provider === 'anthropic') {
    return createClaudeStructuredCompletion<T>(systemPrompt, userPrompt, {
      model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      timeoutMs: options?.timeoutMs,
      thinking: options?.thinking?.anthropic,
    }, tracking);
  }

  if (provider === 'google') {
    return createGeminiStructuredCompletion<T>(systemPrompt, userPrompt, {
      model,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      responseSchema: options?.responseSchema,
      timeoutMs: options?.timeoutMs,
      thinkingConfig: options?.thinking?.google,
    }, tracking);
  }

  // OpenAI inline — tracking op deze laag (response.usage direct beschikbaar)
  if (provider === 'openai') {
    const startTime = Date.now();
    const reasoningConfig = options?.thinking?.openai;
    // When reasoning is enabled, temperature should be 1 (OpenAI requirement for reasoning models)
    const temperature = reasoningConfig ? 1 : (options?.temperature ?? 0.3);
    const maxTokens = options?.maxTokens ?? 8000;

    let traceId: string | null = null;
    if (tracking) {
      const payload: AICallPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        params: {
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        },
        providerExtensions: reasoningConfig
          ? { openai_reasoning: { effort: reasoningConfig.reasoningEffort } }
          : undefined,
      };
      traceId = await tryTrackStart(tracking, payload);
    }

    try {
      return await withRetry('OpenAI ' + model, async () => {
        const client = getOpenAIClient();
        const defaultTimeout = reasoningConfig ? 600_000 : 120_000;

        const requestBody: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.` },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_completion_tokens: maxTokens,
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

        // Truncated JSON would otherwise surface as an opaque parse error
        // that hides the real cause (token budget, not malformed output).
        if (response.choices[0]?.finish_reason === 'length') {
          console.error(`[ai-caller] OpenAI structured response truncated (finish_reason=length). Model: ${model}, maxTokens: ${maxTokens}, output length: ${text.length} chars. Increase maxTokens to avoid this.`);
          throw new Error(
            `OpenAI response was truncated (hit ${maxTokens} token limit). ` +
            `Try increasing maxTokens or simplifying the prompt. Output was ${text.length} chars.`
          );
        }

        let parsed: T;
        try {
          parsed = JSON.parse(text) as T;
        } catch (parseError) {
          const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
          throw new Error(`Failed to parse OpenAI ${model} response as JSON: ${msg}. Response starts with: "${text.slice(0, 200)}"`);
        }

        // Fine tracking — direct access to response.usage en finish_reason
        if (traceId) {
          await tryTrackComplete(traceId, {
            inputTokens: response.usage?.prompt_tokens ?? 0,
            outputTokens: response.usage?.completion_tokens ?? 0,
            stopReason: response.choices[0]?.finish_reason ?? 'unknown',
            latencyMs: Date.now() - startTime,
            wasFromCache: tracking?.wasFromCache ?? false,
            cacheAgeSeconds: tracking?.cacheAgeSeconds,
          });
        }

        return parsed;
      });
    } catch (err) {
      if (traceId && tracking) {
        await tryTrackComplete(traceId, buildErrorMetadata(startTime, err, tracking));
      }
      throw err;
    }
  }

  throw new Error(`Unsupported AI provider: "${provider}". Valid providers: anthropic, google, openai`);
}
