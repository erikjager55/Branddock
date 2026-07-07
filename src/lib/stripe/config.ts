// =============================================================
// Stripe config — price IDs and product configuration
//
// Maps plan tiers to Stripe Price IDs from env vars.
// =============================================================

import type { PlanTier, StripePriceIds } from '@/types/billing';

// ─── Stripe Price IDs (from env) ────────────────────────────

export function getStripePriceIds(): StripePriceIds {
  return {
    // Legacy vaste-prijs (reeds live)
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    agencyMonthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
    enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    agencyYearly: process.env.STRIPE_PRICE_AGENCY_YEARLY,
    enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    aiOverage: process.env.STRIPE_PRICE_AI_OVERAGE,
    // Credit-model (voorbereidend — Stripe-price-objecten volgen in Fase 3/5)
    starterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    growthMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    starterYearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    growthYearly: process.env.STRIPE_PRICE_GROWTH_YEARLY,
    topupSmall: process.env.STRIPE_PRICE_TOPUP_SMALL,
    topupMedium: process.env.STRIPE_PRICE_TOPUP_MEDIUM,
    topupLarge: process.env.STRIPE_PRICE_TOPUP_LARGE,
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
    case 'PRO': return (yearly ? prices.proYearly : prices.proMonthly) ?? null; // legacy
    case 'STARTER': return (yearly ? prices.starterYearly : prices.starterMonthly) ?? null;
    case 'GROWTH': return (yearly ? prices.growthYearly : prices.growthMonthly) ?? null;
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
    // De app is een hybride SPA zonder URL-adresseerbare pagina's — redirect naar
    // root; App.tsx leest ?checkout= en opent de billing-tab + toont feedback.
    success: `${baseUrl}/?checkout=success`,
    cancel: `${baseUrl}/?checkout=cancel`,
  };
}
