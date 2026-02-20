import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/stats — research dashboard stats
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [activeStudies, completed, pendingReview] = await Promise.all([
      prisma.researchStudy.count({
        where: { workspaceId, status: "IN_PROGRESS" },
      }),
      prisma.researchStudy.count({
        where: { workspaceId, status: "COMPLETED" },
      }),
      prisma.researchStudy.count({
        where: { workspaceId, status: "PENDING_REVIEW" },
      }),
    ]);

    return NextResponse.json({
      activeStudies,
      completed,
      pendingReview,
      totalInsights: 0,
    });
  } catch (error) {
    console.error("[GET /api/research/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
