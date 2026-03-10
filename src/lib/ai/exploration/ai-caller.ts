import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

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

// ─── Claude Structured JSON Completion ──────────────────────

const CLAUDE_SONNET = 'claude-sonnet-4-5-20250929';

interface ClaudeCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Call Claude for structured JSON output.
 * Claude excels at analytical reasoning and structured data extraction.
 * Parses the JSON from the text response automatically.
 */
export async function createClaudeStructuredCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: ClaudeCompletionOptions,
): Promise<T> {
  const client = getAnthropicClient();
  const model = options?.model ?? CLAUDE_SONNET;
  const temperature = options?.temperature ?? 0.3;
  const maxTokens = options?.maxTokens ?? 8000;

  const response = await client.messages.create(
    {
      model,
      system: `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.`,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
      max_tokens: maxTokens,
    },
    { signal: AbortSignal.timeout(options?.timeoutMs ?? 90_000) },
  );

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

  if (!text) {
    throw new Error('Empty response from Claude (structured completion)');
  }

  // Parse JSON — handle markdown code blocks that the model sometimes wraps
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
    throw new Error(`Failed to parse Claude response as JSON: ${msg}. Response starts with: "${cleaned.slice(0, 200)}"`);
  }
}
