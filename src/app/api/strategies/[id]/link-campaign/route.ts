import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";

type RouteParams = { params: Promise<{ id: string }> };

const linkCampaignSchema = z.object({
  campaignId: z.string().min(1),
});

// =============================================================
// POST /api/strategies/[id]/link-campaign — link a campaign
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked("businessStrategy", id);
    if (lockResponse) return lockResponse;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = linkCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { campaignId } = parsed.data;

    // Verify campaign belongs to same workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Upsert to avoid duplicate error
    await prisma.campaignStrategy.upsert({
      where: {
        strategyId_campaignId: { strategyId: id, campaignId },
      },
      create: { strategyId: id, campaignId },
      update: {},
    });

    return NextResponse.json({
      linked: {
        campaignId: campaign.id,
        title: campaign.title,
        type: campaign.type,
        status: campaign.status,
        slug: campaign.slug,
      },
    });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/link-campaign]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
