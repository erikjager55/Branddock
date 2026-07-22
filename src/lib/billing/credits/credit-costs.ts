// =============================================================
// Credit-kosten-registry (ADR 2026-07-07-pricing-credits-launch)
//
// Twee lagen:
//  1. CREDIT_COSTS  — pre-flight per-actie-SCHATTING (wat de UI toont vóór een run).
//  2. tokensToCredits — lengte-accurate WERKELIJKE afboeking (alleen output-tokens).
//
// Merkcontext-input, F-VAL-scoring, chat, setup en exploratie kosten NOOIT
// credits (ZERO_COST_ACTIONS) — dat is de differentiator, expliciet + testbaar.
//
// De getallen zijn deels schatting (blended ~€0,045/credit COGS uit de ADR);
// dit bestand is de centrale plek zodat Fase 1/2 ze met echte metering-data
// kan bijstellen zonder code-spread.
// =============================================================

import type { CreditAction } from '@/types/billing';

/** Pre-flight-schatting per actie. Werkelijke tekst-afboeking loopt via tokensToCredits. */
export const CREDIT_COSTS: Record<CreditAction, number> = {
  short: 5,
  'long-form': 80,
  image: 2,
  // Stijlreferentie-beelden (AI Trainer / trained-style): 4K-output via het
  // Nano Banana /edit-pad met multi-ref. fal factureert per output-resolutie
  // (4K ≈ 2× 1K) en de multi-ref-call is zwaarder — bij 2 credits was de marge
  // ~0; 5 credits houdt de ADR-marge (2026-07-07) intact. Besluit 2026-07-22,
  // gedelegeerd door Erik ("maak hier een weloverwogen keuze").
  'image-4k': 5,
  'video-clip': 20,
  'agent-deliverable': 3,
};

/**
 * Acties die nooit credits kosten. Sleutels zijn de `action`/`feature`-labels die
 * de generatie-sites doorgeven; houd deze set in sync met de afboek-haken (Fase 2).
 */
export const ZERO_COST_ACTIONS: ReadonlySet<string> = new Set([
  'brand-context',
  'f-val',
  'fidelity',
  'chat',
  'brand-assistant',
  'persona-chat',
  'setup',
  'brand-analysis',
  'brandstyle',
  'exploration',
  'website-scan',
]);

export function isZeroCostAction(action: string): boolean {
  return ZERO_COST_ACTIONS.has(action);
}

/**
 * Credits per 1.000 output-tokens per model-familie (calibratie-tabel).
 * Gekalibreerd zodat een typische long-form (~25k output-tokens op Opus) ≈ de
 * 80-credit per-actie-schatting oplevert. Mirrort de structuur van
 * ANTHROPIC_PRICING_PER_M_TOKENS. Deels schatting — Fase 1/2 stelt dit bij.
 */
export const CREDITS_PER_1K_OUTPUT: Record<string, number> = {
  opus: 3,
  sonnet: 1,
  haiku: 0.4,
  default: 1,
};

function creditFamily(model: string): keyof typeof CREDITS_PER_1K_OUTPUT {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('sonnet')) return 'sonnet';
  return 'default';
}

/**
 * Lengte-accurate afboeking: output-tokens → credits. Naar boven afgerond,
 * minimaal 1 credit voor een niet-lege generatie. Alleen output telt — input
 * (merkcontext) en F-VAL blijven gratis.
 */
export function tokensToCredits(outputTokens: number, model = 'default'): number {
  if (outputTokens <= 0) return 0;
  const rate = CREDITS_PER_1K_OUTPUT[creditFamily(model)];
  return Math.max(1, Math.ceil((outputTokens / 1000) * rate));
}

/** Pre-flight-schatting voor een actie (of 0 als de actie gratis is). */
export function estimateCreditsForAction(action: CreditAction): number {
  return CREDIT_COSTS[action];
}
