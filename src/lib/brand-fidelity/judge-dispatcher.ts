// ============================================================
// Judge dispatcher — cross-family rotatie voor pijler 2 G-Eval
//
// Cross-family principe (geleerd in week 1 drift-meting):
//  - Generator Claude (Opus/Sonnet) → Judge OpenAI (GPT-5.6)
//  - Generator OpenAI (GPT-5.x) → Judge Anthropic (Claude Sonnet 5)
//
// Judge-refresh 2026-07-21 (fase 2 model-review): gpt-5→gpt-5.6 en
// sonnet-4-6→sonnet-5 na gepaarde kalibratie op 10-teksten-corpus
// (scripts/experiments/judge-calibration-2026-07.ts): composite-effect
// +0.5 (openai) / -1.8 (anthropic) — binnen de ±2-band, drempels
// ongewijzigd. Sonnet 5 discrimineert AI-slop scherper (-18) bij
// vrijwel gelijke on-brand-scores.
//  - Generator Google (Gemini)        → Judge OpenAI of Anthropic
//
// Dezelfde-family judges hebben blinde vlekken voor patronen die ze
// zelf produceren. Cross-family vermindert self-preference bias.
//
// Eén JSON call per output dat alle 6 dimensies dekt — goedkoper dan
// per-dimensie call, en de rubric-prompt instrueert expliciete
// onafhankelijke beoordeling.
// ============================================================

import {
  G_EVAL_SYSTEM_PROMPT,
  buildRubricUserPrompt,
  normalizeRubricResponse,
  type GEvalResult,
  type GEvalDimension,
  type RubricPromptContext,
} from './g-eval-rubric';

// ─── Cross-family rotatie ─────────────────────────

export type GeneratorProvider = 'anthropic' | 'openai' | 'google';

interface JudgeChoice {
  provider: 'openai' | 'anthropic';
  model: string;
}

/**
 * Pick a judge provider/model that is NOT in the same family as the
 * generator. Defensive defaults — kan via FidelityConfig.judgeOverride
 * worden overruled per workspace.
 */
export function pickCrossFamilyJudge(generator: GeneratorProvider): JudgeChoice {
  switch (generator) {
    case 'anthropic':
      return { provider: 'openai', model: 'gpt-5.6' };
    case 'openai':
      return { provider: 'anthropic', model: 'claude-sonnet-5' };
    case 'google':
      // Google generator → either OpenAI or Anthropic; default to OpenAI
      return { provider: 'openai', model: 'gpt-5.6' };
  }
}

// ─── Judge call ──────────────────────────────────

interface JudgeCallOptions {
  generatorProvider: GeneratorProvider;
  /** Override default cross-family choice (e.g., for testing) */
  judgeOverride?: JudgeChoice;
  /** Per-workspace rubric weight overrides */
  rubricWeights?: Partial<Record<GEvalDimension, number>>;
  /** Target word count for length-control */
  targetWordCount: number;
}

/**
 * Run the G-Eval rubric judge against generated content.
 *
 * Cross-family rotation is applied automatically based on
 * generatorProvider, unless judgeOverride is supplied.
 */
export async function runRubricJudge(
  ctx: RubricPromptContext,
  opts: JudgeCallOptions,
): Promise<GEvalResult> {
  const judge = opts.judgeOverride ?? pickCrossFamilyJudge(opts.generatorProvider);
  const userPrompt = buildRubricUserPrompt(ctx);

  let rawResponse: unknown;
  if (judge.provider === 'openai') {
    rawResponse = await callOpenAiJudge(judge.model, G_EVAL_SYSTEM_PROMPT, userPrompt);
  } else {
    rawResponse = await callAnthropicJudge(judge.model, G_EVAL_SYSTEM_PROMPT, userPrompt);
  }

  return normalizeRubricResponse(rawResponse, {
    judgeProvider: judge.provider,
    judgeModel: judge.model,
    actualWordCount: ctx.contentText.split(/\s+/).filter(Boolean).length,
    targetWordCount: opts.targetWordCount,
    rubricWeights: opts.rubricWeights,
  });
}

// ─── Provider-specifieke calls ────────────────────

async function callOpenAiJudge(model: string, systemPrompt: string, userPrompt: string): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured for G-Eval judge');
  }
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 8000, // GPT-5 reasoning tokens count toward this
    reasoning_effort: 'low' as never, // judging isn't reasoning-heavy
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text || text.trim() === '') {
    const finishReason = response.choices[0]?.finish_reason;
    throw new Error(`Judge returned empty content (model=${model}, finish_reason=${finishReason})`);
  }
  return JSON.parse(text);
}

async function callAnthropicJudge(model: string, systemPrompt: string, userPrompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured for G-Eval judge');
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON, no markdown fence, no preamble.',
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || !('text' in block)) {
    throw new Error(
      `Anthropic judge returned no text block (model=${model}, stop_reason=${response.stop_reason})`,
    );
  }
  // Strip optional markdown fence if Claude includes one despite instructions
  const cleaned = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
}
