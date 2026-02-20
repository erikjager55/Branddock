import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ workshopId: string }> };

// =============================================================
// GET /api/workshops/[workshopId]/report/raw
// Raw data export (JSON)
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
        steps: { orderBy: { stepNumber: "asc" } },
        findings: { orderBy: { order: "asc" } },
        recommendations: { orderBy: { order: "asc" } },
        participants: true,
        notes: { orderBy: { createdAt: "desc" } },
        photos: { orderBy: { order: "asc" } },
        objectives: { orderBy: { order: "asc" } },
        agendaItems: { orderBy: { order: "asc" } },
        brandAsset: { select: { id: true, name: true, category: true } },
      },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json({ workshop });
  } catch (error) {
    console.error("[GET /api/workshops/:workshopId/report/raw]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
