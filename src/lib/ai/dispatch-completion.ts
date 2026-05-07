// =============================================================
// Dispatch text completion across providers.
//
// Routes a system + user prompt to the right SDK based on
// resolveFeatureModel() output. Returns a normalized result shape
// for observability (durationMs, token counts, provider, model).
// =============================================================

import { openaiClient } from './openai-client';
import { anthropicClient } from './anthropic-client';
import { createGeminiTextCompletion } from './gemini-client';
import type { ResolvedModel } from './feature-models';

export interface DispatchTextCompletionParams {
  resolvedModel: ResolvedModel;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DispatchTextCompletionResult {
  content: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  provider: ResolvedModel['provider'];
  model: string;
}

const DEFAULT_MAX_TOKENS = 4096;
const LONG_FORM_TIMEOUT_MS = 180_000; // 3 min for body/long-form generations
const SHORT_FORM_TIMEOUT_MS = 60_000;
const LONG_FORM_THRESHOLD = 4096;

/**
 * Generate text content using the resolved provider/model.
 * Throws if the provider is unsupported or the call fails after retries.
 */
export async function dispatchTextCompletion(
  params: DispatchTextCompletionParams,
): Promise<DispatchTextCompletionResult> {
  const { resolvedModel, systemPrompt, userPrompt, temperature } = params;
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = maxTokens > LONG_FORM_THRESHOLD ? LONG_FORM_TIMEOUT_MS : SHORT_FORM_TIMEOUT_MS;
  const start = Date.now();

  if (resolvedModel.provider === 'openai') {
    const result = await openaiClient.createChatCompletionWithUsage(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: resolvedModel.model, temperature, maxTokens, useCase: 'CREATIVE', timeoutMs },
    );
    return {
      content: result.content,
      durationMs: Date.now() - start,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      provider: 'openai',
      model: resolvedModel.model,
    };
  }

  if (resolvedModel.provider === 'anthropic') {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: resolvedModel.model, temperature, maxTokens, useCase: 'CREATIVE', timeoutMs },
    );
    return {
      content: result.content,
      durationMs: Date.now() - start,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      provider: 'anthropic',
      model: resolvedModel.model,
    };
  }

  if (resolvedModel.provider === 'google') {
    const result = await createGeminiTextCompletion(systemPrompt, userPrompt, {
      model: resolvedModel.model,
      temperature,
      maxOutputTokens: maxTokens,
      timeoutMs,
    });
    return {
      content: result.content,
      durationMs: Date.now() - start,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      provider: 'google',
      model: resolvedModel.model,
    };
  }

  throw new Error(`Unsupported AI provider: ${resolvedModel.provider satisfies never}`);
}
