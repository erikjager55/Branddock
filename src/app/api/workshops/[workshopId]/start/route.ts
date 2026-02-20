import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ workshopId: string }> };

// =============================================================
// POST /api/workshops/[workshopId]/start
// Start workshop (status → IN_PROGRESS)
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    if (workshop.status !== "PURCHASED" && workshop.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: `Cannot start workshop with status ${workshop.status}` },
        { status: 409 },
      );
    }

    const updated = await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        status: "IN_PROGRESS",
        currentStep: 1,
        timerSeconds: 0,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
    });
  } catch (error) {
    console.error("[POST /api/workshops/:workshopId/start]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
