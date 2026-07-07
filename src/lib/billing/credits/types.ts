// =============================================================
// Credit-ledger domein-types (ADR 2026-07-07-pricing-credits-launch)
//
// Fase 0 legt de contracten vast; het gedrag (deduct/grant/reserve/reconcile)
// wordt in Fase 1 geïmplementeerd op deze shapes (integration-first).
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
}

/** Toekenning (trial/plan/topup/refund). */
export interface GrantParams {
  organizationId: string;
  credits: number;
  type: Extract<CreditTransactionType, 'TRIAL_GRANT' | 'PLAN_GRANT' | 'TOPUP' | 'REFUND'>;
  reason: string;
  metadata?: Record<string, unknown>;
}

/** Pre-flight reservering vóór een dure run (voorkomt mid-run afkap). */
export interface ReserveParams {
  organizationId: string;
  workspaceId?: string;
  credits: number;
  reason: string;
}

/** Handle om een reservering later te reconcileren tegen het werkelijke verbruik. */
export interface ReservationHandle {
  reservationId: string;
  reserved: number;
}

/** Uitkomst van een balans-check vóór een run. */
export interface BalanceCheck {
  available: number;
  required: number;
  sufficient: boolean;
}
