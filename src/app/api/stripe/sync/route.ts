// =============================================================
// POST /api/stripe/sync
//
// Manual subscription sync — admin only.
// Fetches the latest subscription from Stripe and syncs to DB.
// Used for reconciliation when webhooks may have been missed.
// =============================================================

import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getStripeClient } from "@/lib/stripe/client";
import { isBillingEnabled } from "@/lib/stripe/feature-flags";
import { updatePlanFromStripe } from "@/lib/stripe/subscription-sync";

export async function POST() {
  try {
    // Workspace is resolved from the caller's session (membership-bound) — NOT
    // from the request body. Trusting a body-supplied workspaceId was a cross-
    // tenant IDOR: any authenticated user could force-sync (and force-downgrade)
    // another tenant's subscription. Zie security-audit 2026-06-26 H5.
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

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
