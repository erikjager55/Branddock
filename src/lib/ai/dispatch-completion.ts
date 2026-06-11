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
import { timeoutForTokens } from './call-budget';
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
// The old fixed buckets stay as floors (slow models need them); the
// token-coupled formula only ever extends, so budget raises can no
// longer outgrow a stale timeout.
const LONG_FORM_TIMEOUT_FLOOR_MS = 180_000;
const SHORT_FORM_TIMEOUT_FLOOR_MS = 60_000;

/**
 * Generate text content using the resolved provider/model.
 * Throws if the provider is unsupported or the call fails after retries.
 */
export async function dispatchTextCompletion(
  params: DispatchTextCompletionParams,
): Promise<DispatchTextCompletionResult> {
  const { resolvedModel, systemPrompt, userPrompt, temperature } = params;
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutFloor = maxTokens > DEFAULT_MAX_TOKENS
    ? LONG_FORM_TIMEOUT_FLOOR_MS
    : SHORT_FORM_TIMEOUT_FLOOR_MS;
  const timeoutMs = Math.max(timeoutForTokens(maxTokens), timeoutFloor);
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
