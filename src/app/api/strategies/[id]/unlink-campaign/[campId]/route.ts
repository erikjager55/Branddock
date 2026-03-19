import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";

type RouteParams = { params: Promise<{ id: string; campId: string }> };

// =============================================================
// DELETE /api/strategies/[id]/unlink-campaign/[campId]
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, campId } = await params;

    const lockResponse = await requireUnlocked("businessStrategy", id);
    if (lockResponse) return lockResponse;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.campaignStrategy.deleteMany({
      where: { strategyId: id, campaignId: campId },
    });

    return NextResponse.json({ unlinked: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]/unlink-campaign/[campId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
