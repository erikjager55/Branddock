import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { isBillingEnabled } from "@/lib/stripe/feature-flags";

// =============================================================
// GET /api/settings/billing/plan
// Returns current plan info + isFreeBeta flag.
// When billing is disabled (default), returns Free Beta state.
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // When billing is disabled, return Free Beta state
    if (!isBillingEnabled()) {
      return NextResponse.json({
        plan: {
          tier: "ENTERPRISE",
          name: "Free Beta",
          slug: "free-beta",
          monthlyPrice: 0,
        },
        isFreeBeta: true,
      });
    }

    // When billing is enabled, resolve from database
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({
        plan: {
          tier: "FREE",
          name: "Free",
          slug: "free",
          monthlyPrice: 0,
        },
        isFreeBeta: false,
      });
    }

    return NextResponse.json({
      plan: {
        tier: subscription.plan.slug.toUpperCase(),
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        monthlyPrice: subscription.plan.monthlyPrice,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      },
      isFreeBeta: false,
    });
  } catch (error) {
    console.error("[GET /api/settings/billing/plan]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
