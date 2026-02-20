// =============================================================
// POST /api/cron/usage-sync — Daily AI usage sync to Stripe
//
// Cron endpoint that reports AI token overage for all active
// subscriptions. Intended to be called daily (e.g. via Vercel Cron).
//
// Security: Validates CRON_SECRET header to prevent unauthorized access.
// When BILLING_ENABLED=false, returns immediately (no-op).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { reportUsageForAllWorkspaces } from '@/lib/stripe/metered';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional, for production security)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!isBillingEnabled()) {
      return NextResponse.json({
        success: true,
        message: 'Billing disabled — no usage to sync',
        total: 0,
        reported: 0,
        skipped: 0,
        errors: 0,
      });
    }

    const result = await reportUsageForAllWorkspaces();

    return NextResponse.json({
      success: true,
      message: `Usage sync complete: ${result.reported} reported, ${result.skipped} skipped, ${result.errors} errors`,
      ...result,
    });
  } catch (err) {
    console.error('[POST /api/cron/usage-sync] Error:', err);
    return NextResponse.json({ error: 'Usage sync failed' }, { status: 500 });
  }
}
