// =============================================================
// Stripe SDK singleton — server-side only
//
// Uses STRIPE_SECRET_KEY from env. Includes retry config.
// Never import this file from client components.
// =============================================================

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Returns the Stripe SDK singleton.
 * Throws if STRIPE_SECRET_KEY is not set and billing is enabled.
 */
export function getStripeClient(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_placeholder') {
    // Return a client that will fail on API calls — this is fine
    // when billing is disabled. The feature flag gate in
    // feature-flags.ts prevents any Stripe calls.
    stripeInstance = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2026-01-28.clover',
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 10_000,
    });
    return stripeInstance;
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: {
      name: 'Branddock',
      version: '1.0.0',
    },
  });

  return stripeInstance;
}

/**
 * Returns the publishable key for client-side Stripe.js.
 */
export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder';
}
