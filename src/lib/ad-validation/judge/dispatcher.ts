// =============================================================
// L2 AI-Judge — dispatcher voor LLM call met retry + fallback
//
// Per spec sectie 5.1 + 5.2.1: Haiku 4.5 als small + fast judge,
// 2000 max_tokens, single attempt with retry (network + 5xx); on
// failure → L2JudgeFallback object zodat runner kan persistent met
// L1-only score. Geen exception propagation naar runner.
// =============================================================

import { anthropicClient } from '@/lib/ai/anthropic-client';
import type { AdJudge, L2JudgeResult, ValidatorContext } from '../types';

const JUDGE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2000;
const TIMEOUT_MS = 5000;
const SYSTEM_PROMPT =
  'You are an ad quality judge. Output ONLY valid JSON matching the schema in the user prompt. Do not include markdown code-fences, prose, or explanations — just the raw JSON object.';

export async function runAdJudge(
  judge: AdJudge,
  ctx: ValidatorContext,
): Promise<L2JudgeResult> {
  try {
    const userPrompt = judge.buildPrompt(ctx);
    const response = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        useCase: 'STRUCTURED',
        model: JUDGE_MODEL,
        maxTokens: MAX_TOKENS,
        timeoutMs: TIMEOUT_MS,
        temperature: 0.2,
      },
    );
    const raw = response.content.trim();
    // Strip markdown code-fences if model hedge-emit-ed them anyway.
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    return judge.parseResponse(cleaned);
  } catch (err) {
    return {
      error: (err as Error).message,
      fallback: true as const,
    };
  }
}
