import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/content-library/[id]/favorite — toggle isFavorite
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Verify the deliverable belongs to a campaign in this workspace
    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: {
        campaign: {
          select: { workspaceId: true },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 },
      );
    }

    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: { isFavorite: !deliverable.isFavorite },
      select: { isFavorite: true },
    });

    return NextResponse.json({ isFavorite: updated.isFavorite });
  } catch (error) {
    console.error("[PATCH /api/content-library/[id]/favorite]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
