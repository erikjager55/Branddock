// =============================================================
// withCreditMetering — één wrapper voor credit-afboeking op generatie-sites
// (ADR 2026-07-07-pricing-credits-launch, Fase 2).
//
// Twee vormen:
//  - withCreditMetering(): pre-flight reserve → run → reconcile → release.
//    Voor route-boundary generatie; blokkeert bij tekort VÓÓR de run (nooit
//    mid-run — ADR D7).
//  - chargeAfter(): post-hoc afboeking zonder pre-flight block. Voor
//    background-jobs / plekken waar de generatie al gecommit is (saldo mag dalen).
//
// Gratis acties (ZERO_COST_ACTIONS: merkcontext, F-VAL, chat, setup, exploratie)
// en billing-uit → no-op. Eén patroon, overal hergebruikt (anti-leak).
// =============================================================

import { reserveCredits, reconcileReservation, releaseReservation } from './reservation';
import { deductCredits } from './ledger';
import { CREDIT_COSTS, isZeroCostAction, tokensToCredits } from './credit-costs';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { isOrgUnlimited } from './exempt';
import type { CreditAction } from '@/types/billing';

export interface MeterContext {
  organizationId?: string; // anders afgeleid uit workspaceId
  workspaceId?: string;
  action: CreditAction | string;
  feature?: string;
  idempotencyKey?: string;
}

export interface MeterOutcome {
  outputTokens?: number; // tekst → tokensToCredits
  model?: string;
  count?: number; // beeld/video → count × per-unit-kost
  actualCredits?: number; // expliciet, wint van de andere
}

function estimateFor(action: string): number {
  return CREDIT_COSTS[action as CreditAction] ?? 0;
}

function isFree(ctx: MeterContext): boolean {
  return isZeroCostAction(ctx.action) || (ctx.feature ? isZeroCostAction(ctx.feature) : false);
}

async function resolveOrg(ctx: MeterContext): Promise<string | null> {
  if (ctx.organizationId) return ctx.organizationId;
  if (ctx.workspaceId) return resolveOrgForWorkspace(ctx.workspaceId);
  return null;
}

/** Zet een outcome om in reconcile-params (expliciet > count > tokens). */
function toReconcile(action: string, o: MeterOutcome): { outputTokens?: number; model?: string; actualCredits?: number } {
  if (o.actualCredits != null) return { actualCredits: o.actualCredits };
  if (o.count != null) return { actualCredits: o.count * estimateFor(action) };
  return { outputTokens: o.outputTokens, model: o.model };
}

/**
 * Pre-flight reserve → run → reconcile → release. Reserveert de schatting uit de
 * registry, draait `fn`, reconcileert op het werkelijke verbruik (via `extract`),
 * en geeft de reservering vrij als `fn` throwt (geen credit-lek).
 */
export async function withCreditMetering<T>(
  ctx: MeterContext,
  fn: () => Promise<T>,
  extract: (result: T) => MeterOutcome,
): Promise<T> {
  if (!isBillingEnabled() || isFree(ctx)) return fn();
  const organizationId = await resolveOrg(ctx);
  if (!organizationId) return fn();
  if (await isOrgUnlimited(organizationId)) return fn(); // unlimited-free-org → nooit meteren

  const reservation = await reserveCredits(organizationId, estimateFor(ctx.action), {
    workspaceId: ctx.workspaceId,
    action: ctx.action,
    feature: ctx.feature,
    idempotencyKey: ctx.idempotencyKey,
  });
  let result: T;
  try {
    result = await fn();
  } catch (err) {
    await releaseReservation(reservation.reservationId).catch(() => {});
    throw err;
  }
  // Reconcile mag een geslaagde generatie nooit laten falen — de output bestaat al.
  try {
    await reconcileReservation(reservation.reservationId, toReconcile(ctx.action, extract(result)));
  } catch (e) {
    console.warn('[withCreditMetering] reconcile failed (swallowed)', {
      reservationId: reservation.reservationId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return result;
}

/**
 * Post-hoc afboeking (geen pre-flight block). Voor background-jobs of sites waar
 * de generatie al af is; het saldo mag dalen (force). Nooit blokkeren.
 */
export async function chargeAfter(ctx: MeterContext, outcome: MeterOutcome): Promise<void> {
  if (!isBillingEnabled() || isFree(ctx)) return;
  const organizationId = await resolveOrg(ctx);
  if (!organizationId) return;
  if (await isOrgUnlimited(organizationId)) return; // unlimited-free-org → nooit afboeken

  const r = toReconcile(ctx.action, outcome);
  const credits =
    r.actualCredits ?? (r.outputTokens != null ? tokensToCredits(r.outputTokens, r.model) : 0);
  if (credits <= 0) return;

  // Money-code: een verloren afboeking = gemiste omzet → altijd loggen (geen stille catch).
  try {
    await deductCredits({
      organizationId,
      workspaceId: ctx.workspaceId,
      credits,
      action: ctx.action,
      feature: ctx.feature,
      outputTokens: r.outputTokens,
      reason: `usage ${ctx.feature ?? ctx.action}`,
      force: true,
      idempotencyKey: ctx.idempotencyKey,
    });
  } catch (e) {
    console.warn('[chargeAfter] credit deduct failed (swallowed)', {
      organizationId,
      action: ctx.action,
      credits,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
