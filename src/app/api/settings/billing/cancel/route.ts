import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRole } from "@/lib/auth/require-role";

// =============================================================
// POST /api/settings/billing/cancel
// Set cancelAtPeriodEnd=true on current subscription
// =============================================================
export async function POST() {
  try {
    // H4 + review: cancelling is owner/admin of the WORKSPACE's org.
    const ctx = await requireWorkspaceRole();
    if (ctx instanceof NextResponse) return ctx;
    const { workspaceId } = ctx;

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
