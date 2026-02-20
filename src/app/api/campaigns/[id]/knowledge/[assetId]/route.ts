import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// DELETE /api/campaigns/[id]/knowledge/[assetId] — Delete CampaignKnowledgeAsset
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, assetId } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify asset belongs to the campaign
    const asset = await prisma.campaignKnowledgeAsset.findFirst({
      where: { id: assetId, campaignId: id },
    });
    if (!asset) {
      return NextResponse.json({ error: "Knowledge asset not found" }, { status: 404 });
    }

    await prisma.campaignKnowledgeAsset.delete({ where: { id: assetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/campaigns/:id/knowledge/:assetId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
