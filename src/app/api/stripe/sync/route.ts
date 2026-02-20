// =============================================================
// POST /api/stripe/sync
//
// Manual subscription sync — admin only.
// Fetches the latest subscription from Stripe and syncs to DB.
// Used for reconciliation when webhooks may have been missed.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { getStripeClient } from "@/lib/stripe/client";
import { isBillingEnabled } from "@/lib/stripe/feature-flags";
import { updatePlanFromStripe } from "@/lib/stripe/subscription-sync";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Billing must be enabled for sync
    if (!isBillingEnabled()) {
      return NextResponse.json(
        { error: "Billing is not enabled", billingEnabled: false },
        { status: 400 }
      );
    }

    // Read workspaceId from body
    const body = await request.json();
    const workspaceId = body.workspaceId as string;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
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
