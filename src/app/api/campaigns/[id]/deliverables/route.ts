import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id]/deliverables — List deliverables ordered by createdAt
// ---------------------------------------------------------------------------
export async function GET(
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

    const deliverables = await prisma.deliverable.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        contentType: d.contentType,
        status: d.status,
        progress: d.progress,
        qualityScore: d.qualityScore,
        assignedTo: d.assignedTo,
        isFavorite: d.isFavorite,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/campaigns/:id/deliverables]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/deliverables — Add deliverable
// ---------------------------------------------------------------------------
const createDeliverableSchema = z.object({
  title: z.string().min(1, "title is required"),
  contentType: z.string().min(1, "contentType is required"),
});

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = createDeliverableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        title: parsed.data.title,
        contentType: parsed.data.contentType,
        status: "NOT_STARTED",
        progress: 0,
        campaignId: id,
      },
    });

    return NextResponse.json(
      {
        id: deliverable.id,
        title: deliverable.title,
        contentType: deliverable.contentType,
        status: deliverable.status,
        progress: deliverable.progress,
        qualityScore: deliverable.qualityScore,
        assignedTo: deliverable.assignedTo,
        isFavorite: deliverable.isFavorite,
        createdAt: deliverable.createdAt.toISOString(),
        updatedAt: deliverable.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/campaigns/:id/deliverables]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
