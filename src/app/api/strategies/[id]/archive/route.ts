import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { mapStrategyDetail } from "../../route";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// PATCH /api/strategies/[id]/archive — toggle ACTIVE ↔ ARCHIVED
// =============================================================
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const newStatus = existing.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";

    const strategy = await prisma.businessStrategy.update({
      where: { id },
      data: { status: newStatus },
      include: {
        objectives: {
          include: { keyResults: { orderBy: { sortOrder: "asc" } }, focusArea: true },
          orderBy: { sortOrder: "asc" },
        },
        focusAreas: { include: { _count: { select: { objectives: true } } } },
        milestones: { orderBy: { date: "asc" } },
        linkedCampaigns: true,
      },
    });

    return NextResponse.json({ strategy: mapStrategyDetail(strategy) });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/archive]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
