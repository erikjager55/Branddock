// =============================================================
// Gemini Client — Shared Google Gemini client for AI features
//
// Singleton pattern (like openai-client.ts / exploration-llm.ts).
// Uses @google/genai SDK.
// =============================================================

import { GoogleGenAI } from '@google/genai';

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
}

const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

// ─── Public API ────────────────────────────────────────────

/**
 * Generate a structured JSON completion via Gemini.
 *
 * Uses instruction-based JSON generation (system prompt asks for JSON)
 * since @google/genai SDK doesn't expose a native responseFormat parameter.
 *
 * The system prompt MUST instruct the model to respond with valid JSON.
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
    throw new Error(`Failed to parse Gemini response as JSON: ${msg}. Response starts with: "${cleaned.slice(0, 100)}"`);
  }
}
