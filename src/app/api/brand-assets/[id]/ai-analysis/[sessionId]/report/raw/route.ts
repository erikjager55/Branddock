import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

// =============================================================
// GET /api/brand-assets/[id]/ai-analysis/[sessionId]/report/raw
// Get full session + messages + reportData
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
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        progress: session.progress,
        totalQuestions: session.totalQuestions,
        answeredQuestions: session.answeredQuestions,
        locked: session.locked,
        completedAt: session.completedAt?.toISOString() ?? null,
        lastUpdatedAt: session.lastUpdatedAt?.toISOString() ?? null,
        brandAssetId: session.brandAssetId,
        workspaceId: session.workspaceId,
        createdById: session.createdById,
        personaId: session.personaId,
        createdAt: session.createdAt.toISOString(),
      },
      messages: session.messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        orderIndex: m.orderIndex,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
      reportData: session.reportData,
    });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/ai-analysis/:sessionId/report/raw]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
