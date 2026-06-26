// =============================================================
// POST /api/stripe/portal
//
// Creates a Stripe Customer Portal Session.
// Returns the portal URL for client-side redirect.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { createPortalSession } from '@/lib/stripe/checkout';

export async function POST(request: NextRequest) {
  // H4 + review: owner/admin of the WORKSPACE's org (not the active-org) — closes
  // the cookie-vs-active-org divergence.
  const ctx = await requireWorkspaceRole();
  if (ctx instanceof NextResponse) return ctx;

  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: 'Billing is disabled' },
      { status: 400 }
    );
  }

  const { workspaceId } = ctx;

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
