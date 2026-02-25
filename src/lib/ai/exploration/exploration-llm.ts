// ─── AI Exploration LLM Client ──────────────────────────────
// Multi-provider support: Anthropic (Claude) + Google (Gemini)
// Provider/model selection via function parameters.
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

// ─── Provider Types ─────────────────────────────────────────

export type ExplorationProvider = 'anthropic' | 'google';

export interface ExplorationModelConfig {
  provider: ExplorationProvider;
  model: string;
}

// ─── Available Models ───────────────────────────────────────

export const EXPLORATION_MODELS: {
  id: string;
  name: string;
  provider: ExplorationProvider;
  model: string;
  description: string;
}[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6-20250225',
    description: 'Anthropic — Best for nuanced brand strategy',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    description: 'Anthropic — Proven, reliable',
  },
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    model: 'gemini-3.1-pro-preview',
    description: 'Google — Advanced reasoning, cost-effective',
  },
];

export const DEFAULT_EXPLORATION_MODEL = EXPLORATION_MODELS[0]; // Claude Sonnet 4.6

// ─── Singleton Clients ──────────────────────────────────────

const globalForAnthropic = globalThis as unknown as {
  explorationAnthropicClient: Anthropic | undefined;
};

const globalForGoogle = globalThis as unknown as {
  explorationGoogleClient: InstanceType<typeof GoogleGenAI> | undefined;
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForAnthropic.explorationAnthropicClient) {
    globalForAnthropic.explorationAnthropicClient = new Anthropic({ apiKey });
  }
  return globalForAnthropic.explorationAnthropicClient;
}

function getGoogleClient(): InstanceType<typeof GoogleGenAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  if (!globalForGoogle.explorationGoogleClient) {
    globalForGoogle.explorationGoogleClient = new GoogleGenAI({ apiKey });
  }
  return globalForGoogle.explorationGoogleClient;
}

// ─── Types ──────────────────────────────────────────────────

interface QAPair {
  question: string;
  answer: string;
  dimensionKey: string;
}

interface DimensionDef {
  key: string;
  title: string;
  icon: string;
  question: string;
}

// ─── Core LLM Call (provider-agnostic) ──────────────────────

async function callLLM(params: {
  modelConfig: ExplorationModelConfig;
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { modelConfig, systemPrompt, messages, temperature = 0.7, maxTokens = 300 } = params;

  if (modelConfig.provider === 'anthropic') {
    const client = getAnthropicClient();
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await client.messages.create({
      model: modelConfig.model,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  }

  if (modelConfig.provider === 'google') {
    const client = getGoogleClient();

    // Build Gemini contents array: system instruction via config, then messages
    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    const response = await client.models.generateContent({
      model: modelConfig.model,
      contents: geminiContents,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    return response.text?.trim() ?? '';
  }

  throw new Error(`Unsupported provider: ${modelConfig.provider}`);
}

// ─── System Prompt Builder ──────────────────────────────────

function buildExplorationSystemPrompt(
  itemType: string,
  itemName: string,
  itemContext: string,
  dimensions: DimensionDef[],
): string {
  const dimensionList = dimensions
    .map((d, i) => `${i + 1}. ${d.title} (key: ${d.key})`)
    .join('\n');

  return `You are a senior brand strategist conducting an AI-guided exploration session for a ${itemType} called "${itemName}".

## Item Context
${itemContext}

## Exploration Dimensions
${dimensionList}

## Rules
- Ask ONE clear, open-ended question at a time
- Build on previous answers — reference what the user said
- Be warm but professional, like a trusted advisor
- Keep questions concise (1-2 sentences max)
- Focus on actionable insights for brand strategy
- Questions should be in English`;
}

// ─── Generate Next Question ─────────────────────────────────

export async function generateNextQuestion(params: {
  itemType: string;
  itemName: string;
  itemContext: string;
  dimensions: DimensionDef[];
  currentDimension: DimensionDef;
  previousQA: QAPair[];
  modelConfig?: ExplorationModelConfig;
}): Promise<string> {
  const {
    itemType, itemName, itemContext, dimensions,
    currentDimension, previousQA,
    modelConfig = DEFAULT_EXPLORATION_MODEL,
  } = params;

  const systemPrompt = buildExplorationSystemPrompt(itemType, itemName, itemContext, dimensions);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const qa of previousQA) {
    messages.push({ role: 'assistant', content: qa.question });
    messages.push({ role: 'user', content: qa.answer });
  }
  messages.push({
    role: 'user',
    content: `Now ask a question about the "${currentDimension.title}" dimension. Focus on understanding this aspect of ${itemName}. Ask only ONE question.`,
  });

  try {
    const text = await callLLM({ modelConfig, systemPrompt, messages, temperature: 0.7, maxTokens: 300 });
    return text || currentDimension.question;
  } catch (error) {
    console.error('[exploration-llm] generateNextQuestion failed:', error);
    return currentDimension.question;
  }
}

// ─── Generate Feedback ──────────────────────────────────────

export async function generateFeedback(params: {
  itemType: string;
  itemName: string;
  dimensionTitle: string;
  question: string;
  answer: string;
  modelConfig?: ExplorationModelConfig;
}): Promise<string> {
  const {
    itemType, itemName, dimensionTitle, question, answer,
    modelConfig = DEFAULT_EXPLORATION_MODEL,
  } = params;

  const systemPrompt = `You are a senior brand strategist. Give brief, encouraging feedback (1-2 sentences) on the user's answer about the "${dimensionTitle}" dimension of a ${itemType} called "${itemName}". Acknowledge what they said and highlight what's useful for brand strategy. Be warm and specific — reference their actual answer. Respond in English.`;

  try {
    const text = await callLLM({
      modelConfig,
      systemPrompt,
      messages: [
        { role: 'assistant', content: question },
        { role: 'user', content: answer },
        { role: 'user', content: 'Give brief feedback on my answer above.' },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });
    return text || 'Great insight! This helps build a clearer picture.';
  } catch (error) {
    console.error('[exploration-llm] generateFeedback failed:', error);
    return 'Thank you for sharing that perspective. This is valuable input for the analysis.';
  }
}

// ─── Resolve Model Config ───────────────────────────────────

/** Look up full model config from a model ID string (e.g. 'claude-sonnet-4-6') */
export function resolveModelConfig(modelId: string | null | undefined): ExplorationModelConfig {
  if (!modelId) return DEFAULT_EXPLORATION_MODEL;
  const found = EXPLORATION_MODELS.find((m) => m.id === modelId);
  return found ?? DEFAULT_EXPLORATION_MODEL;
}
