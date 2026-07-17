// =============================================================
// POST /api/stripe/checkout
//
// Creates a Stripe Checkout Session for plan upgrades.
// Returns the session URL for client-side redirect.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import type { PlanTier } from '@/types/billing';

// L8 Zod-sweep (audit 2026-06-26, batch 6): de enum-guards bestonden al, maar
// malformed JSON gooide vóór de guards een ongevangen exception (500).
const checkoutSchema = z.object({
  planTier: z.enum(['PRO', 'AGENCY', 'ENTERPRISE']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

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

  const parsed = await parseJsonBody(request, checkoutSchema);
  if (!parsed.ok) return parsed.response;
  const { planTier, billingCycle } = parsed.data;

  try {
    const baseUrl = request.nextUrl.origin;
    const result = await createCheckoutSession({
      workspaceId,
      planTier: planTier as PlanTier,
      billingCycle,
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
