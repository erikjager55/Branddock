import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; interviewId: string }> };

// =============================================================
// POST /api/brand-assets/[id]/interviews/[interviewId]/approve
// Approve & lock interview, update research method progress
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
      select: { id: true, status: true },
    });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "APPROVED",
        isLocked: true,
        lockedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // Update INTERVIEWS research method progress
    const totalInterviews = await prisma.interview.count({
      where: { brandAssetId: assetId, workspaceId },
    });
    const approvedInterviews = await prisma.interview.count({
      where: { brandAssetId: assetId, workspaceId, status: "APPROVED" },
    });

    const progress = totalInterviews > 0
      ? Math.round((approvedInterviews / totalInterviews) * 100)
      : 0;

    await prisma.brandAssetResearchMethod.updateMany({
      where: { brandAssetId: assetId, method: "INTERVIEWS" },
      data: {
        progress,
        status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS",
        artifactsCount: approvedInterviews,
        ...(progress >= 100 ? { completedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ interview: updated, progress });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/interviews/:interviewId/approve]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
