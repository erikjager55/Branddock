// =============================================================
// Credit top-up — prepaid pack-aankoop (Fase 3, Gate A3).
//
// Server-side prijs uit TOPUP_PACKS (NOOIT uit de client — H3-patroon uit
// one-time.ts): createTopupCheckout maakt een Stripe Checkout-sessie (mode:
// payment) met `type: 'credit_topup'`-metadata op de PaymentIntent; de webhook
// (payment_intent.succeeded → handleTopupSuccess) kent de credits toe via
// grantCredits('TOPUP'), idempotent per PaymentIntent. Credits zijn org-pooled.
//
// Auto-topup (optimistisch tegen een SEPA-mandaat) is Fase 5.
// =============================================================

import type Stripe from 'stripe';
import { getStripeClient } from './client';
import { STRIPE_CURRENCY, getCheckoutUrls } from './config';
import { getOrCreateCustomer } from './customer';
import { isCreditsEnabled, isTopupEnabled } from './feature-flags';
import { TOPUP_PACKS } from '@/lib/constants/plan-limits';
import { grantCredits, deductCredits } from '@/lib/billing/credits/ledger';
import { prisma } from '@/lib/prisma';

export interface TopupPack {
  id: string; // stabiele identifier = het credits-aantal als string
  credits: number;
  priceEur: number;
  discountPct: number;
}

/** Pack uit de catalogus op id (= credits-aantal). Server-side bron van waarheid. */
export function getTopupPack(packId: string): TopupPack | null {
  const pack = TOPUP_PACKS.find((p) => String(p.credits) === packId);
  return pack ? { id: String(pack.credits), ...pack } : null;
}

/** Volledige pack-catalogus (voor de top-up-UI). */
export function listTopupPacks(): TopupPack[] {
  return TOPUP_PACKS.map((p) => ({ id: String(p.credits), ...p }));
}

export interface CreateTopupCheckoutParams {
  organizationId: string;
  workspaceId: string;
  packId: string;
  baseUrl: string;
}

/**
 * Maakt een Stripe Checkout-sessie (mode: payment) voor een credit-pack en geeft
 * de redirect-URL terug — spiegel van de subscription-checkout. De credit_topup-
 * metadata gaat via `payment_intent_data.metadata` mee op de PaymentIntent, zodat
 * de bestaande `handleTopupSuccess`-webhook (payment_intent.succeeded) de credits
 * toekent. Prijs server-side uit de pack-catalogus.
 */
export async function createTopupCheckout(params: CreateTopupCheckoutParams): Promise<{ url: string }> {
  if (!isCreditsEnabled()) throw new Error('Credits zijn niet ingeschakeld');
  // Pilotfase: credits kunnen aan staan terwijl de betaling nog niet gekoppeld is.
  if (!isTopupEnabled()) throw new Error('Credits kopen is nog niet beschikbaar');
  const pack = getTopupPack(params.packId);
  if (!pack) throw new Error('Onbekend top-up-pack');

  const stripe = getStripeClient();
  const customerId = await getOrCreateCustomer(params.workspaceId);
  const urls = getCheckoutUrls(params.baseUrl);
  const meta: Record<string, string> = {
    type: 'credit_topup',
    organizationId: params.organizationId,
    workspaceId: params.workspaceId,
    credits: String(pack.credits),
    packId: pack.id,
  };

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    // iDEAL naast kaart (Fase 5a, ADR D10) — de NL-norm voor losse betalingen.
    // Bewust géén sepa_debit voor one-offs: een incasso settelt pas na dagen
    // en de webhook-grant zou de credits dagenlang laten "hangen".
    payment_method_types: ['card', 'ideal'],
    currency: STRIPE_CURRENCY,
    line_items: [
      {
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: { name: `Branddock credit top-up — ${pack.credits} credits` },
          unit_amount: Math.round(pack.priceEur * 100),
        },
        quantity: 1,
      },
    ],
    success_url: urls.success,
    cancel_url: urls.cancel,
    metadata: meta,
    payment_intent_data: { metadata: meta },
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url };
}

/**
 * Webhook: succesvolle top-up-betaling → credits toekennen. Idempotent per
 * PaymentIntent (grantCredits-key `topup:<pi.id>`), zodat een event-retry niet
 * dubbel toekent (naast de event-idempotentie via ProcessedStripeEvent).
 */
export async function handleTopupSuccess(pi: Stripe.PaymentIntent): Promise<void> {
  const organizationId = pi.metadata?.organizationId;
  const credits = Number(pi.metadata?.credits ?? 0);
  const packId = pi.metadata?.packId;
  if (!organizationId || !Number.isFinite(credits) || credits <= 0) return;

  await grantCredits({
    organizationId,
    credits,
    type: 'TOPUP',
    reason: `Top-up ${credits} credits (pack ${packId ?? '?'})`,
    idempotencyKey: `topup:${pi.id}`,
    metadata: { paymentIntentId: pi.id, packId: packId ?? null },
  });

  // Auto-topup (Fase 5a): een optimistische grant bestond al onder dezelfde
  // idempotencyKey — markeer hem als door Stripe bevestigd zodat hij niet
  // meer meetelt in het blootstellingsplafond.
  if (pi.metadata?.optimistic === 'true') {
    await prisma.creditTransaction.updateMany({
      where: { idempotencyKey: `topup:${pi.id}` },
      data: { metadata: { paymentIntentId: pi.id, packId: packId ?? null, optimistic: true, settled: true } },
    });
  }
}

