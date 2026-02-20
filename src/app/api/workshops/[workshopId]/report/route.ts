import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ workshopId: string }> };

// =============================================================
// GET /api/workshops/[workshopId]/report
// Get AI report (executiveSummary + findings + recommendations + canvasData)
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      include: {
        findings: { orderBy: { order: "asc" } },
        recommendations: { orderBy: { order: "asc" } },
      },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json({
      reportGenerated: workshop.reportGenerated,
      executiveSummary: workshop.executiveSummary,
      findings: workshop.findings,
      recommendations: workshop.recommendations,
      canvasData: workshop.canvasData,
      canvasLocked: workshop.canvasLocked,
    });
  } catch (error) {
    console.error("[GET /api/workshops/:workshopId/report]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
