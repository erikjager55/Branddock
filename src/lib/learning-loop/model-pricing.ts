/**
 * Model pricing table for AI cost attribution.
 *
 * Source: official provider pricing pages as of 2026-05-06. Prices are
 * USD per 1M tokens. Update whenever providers re-tier — this is a static
 * table, not fetched from an API.
 *
 * Used by the prompt-registry dashboard to estimate cost per
 * sourceIdentifier from `AICallTrace.responseMetadata.inputTokens` +
 * `outputTokens`. Not authoritative — invoice from the provider remains
 * the canonical cost source.
 */

export interface ModelPricing {
  /** USD per 1M input tokens */
  inputPer1M: number;
  /** USD per 1M output tokens */
  outputPer1M: number;
  /** Provider key as it appears in `AICallSnapshot.payload.model` strings */
  provider: 'anthropic' | 'openai' | 'google';
}

/**
 * Lookup keyed by case-insensitive substring match on the model name.
 * Order matters — first match wins, so put more specific keys before
 * less specific ones (e.g. "claude-opus-4-7" before "claude").
 */
const PRICING_TABLE: Array<{ match: string; pricing: ModelPricing }> = [
  // ── Anthropic ────────────────────────────────────────
  { match: 'claude-opus-4-7',     pricing: { provider: 'anthropic', inputPer1M: 15.00, outputPer1M: 75.00 } },
  { match: 'claude-opus-4-6',     pricing: { provider: 'anthropic', inputPer1M: 15.00, outputPer1M: 75.00 } },
  { match: 'claude-opus-4',       pricing: { provider: 'anthropic', inputPer1M: 15.00, outputPer1M: 75.00 } },
  { match: 'claude-sonnet-4-6',   pricing: { provider: 'anthropic', inputPer1M:  3.00, outputPer1M: 15.00 } },
  { match: 'claude-sonnet-4-5',   pricing: { provider: 'anthropic', inputPer1M:  3.00, outputPer1M: 15.00 } },
  { match: 'claude-sonnet-4',     pricing: { provider: 'anthropic', inputPer1M:  3.00, outputPer1M: 15.00 } },
  { match: 'claude-haiku-4-5',    pricing: { provider: 'anthropic', inputPer1M:  1.00, outputPer1M:  5.00 } },
  { match: 'claude-haiku',        pricing: { provider: 'anthropic', inputPer1M:  1.00, outputPer1M:  5.00 } },
  { match: 'claude-sonnet',       pricing: { provider: 'anthropic', inputPer1M:  3.00, outputPer1M: 15.00 } },
  { match: 'claude',              pricing: { provider: 'anthropic', inputPer1M:  3.00, outputPer1M: 15.00 } }, // fallback

  // ── OpenAI ───────────────────────────────────────────
  { match: 'gpt-5.4',             pricing: { provider: 'openai',    inputPer1M: 12.50, outputPer1M: 50.00 } },
  { match: 'gpt-5',               pricing: { provider: 'openai',    inputPer1M: 12.50, outputPer1M: 50.00 } },
  { match: 'gpt-4o-mini',         pricing: { provider: 'openai',    inputPer1M:  0.15, outputPer1M:  0.60 } },
  { match: 'gpt-4o',              pricing: { provider: 'openai',    inputPer1M:  2.50, outputPer1M: 10.00 } },
  { match: 'gpt-4',               pricing: { provider: 'openai',    inputPer1M: 30.00, outputPer1M: 60.00 } },
  { match: 'text-embedding-3-small', pricing: { provider: 'openai', inputPer1M:  0.02, outputPer1M:  0.00 } },
  { match: 'text-embedding-3-large', pricing: { provider: 'openai', inputPer1M:  0.13, outputPer1M:  0.00 } },

  // ── Google ───────────────────────────────────────────
  { match: 'gemini-3.1-pro-preview', pricing: { provider: 'google', inputPer1M:  1.25, outputPer1M:  5.00 } },
  { match: 'gemini-3.1-pro',      pricing: { provider: 'google',    inputPer1M:  1.25, outputPer1M:  5.00 } },
  { match: 'gemini-3.1-flash',    pricing: { provider: 'google',    inputPer1M:  0.075, outputPer1M:  0.30 } },
  { match: 'gemini-2.5-flash-lite', pricing: { provider: 'google',  inputPer1M:  0.05, outputPer1M:  0.20 } },
  { match: 'gemini-2.5-flash',    pricing: { provider: 'google',    inputPer1M:  0.075, outputPer1M:  0.30 } },
  { match: 'gemini',              pricing: { provider: 'google',    inputPer1M:  0.075, outputPer1M:  0.30 } }, // fallback
];

/**
 * Look up the pricing for a model identifier. Returns null when no match
 * exists — caller treats cost as unknown rather than zero.
 */
export function lookupModelPricing(modelId: string): ModelPricing | null {
  if (!modelId || typeof modelId !== 'string') return null;
  const lower = modelId.toLowerCase();
  for (const entry of PRICING_TABLE) {
    if (lower.includes(entry.match)) return entry.pricing;
  }
  return null;
}

/**
 * Compute USD cost given a model + token counts. Returns 0 when the model
 * is not in the pricing table — caller can treat 0 as "unknown" by also
 * checking lookupModelPricing first.
 */
export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = lookupModelPricing(modelId);
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}
