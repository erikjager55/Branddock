import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ workshopId: string }> };

// =============================================================
// POST /api/workshops/[workshopId]/complete
// Complete workshop + cascade research method
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      include: { participants: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    if (workshop.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Cannot complete workshop with status ${workshop.status}` },
        { status: 409 },
      );
    }

    // Calculate duration from timer
    const durationMinutes = Math.round(workshop.timerSeconds / 60);

    const updated = await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        participantCount: workshop.participants.length,
        durationMinutes,
      },
    });

    // Cascade: update research method WORKSHOP → COMPLETED
    await prisma.brandAssetResearchMethod.updateMany({
      where: {
        brandAssetId: workshop.brandAssetId,
        method: "WORKSHOP",
      },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      workshop: {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt?.toISOString() ?? null,
        durationMinutes: updated.durationMinutes,
      },
      reportGenerating: true,
    });
  } catch (error) {
    console.error("[POST /api/workshops/:workshopId/complete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
