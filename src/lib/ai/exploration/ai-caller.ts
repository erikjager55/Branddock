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
