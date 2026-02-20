import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id]/coverage — Calculate knowledge coverage
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

    const totalAssets = assets.length;
    const validatedAssets = assets.filter(
      (a) => a.validationStatus === "Validated"
    ).length;

    const coveragePercent =
      totalAssets > 0 ? Math.round((validatedAssets / totalAssets) * 100) : 0;

    return NextResponse.json({
      coveragePercent,
      totalAssets,
      validatedAssets,
    });
  } catch (error) {
    console.error("[GET /api/campaigns/:id/coverage]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
