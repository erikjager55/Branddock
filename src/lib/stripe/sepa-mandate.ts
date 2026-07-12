// =============================================================
// iDEAL→SEPA-mandaat (Fase 5a, ADR 2026-07-07 D10) — het herbruikbare
// incasso-mandaat waar de recurring basis en auto-topup (Fase 3-invulpunt)
// off-session tegen draaien.
//
// Flow: Checkout in `mode: 'setup'` met iDEAL — Stripe host de hele
// bevestiging (bank-redirect) en levert een herbruikbaar sepa_debit-
// PaymentMethod op. Wij persisteren mandaat-status + PaymentMethod-id op de
// Organization; de webhooks (setup_intent.succeeded / mandate.updated)
// houden de status bij. Eén bron van waarheid: `org.sepaMandateStatus`
// ('active' | 'pending' | 'inactive' | null) — precies het contract dat
// auto-topup.ts leest.
//
// iDEAL is single-use by design: losse top-ups blijven iDEAL/kaart via de
// gewone payment-Checkout; alléén dit setup-pad levert het SEPA-mandaat.
// =============================================================

import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from './client';
import { getCheckoutUrls } from './config';
import { getOrCreateCustomer } from './customer';
import { isCreditsEnabled, isTopupEnabled } from './feature-flags';

export interface CreateSepaMandateCheckoutParams {
  organizationId: string;
  workspaceId: string;
  baseUrl: string;
}

/**
 * Start de gehoste iDEAL→SEPA-mandaat-setup (Checkout `mode: 'setup'`).
 * De user bevestigt via zijn bank; `setup_intent.succeeded` persisteert het
 * mandaat. Zelfde flag-gates als de top-up (geen route naar live-Stripe in
 * pilotmodus).
 */
export async function createSepaMandateCheckout(
  params: CreateSepaMandateCheckoutParams,
): Promise<{ url: string }> {
  if (!isCreditsEnabled()) throw new Error('Credits zijn niet ingeschakeld');
  if (!isTopupEnabled()) throw new Error('Betalingen zijn nog niet beschikbaar');

  const stripe = getStripeClient();
  const customerId = await getOrCreateCustomer(params.workspaceId);
  const urls = getCheckoutUrls(params.baseUrl);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'setup',
    // iDEAL-setup levert een herbruikbaar sepa_debit-mandaat (Stripe-native
    // chaining); sepa_debit direct mag ook (IBAN-invoer zonder bank-redirect).
    payment_method_types: ['ideal', 'sepa_debit'],
    success_url: urls.success,
    cancel_url: urls.cancel,
    metadata: {
      type: 'sepa_mandate_setup',
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
    },
    setup_intent_data: {
      metadata: {
        type: 'sepa_mandate_setup',
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
      },
    },
  });

  // Markeer als pending zodat de UI direct status kan tonen; 'active' volgt
  // pas via de webhook (nooit optimistisch activeren — auto-topup leest dit).
  await prisma.organization.update({
    where: { id: params.organizationId },
    data: { sepaMandateStatus: 'pending' },
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url };
}

/**
 * Webhook: `setup_intent.succeeded` voor een mandaat-setup → persisteer het
 * PaymentMethod-id en zet de status op 'active'. Idempotent (zelfde waarden
 * bij een event-retry). Andere SetupIntents (geen mandaat-metadata) worden
 * genegeerd.
 */
export async function handleSetupIntentSucceeded(si: Stripe.SetupIntent): Promise<void> {
  if (si.metadata?.type !== 'sepa_mandate_setup') return;
  const organizationId = si.metadata.organizationId;
  const paymentMethodId =
    typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
  if (!organizationId || !paymentMethodId) return;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { sepaMandateStatus: 'active', sepaPaymentMethodId: paymentMethodId },
  });
}

/**
 * Webhook: `mandate.updated` — sync de mandaat-status. Een ingetrokken of
 * inactief mandaat zet de org op 'inactive' zodat auto-topup direct stopt
 * (fail-closed: alles behalve 'active' blokkeert de off-session charge).
 */
export async function handleMandateUpdated(mandate: Stripe.Mandate): Promise<void> {
  const paymentMethodId =
    typeof mandate.payment_method === 'string'
      ? mandate.payment_method
      : mandate.payment_method?.id;
  if (!paymentMethodId) return;

  const org = await prisma.organization.findFirst({
    where: { sepaPaymentMethodId: paymentMethodId },
    select: { id: true },
  });
  if (!org) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: { sepaMandateStatus: mandate.status === 'active' ? 'active' : 'inactive' },
  });
}
