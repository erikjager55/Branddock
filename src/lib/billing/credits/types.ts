// =============================================================
// Credit-ledger domein-types (ADR 2026-07-07-pricing-credits-launch)
//
// De contracten die Fase 2 (generatie-sites) consumeert liggen hier vast.
// =============================================================

import type { CreditTransactionType, CreditAction } from '@/types/billing';

/** Afboeking bij een generatie (negatief effect op de balans). */
export interface DeductParams {
  organizationId: string;
  workspaceId?: string; // welk merk verbruikte (attributie)
  credits: number;
  action?: CreditAction | string;
  feature?: string;
  outputTokens?: number; // werkelijke output voor audit
  reason: string;
  idempotencyKey?: string; // voorkomt dubbel-boeken bij re-dispatch
  force?: boolean; // post-hoc: sla de saldo-guard over (output al gemaakt, saldo mag dalen)
}

/** Toekenning (trial/plan/topup/refund). */
export interface GrantParams {
  organizationId: string;
  credits: number;
  type: Extract<CreditTransactionType, 'TRIAL_GRANT' | 'PLAN_GRANT' | 'TOPUP' | 'REFUND'>;
  reason: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** Context bij een pre-flight reservering. */
export interface ReserveContext {
  workspaceId?: string;
  action?: CreditAction | string;
  feature?: string;
  reason?: string;
  idempotencyKey?: string;
}

/** Handle om een reservering later te reconcileren tegen het werkelijke verbruik. */
export interface ReservationResult {
  reservationId: string;
  reserved: number;
}

/**
 * Werkelijk verbruik bij reconcile. Geef óf outputTokens (tekst → tokensToCredits)
 * óf actualCredits (beeld/video: units × per-unit-kost, door de site berekend).
 * Beide leeg → val terug op de gereserveerde schatting.
 */
export interface ReconcileParams {
  outputTokens?: number;
  model?: string;
  actualCredits?: number;
}

export interface ReconcileResult {
  creditsSpent: number;
  balanceAfter: number;
}

/** Uitkomst van een balans-check vóór een run. */
export interface BalanceCheck {
  available: number;
  required: number;
  sufficient: boolean;
}
