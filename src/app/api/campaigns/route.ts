import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { getCampaignStats, CAMPAIGN_LIST_SELECT } from "@/lib/db/queries";

// ---------------------------------------------------------------------------
// GET /api/campaigns — List campaigns with filters, counts, and stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // STRATEGIC | QUICK
    const status = searchParams.get("status"); // ACTIVE | COMPLETED | ARCHIVED
    const search = searchParams.get("search");
    const isArchivedParam = searchParams.get("isArchived");
    const isArchived = isArchivedParam === "true" ? true : false; // default false

    const where: Record<string, unknown> = { workspaceId, isArchived };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const dbCampaigns = await prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: CAMPAIGN_LIST_SELECT,
    });

    const campaigns = dbCampaigns.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      type: c.type,
      status: c.status,
      confidence: c.confidence,
      campaignGoalType: c.campaignGoalType,
      description: c.description,
      contentType: c.contentType,
      contentCategory: c.contentCategory,
      qualityScore: c.qualityScore,
      isArchived: c.isArchived,
      isLocked: c.isLocked,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      knowledgeAssetCount: c._count.knowledgeAssets,
      deliverableCount: c._count.deliverables,
      teamMemberCount: c._count.teamMembers,
    }));

    // Stats via count queries (no in-memory filtering)
    const stats = await getCampaignStats(workspaceId);

    return NextResponse.json({ campaigns, stats });
  } catch (error) {
    console.error("[GET /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/campaigns — Create a new campaign
// ---------------------------------------------------------------------------
const createSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  type: z.enum(["STRATEGIC", "QUICK"]).default("STRATEGIC"),
  campaignGoalType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, description, type, campaignGoalType, startDate, endDate } = parsed.data;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const campaign = await prisma.campaign.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        type,
        status: "ACTIVE",
        description: description ?? null,
        campaignGoalType: campaignGoalType ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        workspaceId,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/campaigns — Delete a campaign by id in body
// ---------------------------------------------------------------------------
const deleteSchema = z.object({
  id: z.string().min(1, "id is required"),
});

export async function DELETE(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: parsed.data.id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id: campaign.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
