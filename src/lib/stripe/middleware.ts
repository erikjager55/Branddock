// =============================================================
// Plan enforcement middleware — HOC for API route handlers
//
// Wraps Next.js API route handlers with plan limit checks.
// When BILLING_ENABLED=false, enforcement is completely skipped.
//
// Usage:
//   export const POST = withPlanEnforcement(
//     async (req, ctx) => { /* handler */ },
//     'PERSONAS',
//   );
// =============================================================

import { NextResponse } from 'next/server';
import type { FeatureKey } from '@/types/billing';
import { isBillingEnabled } from './feature-flags';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getWorkspacePlan, getCurrentCount } from './enforcement';

// ─── Types ──────────────────────────────────────────────────

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

interface EnforcementOptions {
  /** If true, the handler creates a new entity (checks current < limit).
   *  If false, just reads — no limit check needed. Default: true. */
  countAction?: boolean;
}

// ─── withPlanEnforcement HOC ────────────────────────────────

/**
 * Higher-order function that wraps an API route handler with plan
 * enforcement. Checks the workspace plan limit for the given feature
 * before allowing the handler to proceed.
 *
 * When billing is disabled, the handler is called directly without
 * any enforcement checks.
 */
export function withPlanEnforcement(
  handler: RouteHandler,
  feature: FeatureKey,
  options?: EnforcementOptions,
): RouteHandler {
  const { countAction = true } = options ?? {};

  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    // Skip enforcement when billing is disabled
    if (!isBillingEnabled()) {
      return handler(request, context);
    }

    // Skip enforcement for non-create actions
    if (!countAction) {
      return handler(request, context);
    }

    try {
      // Resolve workspace
      const workspaceId = await resolveWorkspaceId();
      if (!workspaceId) {
        return NextResponse.json(
          { error: 'Workspace not found. Please log in.' },
          { status: 401 },
        );
      }

      // Get plan and current count
      const plan = await getWorkspacePlan(workspaceId);
      const limit = plan.limits[feature];
      const current = await getCurrentCount(workspaceId, feature);

      if (current >= limit) {
        return NextResponse.json(
          {
            error: 'plan_limit_reached',
            feature,
            limit,
            current,
            tier: plan.tier,
            upgrade_url: '/settings/billing',
          },
          { status: 403 },
        );
      }

      // Limit not reached — proceed to handler
      return handler(request, context);
    } catch (err) {
      console.error('[withPlanEnforcement] Error:', err);
      return NextResponse.json(
        { error: 'Failed to check plan limits' },
        { status: 500 },
      );
    }
  };
}
