// =============================================================
// Trial-lifecycle (Fase 4, ADR 2026-07-07-pricing-credits-launch D8) —
// de 28-daagse no-card reverse-trial rondom de bestaande bouwstenen:
//   - trial-START ligt al in auth.ts/provisionNewUser (TRIAL_GRANT 300cr,
//     idempotencyKey `trial:<orgId>`, trialEndsAt = now + 28d);
//   - trial-EXPIRY (credits nul-zetten) ligt al in trial-expiry.ts (cron).
//
// Dit bestand levert het ontbrekende contract: de on-read trial-state
// (bewust GEEN status-veld dat een cron moet zetten — `trialEndsAt` +
// ledger-historie zijn de bron, dus nooit stale) en de read-only-lock:
// een verlopen trial zonder betaal-historie blokkeert muterende/generatieve
// acties met een nette 402, maar wist of verbergt NOOIT merk-data.
//
// Lock-lift is impliciet: élke top-up of plan-grant verhoogt
// `lifetimeGranted` boven TRIAL_CREDITS (org-niveau, ledger = audit-trail),
// en een actieve betaalde subscription of unlimited-comp telt ook —
// er is geen aparte "unlock"-write nodig.
// =============================================================

import { prisma } from '@/lib/prisma';
import { TRIAL_CREDITS } from '@/lib/constants/plan-limits';
import { isCreditsEnabled } from '@/lib/stripe/feature-flags';
import { isOrgUnlimited } from './exempt';
import { getBalance } from './ledger';

export interface TrialState {
  /** Trial loopt nog (trialEndsAt in de toekomst, geen betaal-historie). */
  isTrialing: boolean;
  /** Hele dagen tot trialEndsAt (0 als verlopen of geen trial). */
  daysRemaining: number;
  /** Verlopen trial zonder conversie → muterende/generatieve acties dicht. */
  isLocked: boolean;
  /** Beschikbaar saldo (balance − reserved). */
  creditsRemaining: number;
}

/**
 * Heeft de org ooit iets anders dan de éénmalige trial-bundel gekregen?
 * `lifetimeGranted > TRIAL_CREDITS` dekt top-ups én plan-grants (ledger is
 * append-only); een actieve betaalde subscription telt ook — de eerste
 * maand-invoice (PLAN_GRANT) kan enkele minuten na activatie komen en de
 * lock mag dat gat niet als "verlopen" zien.
 */
function hasPaidHistory(args: {
  lifetimeGranted: number;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  if (args.lifetimeGranted > TRIAL_CREDITS) return true;
  return args.subscriptionStatus === 'ACTIVE' && args.stripeSubscriptionId !== null;
}

/**
 * On-read trial-state — het contract dat de balance-API/Fase-6-UI consumeert.
 * Credits-uit of unlimited-org → neutraal (geen trial, geen lock).
 */
export async function getTrialState(organizationId: string): Promise<TrialState> {
  const neutral: TrialState = {
    isTrialing: false,
    daysRemaining: 0,
    isLocked: false,
    creditsRemaining: 0,
  };
  if (!isCreditsEnabled()) return neutral;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      trialEndsAt: true,
      unlimitedCredits: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
    },
  });
  if (!org) return neutral;

  const balance = await getBalance(organizationId);
  const creditsRemaining = balance.available;

  if (org.unlimitedCredits || !org.trialEndsAt) {
    return { ...neutral, creditsRemaining };
  }

  const paid = hasPaidHistory({
    lifetimeGranted: balance.lifetimeGranted,
    subscriptionStatus: org.subscriptionStatus,
    stripeSubscriptionId: org.stripeSubscriptionId,
  });
  if (paid) return { ...neutral, creditsRemaining };

  const msLeft = org.trialEndsAt.getTime() - Date.now();
  if (msLeft > 0) {
    return {
      isTrialing: true,
      daysRemaining: Math.ceil(msLeft / 86_400_000),
      isLocked: false,
      creditsRemaining,
    };
  }
  return { isTrialing: false, daysRemaining: 0, isLocked: true, creditsRemaining };
}

/**
 * Route-guard-predicaat: verlopen trial zonder conversie. Zelfde
 * short-circuits als de metering (flag/unlimited → nooit locked).
 */
export async function isReadOnlyLocked(organizationId: string): Promise<boolean> {
  if (!isCreditsEnabled()) return false;
  if (await isOrgUnlimited(organizationId)) return false;
  const state = await getTrialState(organizationId);
  return state.isLocked;
}
