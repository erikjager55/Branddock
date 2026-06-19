// =============================================================
// Gemini Client — Shared Google Gemini client for AI features
//
// Singleton pattern (like openai-client.ts / exploration-llm.ts).
// Uses @google/genai SDK.
// =============================================================

import { GoogleGenAI, PersonGeneration, Type } from '@google/genai';

import type { AICallPayload } from '@/types/learning-loop';
import {
  tryTrackStart,
  tryTrackComplete,
  buildErrorMetadata,
  type AICallTracking,
} from '@/lib/learning-loop';

// ─── Singleton ─────────────────────────────────────────────

const globalForGemini = globalThis as unknown as {
  geminiClient: InstanceType<typeof GoogleGenAI> | undefined;
};

function getClient(): InstanceType<typeof GoogleGenAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local to enable Gemini AI features.',
    );
  }

  if (!globalForGemini.geminiClient) {
    globalForGemini.geminiClient = new GoogleGenAI({ apiKey });
  }

  return globalForGemini.geminiClient;
}

// ─── Types ─────────────────────────────────────────────────

export interface GeminiCompletionOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** JSON Schema for responseSchema — enforces exact structure from Gemini */
  responseSchema?: Record<string, unknown>;
  /** Override the default 60s timeout (in milliseconds) */
  timeoutMs?: number;
  /** Enable Gemini thinking mode — model reasons internally before responding */
  thinkingConfig?: { thinkingBudget: number };
  /** Caller abort signal — combined with the internal timeout so a disconnect/deadline cancels the in-flight call. */
  abortSignal?: AbortSignal;
}

const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

// ─── Retry Helper (self-contained to avoid circular deps with ai-caller) ───

const GEMINI_MAX_RETRIES = 3;
const GEMINI_BASE_DELAY_MS = 2000;

function isGeminiTransientError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /overloaded|rate.?limit|too many requests|resource.?exhausted|service.?unavailable|quota.?exceeded|internal.?error|\b429\b|\b500\b|\b503\b/i.test(msg);
}

function geminiSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export Type enum for schema building
export { Type as GeminiSchemaType };

export interface SearchGroundedUrl {
  url: string;
  title: string;
}

