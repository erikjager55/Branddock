// =============================================================
// POST /api/stripe/checkout
//
// Creates a Stripe Checkout Session for plan upgrades.
// Returns the session URL for client-side redirect.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import type { PlanTier } from '@/types/billing';

// STARTER/GROWTH added: getPriceIdForTier() and mapPriceToTier() already
// handle them (credit-model, ADR 2026-07-07) — this allowlist was the one
// place left over from the legacy PRO/AGENCY/ENTERPRISE tier set, silently
// rejecting every "Upgrade to Starter/Growth" click from the UI.
const VALID_TIERS: PlanTier[] = ['PRO', 'STARTER', 'GROWTH', 'AGENCY', 'ENTERPRISE'];
const VALID_CYCLES = ['monthly', 'yearly'] as const;

export async function POST(request: NextRequest) {
  // H4 + review: owner/admin of the WORKSPACE's org (was any member/viewer +
  // active-org/cookie divergence).
  const ctx = await requireWorkspaceRole();
  if (ctx instanceof NextResponse) return ctx;

  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: 'Billing is disabled' },
      { status: 400 }
    );
  }

  const { workspaceId } = ctx;

  const body = await request.json();
  const { planTier, billingCycle = 'monthly' } = body as {
    planTier?: string;
    billingCycle?: string;
  };

  if (!planTier || !VALID_TIERS.includes(planTier as PlanTier)) {
    return NextResponse.json(
      { error: `Invalid planTier. Must be one of: ${VALID_TIERS.join(', ')}.` },
      { status: 400 }
    );
  }

  if (!VALID_CYCLES.includes(billingCycle as typeof VALID_CYCLES[number])) {
    return NextResponse.json(
      { error: 'Invalid billingCycle. Must be monthly or yearly.' },
      { status: 400 }
    );
  }

  try {
    const baseUrl = request.nextUrl.origin;
    const result = await createCheckoutSession({
      workspaceId,
      planTier: planTier as PlanTier,
      billingCycle: billingCycle as 'monthly' | 'yearly',
      baseUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe/checkout] Error: ${message}`);
    return NextResponse.json(
      { error: `Checkout creation failed: ${message}` },
      { status: 500 }
    );
  }
}
