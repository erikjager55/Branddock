import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

// =============================================================
// GET /api/brand-assets/[id]/ai-analysis/[sessionId]/report
// Get report (poll until REPORT_READY)
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: brandAssetId, sessionId } = await params;

    const session = await prisma.aIBrandAnalysisSession.findFirst({
      where: { id: sessionId, brandAssetId, workspaceId },
      select: {
        id: true,
        status: true,
        reportData: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: session.status,
      reportData: session.reportData,
      ready: session.status === "REPORT_READY",
    });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/ai-analysis/:sessionId/report]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
