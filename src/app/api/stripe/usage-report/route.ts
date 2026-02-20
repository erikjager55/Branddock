// =============================================================
// POST /api/stripe/usage-report — Report AI usage to Stripe
//
// Manual trigger for reporting overage usage to Stripe.
// Typically called by admin or as a complement to the daily cron.
// Requires workspace auth.
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { calculateOverage, reportUsageToStripe } from '@/lib/stripe/metered';

export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 401 });
    }

    if (!isBillingEnabled()) {
      const overage = await calculateOverage(workspaceId);
      return NextResponse.json({
        reported: false,
        reason: 'billing_disabled',
        overage,
      });
    }

    const result = await reportUsageToStripe(workspaceId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[POST /api/stripe/usage-report] Error:', err);
    return NextResponse.json({ error: 'Failed to report usage' }, { status: 500 });
  }
}
