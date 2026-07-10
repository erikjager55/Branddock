// =============================================================
// Credit-ledger core (ADR 2026-07-07-pricing-credits-launch)
//
// Transactionele mutaties op CreditBalance (pooled per Organization). Alle
// saldo-veranderingen lopen via een atomaire, conditionele UPDATE (row-lock via
// WHERE-guard + RETURNING) zodat gelijktijdige runs niet dubbel-boeken; elke
// mutatie schrijft een CreditTransaction met balanceAfter. Idempotent via
// idempotencyKey.
//
// Dun op de Prisma-tabellen — geen aparte "billing engine" (anti-abstraction).
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CreditBalanceSnapshot } from '@/types/billing';
import type { DeductParams, GrantParams } from './types';
import { InsufficientCreditsError } from './errors';

// De pg-adapter-client levert bij $transaction een tx die niet exact
// `Prisma.TransactionClient` is; leid het type af uit de client zelf.
type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

function snapshot(row: {
  organizationId: string;
  balance: number;
  reserved: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}): CreditBalanceSnapshot {
  return {
    organizationId: row.organizationId,
    balance: row.balance,
    reserved: row.reserved,
    available: row.balance - row.reserved,
    lifetimeGranted: row.lifetimeGranted,
    lifetimeSpent: row.lifetimeSpent,
  };
}

const ZERO = (organizationId: string): CreditBalanceSnapshot => ({
  organizationId,
  balance: 0,
  reserved: 0,
  available: 0,
  lifetimeGranted: 0,
  lifetimeSpent: 0,
});

async function getBalanceTx(tx: PrismaTx, organizationId: string): Promise<CreditBalanceSnapshot> {
  const row = await tx.creditBalance.findUnique({ where: { organizationId } });
  return row ? snapshot(row) : ZERO(organizationId);
}

/** Snapshot van het pooled saldo. Geen row → nullen. */
export async function getBalance(organizationId: string): Promise<CreditBalanceSnapshot> {
  const row = await prisma.creditBalance.findUnique({ where: { organizationId } });
  return row ? snapshot(row) : ZERO(organizationId);
}

/**
 * Ken credits toe (trial/plan/topup/refund). Idempotent via idempotencyKey.
 * Maakt de CreditBalance aan als die nog niet bestaat.
 */
export async function grantCredits(p: GrantParams): Promise<CreditBalanceSnapshot> {
  if (p.credits <= 0) return getBalance(p.organizationId);
  try {
    return await prisma.$transaction(async (tx) => {
      if (p.idempotencyKey) {
        const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
        if (existing) return getBalanceTx(tx, p.organizationId);
      }
      const bal = await tx.creditBalance.upsert({
        where: { organizationId: p.organizationId },
        create: {
          organizationId: p.organizationId,
          balance: p.credits,
          reserved: 0,
          lifetimeGranted: p.credits,
          lifetimeSpent: 0,
        },
        update: {
          balance: { increment: p.credits },
          lifetimeGranted: { increment: p.credits },
        },
      });
      await tx.creditTransaction.create({
        data: {
          organizationId: p.organizationId,
          amount: p.credits,
          type: p.type,
          reason: p.reason,
          balanceAfter: bal.balance,
          idempotencyKey: p.idempotencyKey,
          metadata: (p.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
      return snapshot(bal);
    });
  } catch (e) {
    // Concurrent grant met dezelfde idempotencyKey: de check-then-act (findUnique →
    // create) mist elkaar en de 2e transactie botst op de @unique idempotencyKey
    // (P2002). Die tx rolt VOLLEDIG terug — de dubbele increment wordt ongedaan
    // gemaakt, dus het saldo klopt (precies één keer opgehoogd). Behandel als
    // idempotent succes i.p.v. door te gooien.
    // Brede P2002-catch is hier veilig: de CreditBalance-upsert gebruikt native
    // ON CONFLICT (throwt niet op de organizationId-unique), dus de ENIGE unique die
    // in deze transactie een P2002 kan geven is de idempotencyKey op CreditTransaction.
    // (meta.target scopen is niet betrouwbaar met de pg-adapter — die is vaak leeg.)
    if (
      p.idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return getBalance(p.organizationId);
    }
    throw e;
  }
}

/**
 * Directe afboeking (post-hoc, zonder pre-flight reservering). Atomisch met een
 * guard tegen negatief saldo — gooit InsufficientCreditsError als het saldo niet
 * dekt. Idempotent via idempotencyKey.
 */
export async function deductCredits(
  p: DeductParams,
): Promise<{ creditsSpent: number; balanceAfter: number }> {
  if (p.credits <= 0) {
    const b = await getBalance(p.organizationId);
    return { creditsSpent: 0, balanceAfter: b.balance };
  }
  return prisma.$transaction(async (tx) => {
    if (p.idempotencyKey) {
      const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
      if (existing) return { creditsSpent: -existing.amount, balanceAfter: existing.balanceAfter };
    }
    // Pre-flight-guard (blokkeert overspend) tenzij force: post-hoc mag het saldo dalen.
    const guard = p.force ? Prisma.empty : Prisma.sql`AND balance >= ${p.credits}`;
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE credit_balance
      SET balance = balance - ${p.credits},
          "lifetimeSpent" = "lifetimeSpent" + ${p.credits},
          "updatedAt" = now()
      WHERE "organizationId" = ${p.organizationId} ${guard}
      RETURNING balance`;
    if (rows.length === 0) {
      // force + geen row = org zonder CreditBalance → niets af te boeken (skip).
      if (p.force) return { creditsSpent: 0, balanceAfter: 0 };
      const b = await getBalanceTx(tx, p.organizationId);
      throw new InsufficientCreditsError(p.organizationId, p.credits, b.available);
    }
    const balanceAfter = Number(rows[0].balance);
    await tx.creditTransaction.create({
      data: {
        organizationId: p.organizationId,
        workspaceId: p.workspaceId,
        amount: -p.credits,
        type: p.type ?? 'DEDUCT',
        reason: p.reason,
        feature: p.feature,
        action: p.action,
        outputTokens: p.outputTokens,
        balanceAfter,
        idempotencyKey: p.idempotencyKey,
      },
    });
    return { creditsSpent: p.credits, balanceAfter };
  });
}
