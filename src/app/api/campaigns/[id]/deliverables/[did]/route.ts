import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PATCH /api/campaigns/[id]/deliverables/[did] — Update deliverable
// ---------------------------------------------------------------------------
const patchDeliverableSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  assignedTo: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, did } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify deliverable belongs to campaign
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: did, campaignId: id },
    });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchDeliverableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, status, progress, assignedTo } = parsed.data;

    const updated = await prisma.deliverable.update({
      where: { id: did },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(assignedTo !== undefined && { assignedTo }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      contentType: updated.contentType,
      status: updated.status,
      progress: updated.progress,
      qualityScore: updated.qualityScore,
      assignedTo: updated.assignedTo,
      isFavorite: updated.isFavorite,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/campaigns/:id/deliverables/:did]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/campaigns/[id]/deliverables/[did] — Remove deliverable
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, did } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify deliverable belongs to campaign
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: did, campaignId: id },
    });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    await prisma.deliverable.delete({ where: { id: did } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/campaigns/:id/deliverables/:did]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
