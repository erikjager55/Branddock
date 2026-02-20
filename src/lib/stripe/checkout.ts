// =============================================================
// Stripe Checkout & Customer Portal — session creation
//
// Creates Stripe Checkout Sessions for plan upgrades and
// Customer Portal Sessions for subscription management.
// =============================================================

import { getStripeClient } from './client';
import { getPriceIdForTier, getCheckoutUrls, STRIPE_CURRENCY } from './config';
import { getOrCreateCustomer } from './customer';
import { isBillingEnabled } from './feature-flags';
import type { PlanTier } from '@/types/billing';

// ─── Checkout Session ──────────────────────────────────────

export interface CreateCheckoutOptions {
  workspaceId: string;
  planTier: PlanTier;
  billingCycle: 'monthly' | 'yearly';
  baseUrl: string;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
}

/**
 * Creates a Stripe Checkout Session for a plan upgrade.
 * Returns the session ID and URL for redirect.
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<CheckoutResult> {
  if (!isBillingEnabled()) {
    throw new Error('Billing is disabled');
  }

  const priceId = getPriceIdForTier(options.planTier);
  if (!priceId) {
    throw new Error(`No Stripe price configured for tier: ${options.planTier}`);
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateCustomer(options.workspaceId);
  const urls = getCheckoutUrls(options.baseUrl);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    currency: STRIPE_CURRENCY,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: urls.success,
    cancel_url: urls.cancel,
    metadata: {
      workspaceId: options.workspaceId,
      planTier: options.planTier,
      billingCycle: options.billingCycle,
    },
    subscription_data: {
      metadata: {
        workspaceId: options.workspaceId,
        planTier: options.planTier,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// ─── Customer Portal Session ───────────────────────────────

export interface CreatePortalOptions {
  workspaceId: string;
  returnUrl: string;
}

export interface PortalResult {
  url: string;
}

/**
 * Creates a Stripe Customer Portal Session.
 * Redirects to Stripe-hosted portal for plan changes, payment updates, invoices.
 */
export async function createPortalSession(
  options: CreatePortalOptions
): Promise<PortalResult> {
  if (!isBillingEnabled()) {
    throw new Error('Billing is disabled');
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateCustomer(options.workspaceId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: options.returnUrl,
  });

  return {
    url: session.url,
  };
}
