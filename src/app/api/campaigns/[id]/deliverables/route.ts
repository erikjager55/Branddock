import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { requireUnlocked } from "@/lib/lock-guard";

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
        settings: d.settings,
        approvalStatus: d.approvalStatus ?? 'DRAFT',
        approvalNote: d.approvalNote ?? null,
        approvedBy: d.approvedBy ?? null,
        approvedAt: d.approvedAt?.toISOString() ?? null,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        scheduledPublishDate: d.scheduledPublishDate?.toISOString() ?? null,
        derivedFromId: d.derivedFromId ?? null,
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
  title: z.string().trim().min(1, "title is required").max(200),
  contentType: z.string().min(1, "contentType is required"),
  settings: z.object({
    phase: z.string().optional(),
    channel: z.string().optional(),
    targetPersonas: z.array(z.string()).optional(),
    productionPriority: z.enum(['must-have', 'should-have', 'nice-to-have']).optional(),
    brief: z.object({
      objective: z.string().max(2000).optional(),
      keyMessage: z.string().max(2000).optional(),
      toneDirection: z.string().max(2000).optional(),
      callToAction: z.string().max(2000).optional(),
      contentOutline: z.array(z.string()).optional(),
    }).optional(),
    contentTypeInputs: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])).optional(),
  }).optional(),
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

    const lockResponse = await requireUnlocked("campaign", id);
    if (lockResponse) return lockResponse;

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
        ...(parsed.data.settings ? { settings: parsed.data.settings } : {}),
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
        settings: deliverable.settings,
        approvalStatus: deliverable.approvalStatus ?? 'DRAFT',
        approvalNote: deliverable.approvalNote ?? null,
        approvedBy: deliverable.approvedBy ?? null,
        approvedAt: deliverable.approvedAt?.toISOString() ?? null,
        publishedAt: deliverable.publishedAt?.toISOString() ?? null,
        scheduledPublishDate: deliverable.scheduledPublishDate?.toISOString() ?? null,
        derivedFromId: deliverable.derivedFromId ?? null,
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
