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
// Draait als dagelijkse cron (/api/cron/expire-trials).
// =============================================================

import { prisma } from '@/lib/prisma';
import { deductCredits } from './ledger';
import { TRIAL_CREDITS } from '@/lib/constants/plan-limits';

export async function expireTrialCredits(): Promise<number> {
  const now = new Date();

  const balances = await prisma.creditBalance.findMany({
    where: {
      lifetimeGranted: TRIAL_CREDITS, // enkel de trial-bundel, niets bijgekocht/abonnement
      balance: { gt: 0 },
      organization: { trialEndsAt: { lt: now }, unlimitedCredits: false },
    },
    select: { organizationId: true, balance: true },
  });

  let expired = 0;
  for (const b of balances) {
    if (b.balance <= 0) continue;
    try {
      await deductCredits({
        organizationId: b.organizationId,
        credits: b.balance,
        type: 'EXPIRY',
        reason: 'Trial-credits verlopen (28-daagse trial)',
        force: true,
        idempotencyKey: `trial-expiry:${b.organizationId}`,
      });
      expired++;
    } catch (e) {
      console.warn('[trial-expiry] expiry failed for org', {
        organizationId: b.organizationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return expired;
}
