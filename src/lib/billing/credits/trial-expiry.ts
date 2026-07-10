// =============================================================
// Trial-credit-expiry (Fase 3-follow-up) — voltooit de reverse-trial-lifecycle.
//
// De trial-grant (A1) geeft TRIAL_CREDITS voor TRIAL_DAYS. Na afloop verlopen de
// resterende trial-credits. VEILIG-heuristiek: alleen orgs waarvan de trial
// verlopen is én die UITSLUITEND trial-credits kregen (`lifetimeGranted ===
// TRIAL_CREDITS` → nooit een top-up of plan-grant gehad) worden verlopen. Zodra
// iemand heeft bijgekocht of een abonnement heeft, is `lifetimeGranted` hoger en
// blijft het saldo staan — betaalde credits verlopen dus nooit.
//
// Het nul-zetten gebeurt atomisch (SELECT … FOR UPDATE binnen een transactie),
// zodat een concurrent spend niet tussen lezen en verlopen valt en het saldo
// nooit negatief kan gaan. Draait als dagelijkse cron (/api/cron/expire-trials).
// =============================================================

import { prisma } from '@/lib/prisma';
import { TRIAL_CREDITS } from '@/lib/constants/plan-limits';

export async function expireTrialCredits(): Promise<number> {
  const now = new Date();

  const candidates = await prisma.creditBalance.findMany({
    where: {
      lifetimeGranted: TRIAL_CREDITS, // enkel de trial-bundel, niets bijgekocht/abonnement
      balance: { gt: 0 },
      organization: { trialEndsAt: { lt: now }, unlimitedCredits: false },
    },
    select: { organizationId: true },
  });

  let expired = 0;
  for (const { organizationId } of candidates) {
    try {
      const zeroed = await prisma.$transaction(async (tx) => {
        // Row-lock: een concurrent deduct wacht tot deze tx klaar is, dus we zetten
        // exact het huidige saldo op 0 (nooit een stale bedrag → nooit negatief).
        const rows = await tx.$queryRaw<{ balance: number }[]>`
          SELECT balance FROM credit_balance WHERE "organizationId" = ${organizationId} FOR UPDATE`;
        const cur = rows[0] ? Number(rows[0].balance) : 0;
        if (cur <= 0) return 0;

        await tx.$executeRaw`
          UPDATE credit_balance
          SET balance = 0,
              "lifetimeSpent" = "lifetimeSpent" + ${cur},
              "updatedAt" = now()
          WHERE "organizationId" = ${organizationId}`;

        await tx.creditTransaction.create({
          data: {
            organizationId,
            amount: -cur,
            type: 'EXPIRY',
            reason: 'Trial-credits verlopen (28-daagse trial)',
            balanceAfter: 0,
          },
        });
        return cur;
      });
      if (zeroed > 0) expired++;
    } catch (e) {
      console.warn('[trial-expiry] expiry failed for org', {
        organizationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return expired;
}
