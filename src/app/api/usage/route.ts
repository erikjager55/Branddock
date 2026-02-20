// =============================================================
// GET /api/usage — Current usage stats per feature
//
// Returns UsageRecord[] showing current count vs limit for
// each feature key in the workspace's plan.
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { getWorkspacePlan, getCurrentCount } from '@/lib/stripe/enforcement';
import { ALL_FEATURE_KEYS } from '@/lib/constants/plan-limits';
import type { UsageRecord } from '@/types/billing';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 401 });
    }

    // When billing is disabled, return unlimited for all features
    if (!isBillingEnabled()) {
      const records: UsageRecord[] = ALL_FEATURE_KEYS.map((feature) => ({
        feature,
        current: 0,
        limit: Infinity,
        percentage: 0,
        isAtLimit: false,
      }));
      return NextResponse.json({ records, billingEnabled: false });
    }

    const plan = await getWorkspacePlan(workspaceId);

    // Fetch all counts in parallel
    const counts = await Promise.all(
      ALL_FEATURE_KEYS.map(async (feature) => {
        const current = await getCurrentCount(workspaceId, feature);
        const limit = plan.limits[feature];
        const percentage = isFinite(limit) && limit > 0
          ? Math.min(100, Math.round((current / limit) * 100))
          : 0;
        return {
          feature,
          current,
          limit,
          percentage,
          isAtLimit: current >= limit,
        } satisfies UsageRecord;
      }),
    );

    return NextResponse.json({
      records: counts,
      billingEnabled: true,
      tier: plan.tier,
    });
  } catch (err) {
    console.error('[GET /api/usage] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
