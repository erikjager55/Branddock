// =============================================================
// Auto-topup — optimistisch credits bijkopen bij een tekort (Fase 5a-invulling
// van de Fase-3-scaffolding).
//
// SEPA-incasso's settelen pas na dagen; daarom kent de charge de credits
// OPTIMISTISCH toe (de generatie kan direct door) met idempotencyKey
// `topup:<pi.id>` — exact de key die de payment_intent.succeeded-webhook ook
// gebruikt, dus de latere bevestiging dubbel-grant nooit. Faalt de incasso
// (payment_intent.payment_failed), dan draait `handleTopupFailure` (topup.ts)
// de optimistische grant terug. Het blootstellingsplafond begrenst de som van
// nog-onbevestigde optimistische credits (transaction-metadata
// optimistic:true zonder settled:true).
//
// Fail-soft by design: elke fout hier betekent "niet bijgekocht" —
// enforceCreditBalance valt dan gewoon terug op de 402.
// =============================================================

import { prisma } from '@/lib/prisma';
import { grantCredits } from './ledger';
import { getStripeClient } from '@/lib/stripe/client';
import { STRIPE_CURRENCY } from '@/lib/stripe/config';
import { getTopupPack } from '@/lib/stripe/topup';
import { notifyAutoTopup } from './auto-topup-notify';

export interface AutoTopupResult {
  /** Is er daadwerkelijk bijgekocht (saldo verhoogd)? */
  topped: boolean;
  /** Waarom niet: disabled | no-mandate | no-pack | over-cap | charge-failed. */
  reason?: string;
  grantedCredits?: number;
}

/** Som van optimistisch toegekende, nog niet door Stripe bevestigde credits. */
async function unsettledOptimisticCredits(organizationId: string): Promise<number> {
  // De settled-check gebeurt in JS: een SQL `NOT (metadata->settled = true)`
  // matcht rijen zonder de key níet (JSON-NULL-semantiek) — precies de rijen
  // die we willen meetellen. Optimistische rijen per org zijn er hooguit een
  // handvol, dus dit is goedkoop.
  // 90-dagen-venster: SEPA settelt < ~14 dagen; dit begrenst de scan terwijl
  // een hangende PI ruim binnen het venster blijft meetellen (review-M2).
  const rows = await prisma.creditTransaction.findMany({
    where: {
      organizationId,
      type: 'TOPUP',
      metadata: { path: ['optimistic'], equals: true },
      createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
    },
    select: { amount: true, metadata: true },
  });
  return rows.reduce((sum, r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    if (meta.settled === true) return sum;
    return sum + Math.max(0, r.amount);
  }, 0);
}

/**
 * Probeert bij een tekort een pack optimistisch toe te kennen tegen het
 * SEPA-mandaat. Retourneert `{ topped: true }` alleen als de credits
 * daadwerkelijk zijn bijgeschreven.
 */
export async function maybeAutoTopup(
  organizationId: string,
  shortfall: number,
): Promise<AutoTopupResult> {
  if (shortfall <= 0) return { topped: false, reason: 'no-shortfall' };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      autoTopupEnabled: true,
      autoTopupPackId: true,
      autoTopupExposureCap: true,
      sepaMandateStatus: true,
      sepaPaymentMethodId: true,
    },
  });

  if (!org?.autoTopupEnabled) return { topped: false, reason: 'disabled' };
  // Fail-closed: alleen een expliciet 'active' mandaat mag off-session chargen.
  if (org.sepaMandateStatus !== 'active' || !org.sepaPaymentMethodId) {
    return { topped: false, reason: 'no-mandate' };
  }

  const pack = org.autoTopupPackId ? getTopupPack(org.autoTopupPackId) : null;
  if (!pack) return { topped: false, reason: 'no-pack' };

  // (1) Blootstellingsplafond: nooit meer onbevestigde optimistische credits
  // uit laten staan dan de cap — begrenst het verlies bij falende incasso's.
  // BEKEND-GEACCEPTEERD (review-W2): twee gelijktijdige tekort-requests kunnen
  // de check allebei passeren (race) → tijdelijk tot cap+pack outstanding en
  // een dubbele incasso voor één tekort-moment. Mitigatie-lagen: de
  // failure-kill-switch (topup.ts) stopt cycli, en het venster is ~1s bij een
  // toch al zeldzame samenloop. Serialiseren (advisory-lock om check+charge)
  // kan bij het topup-enable-moment alsnog, zie task-file.
  const outstanding = await unsettledOptimisticCredits(organizationId);
  if (outstanding + pack.credits > org.autoTopupExposureCap) {
    return { topped: false, reason: 'over-cap' };
  }

  try {
    // (2) Off-session charge tegen het mandaat. De customer hoort bij het
    // PaymentMethod (per-workspace Stripe-customer) — lees hem daarvandaan.
    const stripe = getStripeClient();
    const pm = await stripe.paymentMethods.retrieve(org.sepaPaymentMethodId);
    const customerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (!customerId) return { topped: false, reason: 'no-mandate' };

    const meta: Record<string, string> = {
      type: 'credit_topup',
      optimistic: 'true',
      organizationId,
      credits: String(pack.credits),
      packId: pack.id,
    };
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(pack.priceEur * 100),
      currency: STRIPE_CURRENCY,
      customer: customerId,
      payment_method: org.sepaPaymentMethodId,
      payment_method_types: ['sepa_debit'],
      off_session: true,
      confirm: true,
      metadata: meta,
      description: `Branddock auto-topup — ${pack.credits} credits`,
    });

    // (3) Optimistische grant — zelfde idempotencyKey als de succeeded-webhook,
    // dus de bevestiging (dagen later) grant nooit dubbel.
    await grantCredits({
      organizationId,
      credits: pack.credits,
      type: 'TOPUP',
      reason: `Auto-topup ${pack.credits} credits (pack ${pack.id}, optimistisch)`,
      idempotencyKey: `topup:${pi.id}`,
      metadata: { paymentIntentId: pi.id, packId: pack.id, optimistic: true },
    });

    // (4) Notificatie — fire-and-forget, mag de generatie nooit ophouden.
    void notifyAutoTopup({ organizationId, credits: pack.credits, priceEur: pack.priceEur }).catch(
      () => {},
    );

    return { topped: true, grantedCredits: pack.credits };
  } catch (error) {
    // Money-code: charge-fouten altijd zichtbaar loggen (geen stille catch).
    console.warn('[maybeAutoTopup] off-session charge failed', {
      organizationId,
      packId: pack.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { topped: false, reason: 'charge-failed' };
  }
}
