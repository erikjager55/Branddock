import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/personas/[id]/ai-analysis/[sessionId] — get session + messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, sessionId } = await params;

    const analysisSession = await prisma.aIPersonaAnalysisSession.findFirst({
      where: { id: sessionId, personaId: id, workspaceId },
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!analysisSession) {
      return NextResponse.json({ error: "Analysis session not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: analysisSession.id,
      status: analysisSession.status,
      progress: analysisSession.progress,
      totalDimensions: analysisSession.totalDimensions,
      answeredDimensions: analysisSession.answeredDimensions,
      insightsData: analysisSession.insightsData,
      messages: analysisSession.messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        orderIndex: m.orderIndex,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
      createdAt: analysisSession.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/personas/:id/ai-analysis/:sessionId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
