import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/strategy/generate — Generate placeholder strategy
// ---------------------------------------------------------------------------
export async function POST(
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
      data: {
        strategyConfidence: 85,
        strategicApproach: "AI-generated strategic approach based on your brand assets, target audience, and campaign objectives. This strategy leverages your unique brand positioning to maximize engagement and deliver measurable results.",
        keyMessages: [
          "Key message 1: Reinforce brand value proposition",
          "Key message 2: Address target audience pain points",
          "Key message 3: Differentiate from competitors",
        ],
        targetAudienceInsights:
          "Target audience analysis based on your persona data and market insights. Primary segments show high engagement potential with content-driven strategies across digital channels.",
        recommendedChannels: ["Social Media", "Email", "Content Marketing"],
        strategyGeneratedAt: new Date(),
      },
      include: {
        deliverables: { orderBy: { createdAt: "asc" } },
        knowledgeAssets: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      type: updated.type,
      status: updated.status,
      strategyConfidence: updated.strategyConfidence,
      strategicApproach: updated.strategicApproach,
      keyMessages: updated.keyMessages,
      targetAudienceInsights: updated.targetAudienceInsights,
      recommendedChannels: updated.recommendedChannels,
      strategyGeneratedAt: updated.strategyGeneratedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      deliverables: updated.deliverables.map((d) => ({
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
      knowledgeAssets: updated.knowledgeAssets.map((ka) => ({
        id: ka.id,
        assetName: ka.assetName,
        assetType: ka.assetType,
        validationStatus: ka.validationStatus,
        isAutoSelected: ka.isAutoSelected,
        brandAssetId: ka.brandAssetId,
        personaId: ka.personaId,
        productId: ka.productId,
        insightId: ka.insightId,
      })),
    });
  } catch (error) {
    console.error("[POST /api/campaigns/:id/strategy/generate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
