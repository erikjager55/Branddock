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
    // Atomaire claim: de RESERVED→SETTLED-transitie is het serialisatie-punt.
    // Alleen de call die de rij claimt (RETURNING niet-leeg) raakt het saldo —
    // dat sluit een race met een tweede reconcile óf de reaper/release uit.
    const claimed = await tx.$queryRaw<
      { estimatedCredits: number; organizationId: string; workspaceId: string | null; action: string | null; feature: string | null }[]
    >`
      UPDATE credit_reservation
      SET status = 'SETTLED', "updatedAt" = now()
      WHERE id = ${reservationId} AND status = 'RESERVED'
      RETURNING "estimatedCredits", "organizationId", "workspaceId", action, feature`;
    if (claimed.length === 0) {
      // Al gereconcilieerd/vrijgegeven door een andere call — idempotent.
      const res = await tx.creditReservation.findUnique({
        where: { id: reservationId },
        select: { organizationId: true },
      });
      const bal = res ? await tx.creditBalance.findUnique({ where: { organizationId: res.organizationId } }) : null;
      return { creditsSpent: 0, balanceAfter: bal?.balance ?? 0 };
    }
    const r = claimed[0];
    const actual = resolveActual(params, r.estimatedCredits);
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE credit_balance
      SET reserved = GREATEST(0, reserved - ${r.estimatedCredits}),
          balance = balance - ${actual},
          "lifetimeSpent" = "lifetimeSpent" + ${actual},
          "updatedAt" = now()
      WHERE "organizationId" = ${r.organizationId}
      RETURNING balance`;
    const balanceAfter = rows.length ? Number(rows[0].balance) : 0;
    if (actual > 0) {
      await tx.creditTransaction.create({
        data: {
          organizationId: r.organizationId,
          workspaceId: r.workspaceId,
          amount: -actual,
          type: 'RECONCILE',
          reason: `reconcile ${r.action ?? 'run'}`,
          action: r.action,
          feature: r.feature,
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
    // Atomaire claim (zelfde patroon als reconcile): alleen de winnende call
    // geeft de earmark vrij — voorkomt dubbel-release bij reaper↔release-race.
    const claimed = await tx.$queryRaw<{ estimatedCredits: number; organizationId: string }[]>`
      UPDATE credit_reservation
      SET status = 'RELEASED', "updatedAt" = now()
      WHERE id = ${reservationId} AND status = 'RESERVED'
      RETURNING "estimatedCredits", "organizationId"`;
    if (claimed.length === 0) return; // al verwerkt — idempotent
    const r = claimed[0];
    if (r.estimatedCredits > 0) {
      await tx.$executeRaw`
        UPDATE credit_balance
        SET reserved = GREATEST(0, reserved - ${r.estimatedCredits}), "updatedAt" = now()
        WHERE "organizationId" = ${r.organizationId}`;
    }
  });
}

/**
 * Reaper: geef reserveringen vrij die langer dan `olderThanMinutes` RESERVED
 * bleven (gecrashte/gekilde run tussen reserve en reconcile). Voorkomt een
 * credit-lek waarbij `reserved` blijft hangen. Draait als RESERVATION_REAP-job.
 */
export async function reapStaleReservations(olderThanMinutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await prisma.creditReservation.findMany({
    where: { status: 'RESERVED', createdAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const r of stale) await releaseReservation(r.id);
  return stale.length;
}

/** Werkelijke credits: expliciet meegegeven → tekst-output-tokens → anders de schatting. */
function resolveActual(params: ReconcileParams, estimate: number): number {
  if (typeof params.actualCredits === 'number') return Math.max(0, Math.ceil(params.actualCredits));
  if (typeof params.outputTokens === 'number') return tokensToCredits(params.outputTokens, params.model ?? 'default');
  return estimate;
}
