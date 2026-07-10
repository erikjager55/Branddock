// =============================================================
// Credit top-up — prepaid pack-aankoop (Fase 3, Gate A3).
//
// Server-side prijs uit TOPUP_PACKS (NOOIT uit de client — H3-patroon uit
// one-time.ts): een PaymentIntent met `type: 'credit_topup'`-metadata; de webhook
// (payment_intent.succeeded) kent de credits toe via grantCredits('TOPUP'),
// idempotent per PaymentIntent. Credits zijn org-pooled → grant op de org.
//
// Auto-topup (optimistisch tegen een SEPA-mandaat) is Fase 5 — hier alleen de
// handmatige pack-aankoop (iDEAL/kaart via de standaard PaymentIntent-flow).
// =============================================================

import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from './client';
import { STRIPE_CURRENCY, getCheckoutUrls } from './config';
import { getOrCreateCustomer } from './customer';
import { isBillingEnabled } from './feature-flags';
import { TOPUP_PACKS } from '@/lib/constants/plan-limits';
import { grantCredits } from '@/lib/billing/credits/ledger';

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

export interface CreateTopupParams {
  organizationId: string;
  workspaceId: string;
  userId: string;
  packId: string;
}

export interface TopupResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Maakt een PaymentIntent voor een prepaid credit-pack. Prijs server-side uit de
 * catalogus. Alleen bij billing-aan (zonder billing is de app gratis → geen top-up).
 */
export async function createTopupPayment(params: CreateTopupParams): Promise<TopupResult> {
  const { organizationId, workspaceId, userId, packId } = params;

  if (!isBillingEnabled()) {
    return { success: false, error: 'Top-up is niet beschikbaar wanneer billing uit staat.' };
  }
  const pack = getTopupPack(packId);
  if (!pack) return { success: false, error: 'Onbekend top-up-pack.' };

  try {
    const stripeCustomerId = await resolveOrgStripeCustomer(organizationId, workspaceId);
    const stripe = getStripeClient();
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(pack.priceEur * 100), // euro → cents
      currency: STRIPE_CURRENCY,
      customer: stripeCustomerId,
      description: `Branddock credit top-up: ${pack.credits} credits`,
      metadata: {
        type: 'credit_topup',
        organizationId,
        workspaceId,
        userId,
        credits: String(pack.credits),
        packId: pack.id,
      },
    });
    return { success: true, clientSecret: pi.client_secret ?? undefined, paymentIntentId: pi.id };
  } catch (err) {
    console.error('[createTopupPayment] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Top-up-betaling aanmaken faalde.' };
  }
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
  if (!isBillingEnabled()) throw new Error('Billing is disabled');
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
}

// ─── Org Stripe customer (create-if-missing) ────────────────

async function resolveOrgStripeCustomer(organizationId: string, workspaceId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true, name: true },
  });
  if (org?.stripeCustomerId) return org.stripeCustomerId;

  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId, role: 'owner' },
    include: { user: { select: { email: true } } },
  });
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: owner?.user.email ?? undefined,
    name: org?.name ?? undefined,
    metadata: { organizationId, workspaceId },
  });
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
