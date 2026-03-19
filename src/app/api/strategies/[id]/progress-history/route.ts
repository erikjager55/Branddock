import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/strategies/[id]/progress-history — last 8 snapshots
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const snapshots = await prisma.progressSnapshot.findMany({
      where: { strategyId: id },
      orderBy: { date: "desc" },
      take: 8,
    });

    // Return in chronological order (oldest first)
    return NextResponse.json({
      snapshots: snapshots.reverse().map((s) => ({
        id: s.id,
        percentage: s.percentage,
        date: s.date.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/strategies/[id]/progress-history]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
