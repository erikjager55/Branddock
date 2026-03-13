import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireUnlocked } from '@/lib/lock-guard';
import { regenerateBlueprintLayer } from '@/lib/campaigns/strategy-chain';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { CampaignBlueprint } from '@/lib/campaigns/strategy-blueprint.types';

const bodySchema = z.object({
  layer: z.enum(['strategy', 'architecture', 'channelPlan', 'assetPlan']),
  feedback: z.string().default(''),
});

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/strategy/regenerate — Regenerate a specific layer
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked('campaign', id);
    if (lockResponse) return lockResponse;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Validate body
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Get existing blueprint from campaign.strategy JSON field
    const existingBlueprint = campaign.strategy as unknown as CampaignBlueprint | null;
    if (!existingBlueprint?.strategy?.campaignTheme) {
      return NextResponse.json(
        { error: 'No existing blueprint found. Generate a strategy first.' },
        { status: 400 },
      );
    }

    const updatedBlueprint = await regenerateBlueprintLayer(
      workspaceId,
      id,
      existingBlueprint,
      parsed.data.layer,
      parsed.data.feedback,
    );

    // Save updated blueprint
    await prisma.campaign.update({
      where: { id },
      data: {
        strategy: JSON.parse(JSON.stringify(updatedBlueprint)),
        strategyConfidence: updatedBlueprint.confidence,
        strategicApproach: updatedBlueprint.strategy.positioningStatement,
        keyMessages: [
          updatedBlueprint.strategy.messagingHierarchy.brandMessage,
          updatedBlueprint.strategy.messagingHierarchy.campaignMessage,
          ...updatedBlueprint.strategy.messagingHierarchy.proofPoints.slice(0, 3),
        ],
        targetAudienceInsights: updatedBlueprint.personaValidation.length > 0
          ? updatedBlueprint.personaValidation.map(p => `${p.personaName}: ${p.feedback}`).join('\n')
          : updatedBlueprint.strategy.jtbdFraming.jobStatement,
        recommendedChannels: updatedBlueprint.channelPlan.channels.map(c => c.name),
        strategyGeneratedAt: new Date(),
      },
    });

    // Invalidate caches
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(updatedBlueprint);
  } catch (error) {
    console.error('[POST /api/campaigns/:id/strategy/regenerate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