/**
 * Webhook: gefaalde (auto-)top-up-incasso → draai een optimistische grant
 * terug. Idempotent via de reversal-key; alleen relevant voor optimistische
 * auto-topups (een gewone Checkout-topup grant pas op succeeded, dus daar
 * valt niets terug te draaien). Force-deduct: het saldo mag hierdoor onder
 * nul — de org heeft de credits mogelijk al uitgegeven.
 */
export async function handleTopupFailure(pi: Stripe.PaymentIntent): Promise<void> {
  if (pi.metadata?.type !== 'credit_topup') return;
  if (pi.metadata?.optimistic !== 'true') return;
  const organizationId = pi.metadata?.organizationId;
  const credits = Number(pi.metadata?.credits ?? 0);
  if (!organizationId || !Number.isFinite(credits) || credits <= 0) return;

  // Alleen terugdraaien wat daadwerkelijk optimistisch is toegekend.
  const granted = await prisma.creditTransaction.findUnique({
    where: { idempotencyKey: `topup:${pi.id}` },
    select: { id: true, organizationId: true },
  });
  if (!granted) {
    // Race-tombstone (review-W3): faalt de incasso vóórdat onze optimistische
    // grant gecommit is, dan claimt deze 0-rij de idempotencyKey — de late
    // grant botst op de unique en kent dus nooit alsnog toe.
    await prisma.creditTransaction
      .create({
        data: {
          organizationId,
          amount: 0,
          type: 'TOPUP',
          reason: `Tombstone — incasso faalde vóór de optimistische grant (${pi.id})`,
          balanceAfter: (await prisma.creditBalance.findUnique({ where: { organizationId } }))?.balance ?? 0,
          idempotencyKey: `topup:${pi.id}`,
          metadata: { paymentIntentId: pi.id, optimistic: true, settled: true, reversed: true, tombstone: true },
        },
      })
      .catch(() => {}); // P2002 = de grant won de race → de deduct hieronder pakt hem
    const nowGranted = await prisma.creditTransaction.findUnique({
      where: { idempotencyKey: `topup:${pi.id}` },
      select: { amount: true },
    });
    if (!nowGranted || nowGranted.amount === 0) {
      await disableAutoTopupAfterFailure(organizationId, pi.id);
      return;
    }
  }

  await deductCredits({
    organizationId,
    credits,
    reason: `Auto-topup teruggedraaid — SEPA-incasso mislukt (${pi.id})`,
    force: true,
    idempotencyKey: `topup-reversal:${pi.id}`,
  });
  await prisma.creditTransaction.updateMany({
    where: { idempotencyKey: `topup:${pi.id}` },
    data: {
      metadata: {
        paymentIntentId: pi.id,
        packId: pi.metadata?.packId ?? null,
        credits,
        optimistic: true,
        settled: true,
        reversed: true,
      },
    },
  });

  // Kill-switch (review-W5): zonder backoff zou charge→fail→reversal→
  // cap-release een oneindige incasso-cyclus geven (herhaalde mislukte
  // afschrijvingen bij de bank). Eén failure zet auto-topup uit; een mens
  // (Settings → Billing) herstelt het mandaat en zet hem bewust weer aan.
  await disableAutoTopupAfterFailure(organizationId, pi.id);
}

async function disableAutoTopupAfterFailure(organizationId: string, piId: string): Promise<void> {
  const res = await prisma.organization.updateMany({
    where: { id: organizationId, autoTopupEnabled: true },
    data: { autoTopupEnabled: false },
  });
  if (res.count > 0) {
    console.warn('[handleTopupFailure] auto-topup uitgeschakeld na gefaalde incasso', {
      organizationId,
      paymentIntentId: piId,
    });
  }
}

/**
 * Webhook: dispute/chargeback of refund op een credit-top-up-charge (review-W1)
 * — een SEPA-incasso kan wéken na `succeeded` teruggeboekt worden
 * (bank-reclaim); dat arriveert als charge-event, nooit als payment_failed.
 * Zelfde idempotente reversal-key als het failure-pad; geldt óók voor gewone
 * Checkout-top-ups (geld weg = credits weg).
 */
export async function handleTopupDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  // Een Dispute draagt alleen het charge-id (geen metadata) — haal de charge op.
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return;
  const stripe = getStripeClient();
  const charge = await stripe.charges.retrieve(chargeId);
  await handleTopupChargeReversed(charge);
}

export async function handleTopupChargeReversed(charge: Stripe.Charge): Promise<void> {
  if (charge.metadata?.type !== 'credit_topup') return;
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  const organizationId = charge.metadata?.organizationId;
  const credits = Number(charge.metadata?.credits ?? 0);
  if (!piId || !organizationId || !Number.isFinite(credits) || credits <= 0) return;

  const granted = await prisma.creditTransaction.findUnique({
    where: { idempotencyKey: `topup:${piId}` },
    select: { id: true },
  });
  if (!granted) return;

  await deductCredits({
    organizationId,
    credits,
    reason: `Top-up teruggeboekt — dispute/refund op de betaling (${piId})`,
    force: true,
    idempotencyKey: `topup-reversal:${piId}`,
  });
  await prisma.creditTransaction.updateMany({
    where: { idempotencyKey: `topup:${piId}` },
    data: {
      metadata: {
        paymentIntentId: piId,
        packId: charge.metadata?.packId ?? null,
        credits,
        settled: true,
        reversed: true,
        chargeback: true,
      },
    },
  });
  await disableAutoTopupAfterFailure(organizationId, piId);
}
