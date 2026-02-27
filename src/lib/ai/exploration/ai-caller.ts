import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Generic AI call — supports Anthropic and OpenAI
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
      max_tokens: maxTokens,
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  // OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey });
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
