import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; interviewId: string }> };

// =============================================================
// POST /api/brand-assets/[id]/interviews/[interviewId]/complete
// Mark interview as completed
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true, status: true, scheduledDate: true, conductedAt: true },
    });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Calculate actual duration if we have a start time
    let actualDuration: number | null = null;
    if (interview.conductedAt) {
      actualDuration = Math.round(
        (Date.now() - interview.conductedAt.getTime()) / 60000,
      );
    }

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "COMPLETED",
        completedSteps: [1, 2, 3, 4, 5],
        currentStep: 5,
        conductedAt: interview.conductedAt ?? new Date(),
        actualDuration,
      },
    });

    return NextResponse.json({ interview: updated });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/interviews/:interviewId/complete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
