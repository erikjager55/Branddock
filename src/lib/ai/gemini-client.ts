// =============================================================
// Gemini Client — Shared Google Gemini client for AI features
//
// Singleton pattern (like openai-client.ts / exploration-llm.ts).
// Uses @google/genai SDK.
// =============================================================

import { GoogleGenAI, Type } from '@google/genai';

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
}

const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

// Re-export Type enum for schema building
export { Type as GeminiSchemaType };

export interface SearchGroundedUrl {
  url: string;
  title: string;
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
        parts: [{ text: `Find ${maxResults} recent, high-quality web articles about: ${query}. List the URLs you find.` }],
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

  return urls;
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
): Promise<T> {
  const client = getClient();
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.3;
  const maxOutputTokens = options?.maxOutputTokens ?? 4000;

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user' as const,
        parts: [{ text: userPrompt }],
      },
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      ...(options?.responseSchema ? { responseSchema: options.responseSchema } : {}),
      // 60s timeout to prevent indefinite hangs
      abortSignal: AbortSignal.timeout(60_000),
    },
  });

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

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseError) {
    const msg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
    throw new Error(`Failed to parse Gemini response as JSON: ${msg}. Response starts with: "${cleaned.slice(0, 200)}"`);
  }
}
