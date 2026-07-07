// =============================================================
// Credit-reservering (ADR 2026-07-07-pricing-credits-launch, D7)
//
// Pre-flight-reserveringspatroon: reserveer de geSCHATte kost vóór een run,
// reconcileer naar het WERKELIJKE output-token-verbruik na completion — kap
// nooit mid-run af (de output is al gemaakt). Een reservering heeft een id +
// status zodat een gefaalde run 'm vrijgeeft (geen credit-lek bij crash).
// =============================================================

import { prisma } from '@/lib/prisma';
import { tokensToCredits } from './credit-costs';
import { InsufficientCreditsError } from './errors';
import type { ReserveContext, ReservationResult, ReconcileParams, ReconcileResult } from './types';

/**
 * Reserveer credits vóór een dure run. Verhoogt `reserved` atomisch als
 * `balance - reserved >= estimate`; anders InsufficientCreditsError. Idempotent
 * via idempotencyKey.
 */
export async function reserveCredits(
  organizationId: string,
  estimatedCredits: number,
  ctx: ReserveContext = {},
): Promise<ReservationResult> {
  const estimate = Math.max(0, Math.ceil(estimatedCredits));
  return prisma.$transaction(async (tx) => {
    if (ctx.idempotencyKey) {
      const existing = await tx.creditReservation.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (existing) return { reservationId: existing.id, reserved: existing.estimatedCredits };
    }
    if (estimate > 0) {
      const rows = await tx.$queryRaw<{ reserved: number }[]>`
        UPDATE credit_balance
        SET reserved = reserved + ${estimate}, "updatedAt" = now()
        WHERE "organizationId" = ${organizationId} AND balance - reserved >= ${estimate}
        RETURNING reserved`;
      if (rows.length === 0) {
        const bal = await tx.creditBalance.findUnique({ where: { organizationId } });
        const available = bal ? bal.balance - bal.reserved : 0;
        throw new InsufficientCreditsError(organizationId, estimate, available);
      }
    }
    const res = await tx.creditReservation.create({
      data: {
        organizationId,
        workspaceId: ctx.workspaceId,
        estimatedCredits: estimate,
        action: ctx.action,
        feature: ctx.feature,
        idempotencyKey: ctx.idempotencyKey,
        status: 'RESERVED',
      },
    });
    return { reservationId: res.id, reserved: estimate };
  });
}

/**
 * Reconcileer een reservering naar het werkelijke verbruik: geef de reservering
 * vrij en boek het werkelijke aantal credits af. Idempotent (skip als de
 * reservering niet meer RESERVED is). Kapt nooit af — het saldo mag dalen.
 */
export async function reconcileReservation(
  reservationId: string,
  params: ReconcileParams = {},
): Promise<ReconcileResult> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.creditReservation.findUnique({ where: { id: reservationId } });
    if (!res || res.status !== 'RESERVED') {
      const bal = res ? await tx.creditBalance.findUnique({ where: { organizationId: res.organizationId } }) : null;
      return { creditsSpent: 0, balanceAfter: bal?.balance ?? 0 };
    }
    const actual = resolveActual(params, res.estimatedCredits);
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE credit_balance
      SET reserved = GREATEST(0, reserved - ${res.estimatedCredits}),
          balance = balance - ${actual},
          "lifetimeSpent" = "lifetimeSpent" + ${actual},
          "updatedAt" = now()
      WHERE "organizationId" = ${res.organizationId}
      RETURNING balance`;
    const balanceAfter = rows.length ? Number(rows[0].balance) : 0;
    await tx.creditReservation.update({ where: { id: reservationId }, data: { status: 'SETTLED' } });
    if (actual > 0) {
      await tx.creditTransaction.create({
        data: {
          organizationId: res.organizationId,
          workspaceId: res.workspaceId,
          amount: -actual,
          type: 'RECONCILE',
          reason: `reconcile ${res.action ?? 'run'}`,
          action: res.action,
          feature: res.feature,
          outputTokens: params.outputTokens,
          balanceAfter,
        },
      });
    }
    return { creditsSpent: actual, balanceAfter };
  });
}

/** Geef een reservering vrij (run gefaald/geannuleerd). Idempotent — geen dubbele vrijgave. */
export async function releaseReservation(reservationId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const res = await tx.creditReservation.findUnique({ where: { id: reservationId } });
    if (!res || res.status !== 'RESERVED') return;
    if (res.estimatedCredits > 0) {
      await tx.$executeRaw`
        UPDATE credit_balance
        SET reserved = GREATEST(0, reserved - ${res.estimatedCredits}), "updatedAt" = now()
        WHERE "organizationId" = ${res.organizationId}`;
    }
    await tx.creditReservation.update({ where: { id: reservationId }, data: { status: 'RELEASED' } });
  });
}

/** Werkelijke credits: expliciet meegegeven → tekst-output-tokens → anders de schatting. */
function resolveActual(params: ReconcileParams, estimate: number): number {
  if (typeof params.actualCredits === 'number') return Math.max(0, Math.ceil(params.actualCredits));
  if (typeof params.outputTokens === 'number') return tokensToCredits(params.outputTokens, params.model ?? 'default');
  return estimate;
}
