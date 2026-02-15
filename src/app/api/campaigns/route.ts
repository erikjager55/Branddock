import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CampaignWithMeta, CampaignListResponse, CampaignAsset, CampaignDeliverable } from "@/types/campaign";

// =============================================================
// GET /api/campaigns?workspaceId=xxx&status=ready&...
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "updatedAt";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    const where: Record<string, unknown> = { workspaceId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { objective: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderByMap: Record<string, string> = {
      name: "name",
      status: "status",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    };
    const orderByField = orderByMap[sortBy] ?? "updatedAt";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    const dbCampaigns = await prisma.campaign.findMany({ where, orderBy });

    const campaigns: CampaignWithMeta[] = dbCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      objective: c.objective,
      budgetMin: c.budgetMin,
      budgetMax: c.budgetMax,
      channels: (c.channels as CampaignWithMeta["channels"]) ?? null,
      assets: (c.assets as CampaignAsset[]) ?? [],
      deliverables: (c.deliverables as CampaignDeliverable[]) ?? [],
      modifiedBy: c.modifiedBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const response: CampaignListResponse = {
      campaigns,
      stats: {
        total: campaigns.length,
        ready: campaigns.filter((c) => c.status === "ready").length,
        draft: campaigns.filter((c) => c.status === "draft").length,
        generating: campaigns.filter((c) => c.status === "generating").length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/campaigns
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, objective, budgetMin, budgetMax, channels, assets, deliverables, workspaceId } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "name and workspaceId are required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        type: type ?? "campaign-strategy",
        objective: objective ?? null,
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
        channels: channels ?? undefined,
        assets: assets ?? [],
        deliverables: deliverables ?? [],
        workspaceId,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/campaigns  { id, ...updates }
// =============================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[PATCH /api/campaigns]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
