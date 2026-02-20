// =============================================================
// GET /api/usage/ai — AI token usage this billing period
//
// Returns monthly aggregate + per-feature breakdown.
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { getWorkspacePlan } from '@/lib/stripe/enforcement';
import { getUsageThisMonth, getUsageByFeature } from '@/lib/stripe/usage-tracker';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 401 });
    }

    const [monthly, byFeature] = await Promise.all([
      getUsageThisMonth(workspaceId),
      getUsageByFeature(workspaceId),
    ]);

    // Get AI token limit for context
    let tokenLimit = Infinity;
    let tier = 'ENTERPRISE';
    if (isBillingEnabled()) {
      const plan = await getWorkspacePlan(workspaceId);
      tokenLimit = plan.limits.AI_TOKENS;
      tier = plan.tier;
    }

    const percentage = isFinite(tokenLimit) && tokenLimit > 0
      ? Math.min(100, Math.round((monthly.totalTokens / tokenLimit) * 100))
      : 0;

    return NextResponse.json({
      totalTokens: monthly.totalTokens,
      totalCost: monthly.totalCost,
      callCount: monthly.callCount,
      tokenLimit,
      percentage,
      isAtLimit: monthly.totalTokens >= tokenLimit,
      tier,
      periodStart: monthly.periodStart.toISOString(),
      periodEnd: monthly.periodEnd.toISOString(),
      byFeature,
      billingEnabled: isBillingEnabled(),
    });
  } catch (err) {
    console.error('[GET /api/usage/ai] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch AI usage' }, { status: 500 });
  }
}