export interface SearchGroundedResult {
  urls: SearchGroundedUrl[];
  /** The AI-generated text response summarizing search findings */
  responseText: string;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Use Gemini with Google Search grounding to find real URLs.
 *
 * Returns actual URLs from search results (not hallucinated).
 * Uses the `googleSearch` tool so Gemini grounds its response
 * in real web pages, then extracts URLs from grounding metadata.
 */
export async function findUrlsViaGoogleSearch(
  query: string,
  maxResults = 8,
): Promise<SearchGroundedUrl[]> {
  const client = getClient();

  // Use gemini-2.5-flash for search grounding (gemini-3.x does not support it)
  const SEARCH_MODEL = 'gemini-2.5-flash';

  const response = await client.models.generateContent({
    model: SEARCH_MODEL,
    contents: [
      {
        role: 'user' as const,
        parts: [{ text: `Find ${maxResults} recent, high-quality web articles from DIVERSE sources about: ${query}. Prefer articles from different websites/publications — industry reports, news outlets, research blogs, and analyst publications. Avoid multiple articles from the same domain.` }],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(60_000),
    },
  });

  // Extract real URLs from grounding metadata
  const resp = response as unknown as Record<string, unknown>;
  const candidate = (resp.candidates as Array<Record<string, unknown>> | undefined)?.[0];
  const groundingMeta = candidate?.groundingMetadata as Record<string, unknown> | undefined;

  // Try groundingChunks first (primary source of real URLs)
  const groundingChunks = (groundingMeta?.groundingChunks ?? []) as Array<{ web?: { uri?: string; title?: string } }>;

  let urls: SearchGroundedUrl[] = groundingChunks
    .filter((c) => c.web?.uri)
    .map((c) => ({
      url: c.web!.uri!,
      title: c.web?.title ?? '',
    }))
    .slice(0, maxResults);

  // Fallback: try supportingSearchResults / searchEntryPoint / webSearchQueries
  if (urls.length === 0) {
    const supportChunks = (groundingMeta?.groundingSupports ?? []) as Array<{
      groundingChunkIndices?: number[];
      segment?: { text?: string };
    }>;

    // Try extracting URLs from the text response itself
    const textContent = response.text ?? '';
    const urlRegex = /https?:\/\/[^\s"'<>\])+,]+/g;
    const foundUrls = textContent.match(urlRegex) ?? [];

    if (foundUrls.length > 0) {
      urls = [...new Set(foundUrls)]
        .filter((u) => !u.includes('google.com/search'))
        .slice(0, maxResults)
        .map((u) => ({ url: u, title: '' }));
    }
  }

  // Log for debugging if still empty
  if (urls.length === 0) {
    console.error('[Gemini Search] No URLs found. Response keys:', Object.keys(resp));
    console.error('[Gemini Search] Candidate keys:', candidate ? Object.keys(candidate) : 'no candidate');
    console.error('[Gemini Search] GroundingMeta keys:', groundingMeta ? Object.keys(groundingMeta) : 'no metadata');
    console.error('[Gemini Search] Text preview:', (response.text ?? '').slice(0, 500));
  }

  // Deduplicate by domain — prefer diverse sources
  const seenDomains = new Set<string>();
  const diverseUrls: SearchGroundedUrl[] = [];
  const duplicates: SearchGroundedUrl[] = [];

  for (const u of urls) {
    try {
      const domain = new URL(u.url).hostname.replace(/^www\./, '');
      if (seenDomains.has(domain)) {
        duplicates.push(u);
      } else {
        seenDomains.add(domain);
        diverseUrls.push(u);
      }
    } catch {
      diverseUrls.push(u);
    }
  }

  // Fill remaining slots with duplicates if needed
  const finalUrls = diverseUrls.slice(0, maxResults);
  if (finalUrls.length < maxResults) {
    for (const dup of duplicates) {
      if (finalUrls.length >= maxResults) break;
      finalUrls.push(dup);
    }
  }

  return finalUrls;
}

/**
 * Search via Gemini Google Search grounding and return both URLs and the AI response text.
 * The response text contains a summary of findings — useful as a fallback when URL scraping fails.
 */
export async function searchWithGrounding(
  query: string,
  maxResults = 8,
): Promise<SearchGroundedResult> {
  const client = getClient();
  const SEARCH_MODEL = 'gemini-2.5-flash';

  const response = await client.models.generateContent({
    model: SEARCH_MODEL,
    contents: [
      {
        role: 'user' as const,
        parts: [{ text: `Find ${maxResults} recent, high-quality web articles from DIVERSE sources about: ${query}. Summarize the key findings, data points, and trends from each source. Prefer articles from different websites/publications — industry reports, news outlets, research blogs, and analyst publications.` }],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 4000,
      abortSignal: AbortSignal.timeout(60_000),
    },
  });

  const responseText = response.text?.trim() ?? '';

  // Extract URLs from grounding metadata
  const resp = response as unknown as Record<string, unknown>;
  const candidate = (resp.candidates as Array<Record<string, unknown>> | undefined)?.[0];
  const groundingMeta = candidate?.groundingMetadata as Record<string, unknown> | undefined;
  const groundingChunks = (groundingMeta?.groundingChunks ?? []) as Array<{ web?: { uri?: string; title?: string } }>;

  let urls: SearchGroundedUrl[] = groundingChunks
    .filter((c) => c.web?.uri)
    .map((c) => ({ url: c.web!.uri!, title: c.web?.title ?? '' }))
    .slice(0, maxResults);

  // Fallback: extract URLs from the text itself
  if (urls.length === 0) {
    const urlRegex = /https?:\/\/[^\s"'<>\])+,]+/g;
    const foundUrls = responseText.match(urlRegex) ?? [];
    if (foundUrls.length > 0) {
      urls = [...new Set(foundUrls)]
        .filter((u) => !u.includes('google.com/search'))
        .slice(0, maxResults)
        .map((u) => ({ url: u, title: '' }));
    }
  }

  // Deduplicate by domain
  const seenDomains = new Set<string>();
  const diverseUrls: SearchGroundedUrl[] = [];
  for (const u of urls) {
    try {
      const domain = new URL(u.url).hostname.replace(/^www\./, '');
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain);
        diverseUrls.push(u);
      }
    } catch {
      diverseUrls.push(u);
    }
  }

  return {
    urls: diverseUrls.slice(0, maxResults),
    responseText,
  };
}

/**
 * Generate a structured JSON completion via Gemini.
 *
 * When `responseSchema` is provided, Gemini's constrained decoding
 * guarantees the output matches the schema exactly (valid JSON, correct types).
 * Without it, falls back to responseMimeType + prompt-based JSON generation.
 */
export async function createGeminiStructuredCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: GeminiCompletionOptions,
  tracking?: AICallTracking,
): Promise<T> {
  const client = getClient();
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.3;
  const maxOutputTokens = options?.maxOutputTokens ?? 4000;
  const useThinking = !!options?.thinkingConfig;
  // Thinking mode needs more time — default 10 min
  const defaultTimeout = useThinking ? 600_000 : 60_000;

  // Learning Loop tracking — opt-in via `tracking` parameter
  const startTime = Date.now();
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
        max_tokens: maxOutputTokens,
        response_format: options?.responseSchema ? { schema: options.responseSchema } : { type: 'json_object' },
      },
      providerExtensions: useThinking
        ? { gemini_thinking: { thinkingBudget: options!.thinkingConfig!.thinkingBudget } }
        : undefined,
    };
    traceId = await tryTrackStart(tracking, payload);
  }

  let lastError: unknown;

  try {
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        abortSignal: options?.abortSignal
          ? AbortSignal.any([
              options.abortSignal,
              AbortSignal.timeout(options?.timeoutMs ?? defaultTimeout),
            ])
          : AbortSignal.timeout(options?.timeoutMs ?? defaultTimeout),
      };

      if (options?.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      if (useThinking) {
        config.thinkingConfig = {
          thinkingBudget: options!.thinkingConfig!.thinkingBudget,
        };
      }

      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user' as const,
            parts: [{ text: userPrompt }],
          },
        ],
        config: config as Parameters<typeof client.models.generateContent>[0]['config'],
      });

      // Detect truncation via Gemini finish reason
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        const partialText = response.text ?? '';
        console.error(`[gemini-client] Gemini response truncated (MAX_TOKENS). Model: ${model}, maxOutputTokens: ${maxOutputTokens}, output length: ${partialText.length} chars.`);
        throw new Error(
          `Gemini response was truncated (hit ${maxOutputTokens} token limit). The JSON output is incomplete. ` +
          `Try increasing maxOutputTokens or simplifying the prompt. Output was ${partialText.length} chars.`
        );
      }

      const text = response.text?.trim() ?? '';

      if (!text) {
        throw new Error('Empty response from Gemini (structured completion)');
      }

      // Parse JSON — handle markdown code blocks that Gemini sometimes wraps
      let cleaned = text;
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      }

      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      }

      let parsed: T;
      try {
        parsed = JSON.parse(cleaned) as T;
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        throw new Error(`Failed to parse Gemini response as JSON: ${msg}. Response starts with: "${cleaned.slice(0, 200)}"`);
      }

      // Success — track met fine response-metadata
      if (traceId) {
        const usage = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata;
        await tryTrackComplete(traceId, {
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          stopReason: finishReason ?? 'STOP',
          latencyMs: Date.now() - startTime,
          wasFromCache: tracking?.wasFromCache ?? false,
          cacheAgeSeconds: tracking?.cacheAgeSeconds,
        });
      }
      return parsed;
    } catch (error) {
      lastError = error;

      if (attempt < GEMINI_MAX_RETRIES && isGeminiTransientError(error)) {
        const delay = GEMINI_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[gemini-client] Transient error on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES + 1} for model ${model}. Retrying in ${delay}ms...`, error instanceof Error ? error.message : error);
        await geminiSleep(delay);
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

// ─── Plain-text Completion ──────────────────────────────────

export interface GeminiTextCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate plain-text content via Gemini (no JSON constraint).
 * Use for content generation where the output is markdown/prose, not structured data.
 */
export async function createGeminiTextCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: GeminiCompletionOptions,
): Promise<GeminiTextCompletionResult> {
  const client = getClient();
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.7;
  const maxOutputTokens = options?.maxOutputTokens ?? 4000;
  const useThinking = !!options?.thinkingConfig;
  const defaultTimeout = useThinking ? 600_000 : 120_000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens,
        abortSignal: AbortSignal.timeout(options?.timeoutMs ?? defaultTimeout),
      };
      if (useThinking) {
        config.thinkingConfig = { thinkingBudget: options!.thinkingConfig!.thinkingBudget };
      }

      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user' as const, parts: [{ text: userPrompt }] }],
        config: config as Parameters<typeof client.models.generateContent>[0]['config'],
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        throw new Error(`Gemini response truncated at ${maxOutputTokens} tokens — increase maxOutputTokens or shorten prompt.`);
      }

      const text = response.text?.trim() ?? '';
      if (!text) throw new Error('Empty response from Gemini (text completion)');

      const usage = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata;
      return {
        content: text,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      };
    } catch (error) {
      lastError = error;
      if (attempt < GEMINI_MAX_RETRIES && isGeminiTransientError(error)) {
        const delay = GEMINI_BASE_DELAY_MS * Math.pow(2, attempt);
        await geminiSleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// ─── Image Generation (Imagen 4) ────────────────────────────

export interface ImagenOptions {
  aspectRatio?: string;    // "1:1" | "16:9" | "9:16" | "3:4" | "4:3" etc.
  numberOfImages?: number; // 1-4
}

export async function generateImage(
  prompt: string,
  options?: ImagenOptions,
): Promise<{ imageBytes: Buffer; mimeType: string }> {
  const client = getClient();
  const response = await client.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: options?.numberOfImages ?? 1,
      aspectRatio: options?.aspectRatio ?? '1:1',
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  });
  if (!response.generatedImages?.length) {
    throw new Error('No images generated by Imagen');
  }
  const firstImage = response.generatedImages[0];
  const imgBytes = firstImage.image?.imageBytes;
  if (!imgBytes) {
    throw new Error('Generated image has no image bytes');
  }
  return {
    imageBytes: Buffer.from(imgBytes, 'base64'),
    mimeType: 'image/png',
  };
}

// ─── Compose from images (nano-banana) ─────────────────────
// Sub-sprint #6.A: FAL Flux Pro Kontext multi → Gemini Image Preview.
// Model gemini-2.5-flash-image ondersteunt multi-image input via
// inline base64 parts + tekst-instructie. Aspect-ratio gaat als instructie-
// suffix mee (model ondersteunt geen aspect-ratio param directly).

export type GeminiAspectLabel = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ComposeFromImagesOptions {
  aspectRatio?: GeminiAspectLabel;
}

export interface ComposeFromImagesResult {
  imageBytes: Buffer;
  mimeType: string;
  /** Het tekst-deel van Gemini's response (optioneel, voor debug). */
  responseText: string | null;
}

export class ComposeInvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeInvalidImageError';
  }
}

export class ComposePolicyBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposePolicyBlockedError';
  }
}

export class ComposeQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeQuotaError';
  }
}

export class ComposeNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposeNetworkError';
  }
}

const COMPOSE_MODEL = 'gemini-2.5-flash-image';

const ASPECT_INSTRUCTION_SUFFIX: Record<GeminiAspectLabel, string> = {
  '1:1': 'Render output as a square 1:1 image.',
  '16:9': 'Render output as a 16:9 landscape image.',
  '9:16': 'Render output as a 9:16 portrait image.',
  '4:3': 'Render output as a 4:3 landscape image.',
  '3:4': 'Render output as a 3:4 portrait image.',
};

async function fetchImageAsInlineData(
  url: string,
): Promise<{ data: string; mimeType: string }> {
  // MediaAsset-URLs zijn bij local-disk-storage (dev) relatief (/uploads/...).
  // Node fetch vereist een absolute URL → resolve relatieve paden tegen de
  // app-base-URL. Absolute (CDN/S3) URLs in prod blijven ongewijzigd.
  const absoluteUrl = url.startsWith('/')
    ? `${(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')}${url}`
    : url;
  let res: Response;
  try {
    res = await fetch(absoluteUrl);
  } catch (err) {
    throw new ComposeNetworkError(
      `Failed to fetch reference image ${absoluteUrl}: ${(err as Error).message}`,
    );
  }
  if (!res.ok) {
    throw new ComposeInvalidImageError(
      `Reference image fetch returned ${res.status} for ${url}`,
    );
  }
  const contentType = res.headers.get('content-type') ?? 'image/png';
  if (!contentType.startsWith('image/')) {
    throw new ComposeInvalidImageError(
      `Reference URL did not return image content-type: ${contentType} for ${url}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString('base64'), mimeType: contentType };
}

export async function composeFromImages(
  imageUrls: string[],
  instruction: string,
  options?: ComposeFromImagesOptions,
): Promise<ComposeFromImagesResult> {
  if (imageUrls.length < 2 || imageUrls.length > 9) {
    throw new ComposeInvalidImageError(
      `composeFromImages requires 2-9 image URLs, got ${imageUrls.length}`,
    );
  }
  if (!instruction.trim()) {
    throw new ComposeInvalidImageError('composeFromImages requires a non-empty instruction');
  }

  const client = getClient();
  const inlineImages = await Promise.all(imageUrls.map(fetchImageAsInlineData));

  const aspectSuffix = options?.aspectRatio
    ? ` ${ASPECT_INSTRUCTION_SUFFIX[options.aspectRatio]}`
    : '';
  const textPart = {
    text: `${instruction}${aspectSuffix}`,
  };
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    ...inlineImages.map((img) => ({ inlineData: img })),
    textPart,
  ];

  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model: COMPOSE_MODEL,
      contents: [{ role: 'user', parts }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/quota|rate.?limit/i.test(message)) {
      throw new ComposeQuotaError(`Gemini compose quota/rate limit hit: ${message}`);
    }
    if (/policy|safety|blocked/i.test(message)) {
      throw new ComposePolicyBlockedError(`Gemini compose policy block: ${message}`);
    }
    if (/network|timeout|ECONN|fetch/i.test(message)) {
      throw new ComposeNetworkError(`Gemini compose network error: ${message}`);
    }
    throw new Error(`Gemini compose failed: ${message}`);
  }

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new ComposePolicyBlockedError(
      'Gemini returned no candidates — likely content-policy block on input',
    );
  }
  const responseParts = candidate.content?.parts ?? [];
  let imagePart: { inlineData?: { data?: string; mimeType?: string } } | undefined;
  let responseText: string | null = null;
  for (const p of responseParts) {
    if ('inlineData' in p && p.inlineData?.data) {
      imagePart = p;
    } else if ('text' in p && typeof p.text === 'string') {
      responseText = (responseText ?? '') + p.text;
    }
  }
  if (!imagePart?.inlineData?.data) {
    throw new ComposePolicyBlockedError(
      'Gemini compose returned no image data (possible policy block or empty response)',
    );
  }
  return {
    imageBytes: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    responseText,
  };
}
