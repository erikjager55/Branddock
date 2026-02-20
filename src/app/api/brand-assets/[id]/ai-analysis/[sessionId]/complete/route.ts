import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

// =============================================================
// POST /api/brand-assets/[id]/ai-analysis/[sessionId]/complete
// Mark session as COMPLETED
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: brandAssetId, sessionId } = await params;

    const session = await prisma.aIBrandAnalysisSession.findFirst({
      where: { id: sessionId, brandAssetId, workspaceId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Session is already ${session.status.toLowerCase()}` },
        { status: 409 },
      );
    }

    const updated = await prisma.aIBrandAnalysisSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    });

    // Also mark AI_EXPLORATION research method as COMPLETED
    await prisma.brandAssetResearchMethod.updateMany({
      where: {
        brandAssetId,
        method: "AI_EXPLORATION",
      },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/ai-analysis/:sessionId/complete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
