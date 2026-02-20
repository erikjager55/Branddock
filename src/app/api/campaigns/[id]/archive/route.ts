import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// PATCH /api/campaigns/[id]/archive — Toggle isArchived boolean
// ---------------------------------------------------------------------------
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { isArchived: !campaign.isArchived },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      isArchived: updated.isArchived,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/campaigns/:id/archive]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
