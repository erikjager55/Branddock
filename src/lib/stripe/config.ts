// =============================================================
// Stripe config — price IDs and product configuration
//
// Maps plan tiers to Stripe Price IDs from env vars.
// =============================================================

import type { PlanTier, StripePriceIds } from '@/types/billing';

// ─── Stripe Price IDs (from env) ────────────────────────────

export function getStripePriceIds(): StripePriceIds {
  return {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    agencyMonthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
    enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    agencyYearly: process.env.STRIPE_PRICE_AGENCY_YEARLY,
    enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    aiOverage: process.env.STRIPE_PRICE_AI_OVERAGE,
  };
}

// ─── Map tier + cycle → Stripe Price ID ─────────────────────

/**
 * Retourneert de Stripe-price-id voor tier+cycle. Bij `yearly` de yearly-price;
 * ontbreekt die env → `null` (fail-safe: de checkout-route weigert i.p.v. stil
 * de maandprijs te charge­n).
 */
export function getPriceIdForTier(
  tier: PlanTier,
  cycle: 'monthly' | 'yearly' = 'monthly',
): string | null {
  const prices = getStripePriceIds();
  const yearly = cycle === 'yearly';
  switch (tier) {
    case 'FREE': return null; // Free tier has no Stripe price
    case 'PRO': return (yearly ? prices.proYearly : prices.proMonthly) ?? null;
    case 'AGENCY': return (yearly ? prices.agencyYearly : prices.agencyMonthly) ?? null;
    case 'ENTERPRISE': return (yearly ? prices.enterpriseYearly : prices.enterpriseMonthly) ?? null;
  }
}

// ─── Webhook secret ─────────────────────────────────────────

export function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? '';
}

// ─── Currency ───────────────────────────────────────────────

export const STRIPE_CURRENCY = 'eur';

// ─── Success/Cancel URL templates ───────────────────────────

export function getCheckoutUrls(baseUrl: string) {
  return {
    success: `${baseUrl}/settings/billing?checkout=success`,
    cancel: `${baseUrl}/settings/billing?checkout=cancel`,
  };
}
