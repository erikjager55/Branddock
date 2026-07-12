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

  // review-live-pricing: de UI toont alleen een jaarlijks-toggle als er écht
  // yearly-prijzen geconfigureerd zijn — anders belooft de toggle -20% terwijl
  // de checkout server-side met een 400 weigert (fail-safe uit PR #79).
  const ids = getStripePriceIds();
  // Starter/Growth zijn de canonical ADR-tiers; legacy PRO telt bewust niet
  // mee (staat niet in ALL_TIERS, dus zijn yearly-prijs mag de toggle niet
  // voor de andere tiers aanzetten). NB (W3, gedocumenteerd in user-taak #6):
  // het getoonde jaarbedrag is de -20%-lijstprijs uit config — de yearly-
  // Stripe-prijzen MOETEN daarmee matchen bij aanmaak.
  const yearlyAvailable = Boolean(
    ids.starterYearly || ids.growthYearly || ids.agencyYearly || ids.enterpriseYearly,
  );

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

    return NextResponse.json({ prices, yearlyAvailable });
  }

  // When billing is enabled, fetch live prices from Stripe
  try {
    const stripe = getStripeClient();
    const priceIds = ids;
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

    return NextResponse.json({ prices, yearlyAvailable });
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

    return NextResponse.json({ prices, yearlyAvailable });
  }
}
