import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireOrgRole } from "@/lib/auth/require-role";

// =============================================================
// POST /api/settings/billing/cancel
// Set cancelAtPeriodEnd=true on current subscription
// =============================================================
export async function POST() {
  try {
    // H4: cancelling a subscription is owner/admin-only (was any member/viewer).
    const role = await requireOrgRole();
    if (role instanceof NextResponse) return role;

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const updated = await prisma.subscription.update({
      where: { workspaceId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/settings/billing/cancel]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
