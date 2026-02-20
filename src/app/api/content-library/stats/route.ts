import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/content-library/stats
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 },
      );
    }

    const deliverables = await prisma.deliverable.findMany({
      where: {
        campaign: {
          workspaceId,
          isArchived: false,
        },
      },
      select: {
        status: true,
        qualityScore: true,
      },
    });

    const totalContent = deliverables.length;
    const complete = deliverables.filter(
      (d) => d.status === "COMPLETED",
    ).length;
    const inProgress = deliverables.filter(
      (d) => d.status === "IN_PROGRESS",
    ).length;

    const scoresWithValue = deliverables
      .map((d) => d.qualityScore)
      .filter((s): s is number => s !== null);

    const avgQuality =
      scoresWithValue.length > 0
        ? Math.round(
            (scoresWithValue.reduce((sum, s) => sum + s, 0) /
              scoresWithValue.length) *
              10,
          ) / 10
        : 0;

    return NextResponse.json({
      totalContent,
      complete,
      inProgress,
      avgQuality,
    });
  } catch (error) {
    console.error("[GET /api/content-library/stats]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
