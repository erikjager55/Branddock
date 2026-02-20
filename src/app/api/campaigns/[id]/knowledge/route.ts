import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id]/knowledge — List CampaignKnowledgeAsset for campaign
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

    const assets = await prisma.campaignKnowledgeAsset.findMany({
      where: { campaignId: id },
    });

    return NextResponse.json({
      assets: assets.map((a) => ({
        id: a.id,
        assetName: a.assetName,
        assetType: a.assetType,
        validationStatus: a.validationStatus,
        isAutoSelected: a.isAutoSelected,
        brandAssetId: a.brandAssetId,
        personaId: a.personaId,
        productId: a.productId,
        insightId: a.insightId,
      })),
    });
  } catch (error) {
    console.error("[GET /api/campaigns/:id/knowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/knowledge — Add knowledge asset to campaign
// ---------------------------------------------------------------------------
const addAssetSchema = z.object({
  assetName: z.string().min(1, "assetName is required"),
  assetType: z.string().min(1, "assetType is required"),
  brandAssetId: z.string().optional(),
  personaId: z.string().optional(),
  productId: z.string().optional(),
  insightId: z.string().optional(),
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
    const parsed = addAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await prisma.campaignKnowledgeAsset.create({
      data: {
        campaignId: id,
        assetName: parsed.data.assetName,
        assetType: parsed.data.assetType,
        brandAssetId: parsed.data.brandAssetId ?? null,
        personaId: parsed.data.personaId ?? null,
        productId: parsed.data.productId ?? null,
        insightId: parsed.data.insightId ?? null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns/:id/knowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
