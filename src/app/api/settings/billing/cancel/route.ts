import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// POST /api/settings/billing/cancel
// Set cancelAtPeriodEnd=true on current subscription
// =============================================================
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
