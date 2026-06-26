// =============================================================
// POST /api/stripe/sync
//
// Manual subscription sync — admin only.
// Fetches the latest subscription from Stripe and syncs to DB.
// Used for reconciliation when webhooks may have been missed.
// =============================================================

import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { getStripeClient } from "@/lib/stripe/client";
import { isBillingEnabled } from "@/lib/stripe/feature-flags";
import { updatePlanFromStripe } from "@/lib/stripe/subscription-sync";

export async function POST() {
  try {
    // Workspace + rol uit de sessie (membership-bound), NIET uit de body — dat
    // was de cross-tenant IDOR (H5). Reconcile/force-downgrade is owner/admin-
    // only, consistent met de overige billing-routes (security-review).
    const ctx = await requireWorkspaceRole();
    if (ctx instanceof NextResponse) return ctx;
    const { workspaceId } = ctx;

    // Billing must be enabled for sync
    if (!isBillingEnabled()) {
      return NextResponse.json(
        { error: "Billing is not enabled", billingEnabled: false },
        { status: 400 }
      );
    }

    // Sync subscription from Stripe
    const stripe = getStripeClient();
    await updatePlanFromStripe(workspaceId, stripe);

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[POST /api/stripe/sync]", message);
    return NextResponse.json(
      { error: "Sync failed", details: message },
      { status: 500 }
    );
  }
}
