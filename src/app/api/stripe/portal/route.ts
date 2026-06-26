// =============================================================
// POST /api/stripe/portal
//
// Creates a Stripe Customer Portal Session.
// Returns the portal URL for client-side redirect.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireOrgRole } from '@/lib/auth/require-role';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { createPortalSession } from '@/lib/stripe/checkout';

export async function POST(request: NextRequest) {
  // H4: the billing portal (manage payment methods / cancel) is owner/admin-only.
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

  try {
    const returnUrl = `${request.nextUrl.origin}/settings/billing`;
    const result = await createPortalSession({
      workspaceId,
      returnUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe/portal] Error: ${message}`);
    return NextResponse.json(
      { error: `Portal creation failed: ${message}` },
      { status: 500 }
    );
  }
}
