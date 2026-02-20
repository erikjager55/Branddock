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
    aiOverage: process.env.STRIPE_PRICE_AI_OVERAGE,
  };
}

// ─── Map tier → Stripe Price ID ─────────────────────────────

export function getPriceIdForTier(tier: PlanTier): string | null {
  const prices = getStripePriceIds();
  switch (tier) {
    case 'FREE': return null; // Free tier has no Stripe price
    case 'PRO': return prices.proMonthly ?? null;
    case 'AGENCY': return prices.agencyMonthly ?? null;
    case 'ENTERPRISE': return prices.enterpriseMonthly ?? null;
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
