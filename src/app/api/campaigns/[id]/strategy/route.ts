import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import type { CampaignBlueprint } from '@/lib/campaigns/strategy-blueprint.types';

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id]/strategy — Return campaign strategy / blueprint
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const personaCount = await prisma.persona.count({ where: { workspaceId } });

    const strategyJson = campaign.strategy as Record<string, unknown> | null;

    // Detect new blueprint format: has strategy.campaignTheme
    const isBlueprint = typeof (strategyJson?.strategy as Record<string, unknown> | undefined)?.campaignTheme === 'string';

    if (isBlueprint) {
      // New CampaignBlueprint format
      const blueprint = strategyJson as unknown as CampaignBlueprint;
      return NextResponse.json({
        format: 'blueprint',
        blueprint,
        confidence: campaign.strategyConfidence,
        generatedAt: campaign.strategyGeneratedAt?.toISOString() ?? null,
        personaCount,
      });
    }

    // Legacy flat format (backward compat)
    return NextResponse.json({
      format: 'legacy',
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
    console.error('[GET /api/campaigns/:id/strategy]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
