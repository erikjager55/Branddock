// =============================================================
// L2 AI-Judge — dispatcher voor LLM call met retry + fallback
//
// Per spec sectie 5.1 + 5.2.1: Haiku 4.5 als small + fast judge,
// 2000 max_tokens, single attempt with retry (network + 5xx); on
// failure → L2JudgeFallback object zodat runner kan persistent met
// L1-only score. Geen exception propagation naar runner.
// =============================================================

import { anthropicClient } from '@/lib/ai/anthropic-client';
import { timeoutForTokens } from '@/lib/ai/call-budget';
import type { AdJudge, L2JudgeFallback, L2JudgeResult, ValidatorContext } from '../types';

const JUDGE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2000;
// Gekoppeld aan het token-budget (maxTokens × 10ms + 30s) — de oude vaste
// 5s stond los van de 2000 tokens en brak af vóór een vol oordeel kon landen.
const TIMEOUT_MS = timeoutForTokens(MAX_TOKENS);
const SYSTEM_PROMPT =
  'You are an ad quality judge. Output ONLY valid JSON matching the schema in the user prompt. Do not include markdown code-fences, prose, or explanations — just the raw JSON object.';

type FallbackReason = 'timeout' | 'api-error' | 'parse-error';

export async function runAdJudge(
  judge: AdJudge,
  ctx: ValidatorContext,
): Promise<L2JudgeResult> {
  let raw: string;
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
    raw = response.content.trim();
  } catch (err) {
    return buildFallback(err, isTimeoutError(err) ? 'timeout' : 'api-error');
  }

  try {
    // Strip markdown code-fences if model hedge-emit-ed them anyway.
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    return judge.parseResponse(cleaned);
  } catch (err) {
    return buildFallback(err, 'parse-error');
  }
}

/** Builds the L2JudgeFallback and logs the classified reason for diagnostics. */
function buildFallback(err: unknown, reason: FallbackReason): L2JudgeFallback {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("[ad-judge] L2 fallback", { reason, message });
  return { error: `[${reason}] ${message}`, fallback: true };
}

function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Anthropic SDK throws APIConnectionTimeoutError with "Request timed out.".
  return err.name === 'APIConnectionTimeoutError' || /timed?\s?out/i.test(err.message);
}
