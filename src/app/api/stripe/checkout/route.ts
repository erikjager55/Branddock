// =============================================================
// POST /api/stripe/checkout
//
// Creates a Stripe Checkout Session for plan upgrades.
// Returns the session URL for client-side redirect.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireOrgRole } from '@/lib/auth/require-role';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import type { PlanTier } from '@/types/billing';

const VALID_TIERS: PlanTier[] = ['PRO', 'AGENCY', 'ENTERPRISE'];
const VALID_CYCLES = ['monthly', 'yearly'] as const;

export async function POST(request: NextRequest) {
  // H4: starting a paid checkout is owner/admin-only (was any member/viewer).
  const role = await requireOrgRole();
  if (role instanceof NextResponse) return role;

  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: 'Billing is disabled' },
      { status: 400 }
    );
  }

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'No workspace found' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { planTier, billingCycle = 'monthly' } = body as {
    planTier?: string;
    billingCycle?: string;
  };

  if (!planTier || !VALID_TIERS.includes(planTier as PlanTier)) {
    return NextResponse.json(
      { error: 'Invalid planTier. Must be PRO, AGENCY, or ENTERPRISE.' },
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
