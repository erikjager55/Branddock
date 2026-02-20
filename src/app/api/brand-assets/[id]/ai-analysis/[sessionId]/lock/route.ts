import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

// =============================================================
// PATCH /api/brand-assets/[id]/ai-analysis/[sessionId]/lock
// Toggle lock/unlock session
// =============================================================
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
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

    const updated = await prisma.aIBrandAnalysisSession.update({
      where: { id: sessionId },
      data: {
        locked: !session.locked,
        lastUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      locked: updated.locked,
      sessionId: updated.id,
    });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/ai-analysis/:sessionId/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
