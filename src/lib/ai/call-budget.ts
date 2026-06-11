// =============================================================
// Shared AI call-budget helper
//
// Koppelt het output-token-budget aan de request-timeout zodat de
// twee nooit uit sync raken. Bron: gotcha 2026-05-24 — "token-budget
// en timeout MOETEN samen gemodelleerd worden"; een vaste timeout
// naast een los maxTokens-getal breekt af zodra iemand het budget
// verhoogt zonder de timeout mee te schalen (of andersom).
// =============================================================

/** Combined output-token budget and matching request timeout for one AI call. */
export interface CallBudget {
  maxTokens: number;
  timeoutMs: number;
}

/**
 * Derives a request timeout from an output-token budget.
 *
 * Rule of thumb (gotcha 2026-05-24): slow models generate at roughly 10ms
 * per output token, so `timeout = maxTokens × 10ms + baseMs`. The base
 * (default 30s) absorbs network latency, queueing and time-to-first-token.
 * Note: above Anthropic's 10-minute hard limit on non-streaming requests
 * a streaming call is required regardless of this timeout.
 */
export function timeoutForTokens(maxTokens: number, baseMs = 30_000): number {
  return maxTokens * 10 + baseMs;
}

/**
 * Resolves a {@link CallBudget} from an output-token budget via the
 * {@link timeoutForTokens} rule of thumb, so call-sites configure one
 * number and get a consistent `{ maxTokens, timeoutMs }` pair.
 */
export function resolveCallBudget(maxTokens: number, baseMs = 30_000): CallBudget {
  return { maxTokens, timeoutMs: timeoutForTokens(maxTokens, baseMs) };
}
