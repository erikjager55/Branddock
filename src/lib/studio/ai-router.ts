// =============================================================
// Studio AI Router
//
// Maps studio model IDs (claude, gpt-4, gemini) to actual
// provider + model configurations for the generateAIResponse()
// caller in ai-caller.ts.
// =============================================================

import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';

// ─── Model Configuration ──────────────────────────────────

interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

const MODEL_MAP: Record<string, ModelConfig> = {
  claude: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'gpt-4': {
    provider: 'openai',
    model: 'gpt-4o',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  gemini: {
    provider: 'google',
    model: 'gemini-3.1-pro-preview',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
};

// ─── Length → maxTokens mapping ────────────────────────────

const LENGTH_TOKENS: Record<string, number> = {
  short: 1500,
  medium: 3000,
  long: 6000,
};

// ─── Public API ────────────────────────────────────────────

export interface GenerateOptions {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  contentLength?: string;
  workspaceId?: string;
}

/**
 * Route a content generation request to the appropriate AI provider.
 * Returns the raw text response from the AI.
 */
export async function routeGeneration(options: GenerateOptions): Promise<string> {
  const config = MODEL_MAP[options.modelId];
  if (!config) {
    throw new Error(
      `Unknown model ID: "${options.modelId}". Valid IDs: ${Object.keys(MODEL_MAP).join(', ')}`,
    );
  }

  // Use workspace-configured model override if available
  let provider = config.provider;
  let model = config.model;
  if (options.workspaceId) {
    const resolved = await resolveFeatureModel(options.workspaceId, 'content-generate');
    provider = resolved.provider;
    model = resolved.model;
  }

  const temperature = options.temperature ?? config.defaultTemperature;
  const maxTokens =
    options.maxTokens ??
    (options.contentLength ? LENGTH_TOKENS[options.contentLength] ?? config.defaultMaxTokens : config.defaultMaxTokens);

  return generateAIResponse(
    provider,
    model,
    options.systemPrompt,
    options.userPrompt,
    temperature,
    maxTokens,
  );
}

/**
 * Check if the given model ID is available (has a valid API key configured).
 */
export function isModelAvailable(modelId: string): boolean {
  const config = MODEL_MAP[modelId];
  if (!config) return false;

  switch (config.provider) {
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'google':
      return !!process.env.GEMINI_API_KEY;
    default:
      return false;
  }
}
