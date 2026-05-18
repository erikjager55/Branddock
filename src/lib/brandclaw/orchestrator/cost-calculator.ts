// =============================================================
// Brandclaw orchestrator — Anthropic cost-calculator (ADR 2026-05-08).
//
// Computeert per-run cost in USD op basis van input + output tokens
// × per-model pricing. Resultaat naar StrategyObservationRun.totalCostUsd
// (Decimal 10,6 — ondersteunt $0.000001 precisie).
//
// Pricing constants zijn hardcoded; bij Anthropic-pricing-wijziging
// updaten + log een gotcha. Future: read pricing van een config-bron
// (env-var of Workspace.aiConfig) zodat per-workspace overrides mogelijk
// worden.
//
// Cache-discount: Anthropic 5-min prompt-cache levert 90% korting op
// cached input-tokens. Voor v1 negeren we cache-hits (caller geeft niet
// door of input cached was). Future: cache_read_input_tokens uit
// response.usage gebruiken voor accurate kostenberekening.
// =============================================================

/**
 * Per-model pricing: USD per miljoen tokens. Updated 2026-05-08 vanaf
 * Anthropic pricing-pagina. Verifieer bij volgende migratie/pricing-shift.
 */
export const ANTHROPIC_PRICING_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  // Sonnet 4.6 — default voor Strategy Analyst (smart-en-snel balans).
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-6-20251001": { input: 3.0, output: 15.0 },
  // Opus 4.7 — voor toekomstige zware reasoning-runs (Optimization-node misschien).
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  // Haiku 4.5 — voor lichte sub-tools binnen agent-loop.
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};

/** Fallback pricing wanneer model niet in registry (Sonnet 4.6 defaults). */
const FALLBACK_PRICING = { input: 3.0, output: 15.0 };

export interface CostBreakdown {
  /** Totale USD-cost over alle turns. */
  totalUsd: number;
  /** Input-tokens contribution naar totalUsd. */
  inputCostUsd: number;
  /** Output-tokens contribution naar totalUsd. */
  outputCostUsd: number;
  /** Welk model gebruikt is — voor audit. */
  model: string;
  /** True wanneer fallback-pricing is gebruikt (model unknown). */
  fallback: boolean;
}

/**
 * Bereken cost voor een agent-loop run. Tokens accumuleren over alle
 * turns van Anthropic Messages-API response.usage.
 *
 * Precision: round naar 6 decimalen ($0.000001) — matched de Prisma
 * Decimal(10,6) schema precisie zodat geen rounding-mismatch is bij
 * persistentie.
 */
export function computeRunCost(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): CostBreakdown {
  const pricing =
    ANTHROPIC_PRICING_PER_M_TOKENS[input.model] ?? FALLBACK_PRICING;
  const fallback = !ANTHROPIC_PRICING_PER_M_TOKENS[input.model];

  const inputCostUsd = roundToDecimal(
    (input.inputTokens / 1_000_000) * pricing.input,
    6,
  );
  const outputCostUsd = roundToDecimal(
    (input.outputTokens / 1_000_000) * pricing.output,
    6,
  );
  const totalUsd = roundToDecimal(inputCostUsd + outputCostUsd, 6);

  return {
    totalUsd,
    inputCostUsd,
    outputCostUsd,
    model: input.model,
    fallback,
  };
}

function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
