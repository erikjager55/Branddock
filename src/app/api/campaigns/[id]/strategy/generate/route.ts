import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { buildAllPersonasContext } from "@/lib/ai/persona-context";

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/strategy/generate — Generate campaign strategy
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

    // Fetch persona context for the workspace
    const personaContext = await buildAllPersonasContext(workspaceId);

    // Build audience insights from persona data
    const targetAudienceInsights = personaContext.count > 0
      ? `Target audience analysis based on ${personaContext.count} persona${personaContext.count !== 1 ? 's' : ''}. Primary segments show high engagement potential with content-driven strategies across digital channels.\n\n${personaContext.text}`
      : "Target audience analysis based on your campaign objectives. Primary segments show high engagement potential with content-driven strategies across digital channels.";

    // Enrich key messages when personas are available
    const keyMessages = personaContext.count > 0
      ? [
          "Key message 1: Reinforce brand value proposition aligned with persona goals",
          "Key message 2: Address target audience pain points and frustrations",
          "Key message 3: Differentiate from competitors using persona-driven insights",
        ]
      : [
          "Key message 1: Reinforce brand value proposition",
          "Key message 2: Address target audience pain points",
          "Key message 3: Differentiate from competitors",
        ];

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        strategyConfidence: personaContext.count > 0 ? 88 : 75,
        strategicApproach: personaContext.count > 0
          ? `AI-generated strategic approach based on your brand assets, ${personaContext.count} target persona${personaContext.count !== 1 ? 's' : ''}, and campaign objectives. This strategy leverages your unique brand positioning and persona insights to maximize engagement and deliver measurable results.`
          : "AI-generated strategic approach based on your brand assets and campaign objectives. This strategy leverages your unique brand positioning to maximize engagement and deliver measurable results.",
        keyMessages,
        targetAudienceInsights,
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
      personaCount: personaContext.count,
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
