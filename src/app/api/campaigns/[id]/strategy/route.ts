import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id]/strategy — Return campaign strategy fields
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

    // Count personas in workspace for context indicator
    const personaCount = await prisma.persona.count({ where: { workspaceId } });

    // strategy is a Json field that may contain coreConcept, channelMix, etc.
    const strategyJson = campaign.strategy as Record<string, unknown> | null;

    return NextResponse.json({
      coreConcept: strategyJson?.coreConcept ?? campaign.strategicApproach,
      channelMix: strategyJson?.channelMix ?? null,
      targetAudience: campaign.targetAudienceInsights,
      generatedAt: campaign.strategyGeneratedAt?.toISOString() ?? null,
      confidence: campaign.strategyConfidence,
      strategicApproach: campaign.strategicApproach,
      keyMessages: campaign.keyMessages,
      recommendedChannels: campaign.recommendedChannels,
      personaCount,
    });
  } catch (error) {
    console.error("[GET /api/campaigns/:id/strategy]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
