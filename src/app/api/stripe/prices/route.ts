// =============================================================
// GET /api/stripe/prices
//
// Fetches current plan prices. When billing is enabled,
// returns live prices from Stripe. When disabled, returns
// static prices from plan config.
// =============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { getStripeClient } from '@/lib/stripe/client';
import { getStripePriceIds } from '@/lib/stripe/config';
import { PLAN_CONFIGS, ALL_TIERS } from '@/lib/constants/plan-limits';

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // When billing is disabled, return static prices from config
  if (!isBillingEnabled()) {
    const prices = ALL_TIERS.map((tier) => {
      const config = PLAN_CONFIGS[tier];
      return {
        tier,
        name: config.name,
        monthlyPriceEur: config.monthlyPriceEur,
        yearlyPriceEur: Math.round(config.monthlyPriceEur * 12 * 0.8), // 20% discount
        features: config.features,
        isFreeBeta: true,
      };
    });

    return NextResponse.json({ prices });
  }

  // When billing is enabled, fetch live prices from Stripe
  try {
    const stripe = getStripeClient();
    const priceIds = getStripePriceIds();
    const activePriceIds = [
      priceIds.proMonthly,
      priceIds.agencyMonthly,
      priceIds.enterpriseMonthly,
    ].filter(Boolean) as string[];

    const stripePrices = await Promise.all(
      activePriceIds.map((id) => stripe.prices.retrieve(id, { expand: ['product'] }))
    );

    const prices = ALL_TIERS.map((tier) => {
      const config = PLAN_CONFIGS[tier];
      const stripePrice = stripePrices.find(
        (sp) => sp.id === priceIds[`${tier.toLowerCase()}Monthly` as keyof typeof priceIds]
      );

      return {
        tier,
        name: config.name,
        monthlyPriceEur: stripePrice
          ? (stripePrice.unit_amount ?? 0) / 100
          : config.monthlyPriceEur,
        yearlyPriceEur: Math.round(config.monthlyPriceEur * 12 * 0.8),
        features: config.features,
        isFreeBeta: false,
      };
    });

    return NextResponse.json({ prices });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe/prices] Error: ${message}`);

    // Fallback to static prices
    const prices = ALL_TIERS.map((tier) => {
      const config = PLAN_CONFIGS[tier];
      return {
        tier,
        name: config.name,
        monthlyPriceEur: config.monthlyPriceEur,
        yearlyPriceEur: Math.round(config.monthlyPriceEur * 12 * 0.8),
        features: config.features,
        isFreeBeta: false,
      };
    });

    return NextResponse.json({ prices });
  }
}
