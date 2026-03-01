import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';
import { resolveExplorationConfig } from '@/lib/ai/exploration/config-resolver';
import { resolveItemSubType } from '@/lib/ai/exploration/constants';
import { createVersion } from '@/lib/versioning';
import { buildPersonaSnapshot, buildBrandAssetSnapshot } from '@/lib/snapshot-builders';
import type { VersionedResourceType } from '@prisma/client';

// ─── POST /api/exploration/[itemType]/[itemId]/sessions/[sessionId]/complete ──
export async function POST(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      itemType: string;
      itemId: string;
      sessionId: string;
    }>;
  },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { itemType, itemId, sessionId } = await params;

    const config = getItemTypeConfig(itemType);
    if (!config) {
      return NextResponse.json(
        { error: `Item type "${itemType}" not supported` },
        { status: 501 },
      );
    }

    const analysisSession = await prisma.explorationSession.findFirst({
      where: { id: sessionId, workspaceId },
    });

    if (!analysisSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (analysisSession.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Already completed' }, { status: 400 });
    }

    // Fetch item data for report generation
    const item = await config.fetchItem(itemId, workspaceId);
    if (!item) {
      return NextResponse.json({ error: `${itemType} not found` }, { status: 404 });
    }

    // Resolve config for dimension count
    const itemSubType = resolveItemSubType(item as Record<string, unknown>);
    const explorationConfig = await resolveExplorationConfig(workspaceId, itemType, itemSubType);

    // Generate report via the item type builder — this ensures fieldSuggestions
    // include id, currentValue, and status fields that the frontend needs.
    let insightsData: Record<string, unknown>;
    try {
      insightsData = await config.generateInsights(item, analysisSession);
    } catch (err) {
      console.error('[exploration-complete] generateInsights failed:', err);
      throw err;
    }

    // Mark session as completed
    await prisma.explorationSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        answeredDimensions: explorationConfig.dimensions.length,
        insightsData: insightsData as unknown as Record<string, never>,
        completedAt: new Date(),
      },
    });

    // Create AI_GENERATED version snapshot
    try {
      const snapshotBuilders: Record<string, (data: Record<string, unknown>) => Record<string, unknown>> = {
        persona: (d) => buildPersonaSnapshot(d as never),
        brand_asset: (d) => buildBrandAssetSnapshot(d as never),
      };
      const resourceTypeMap: Record<string, VersionedResourceType> = {
        persona: 'PERSONA',
        brand_asset: 'BRAND_ASSET',
      };
      const builder = snapshotBuilders[itemType];
      const resType = resourceTypeMap[itemType];
      if (builder && resType) {
        const freshItem = await config.fetchItem(itemId, workspaceId);
        if (freshItem) {
          await createVersion({
            resourceType: resType,
            resourceId: itemId,
            snapshot: builder(freshItem),
            changeType: 'AI_GENERATED',
            changeNote: 'AI Exploration completed',
            userId: analysisSession.createdById,
            workspaceId,
          });
        }
      }
    } catch (versionError) {
      console.error('[Exploration complete version snapshot failed]', versionError);
    }

    // Update research method if applicable
    if (config.updateResearchMethod) {
      const validationPercentage = await config.updateResearchMethod(itemId, workspaceId);
      return NextResponse.json({
        status: 'COMPLETED',
        insightsData,
        researchBoost: 15,
        validationPercentage,
      });
    }

    return NextResponse.json({
      status: 'COMPLETED',
      insightsData,
      researchBoost: 0,
      validationPercentage: 0,
    });
  } catch (error) {
    console.error('[POST /api/exploration/.../complete] Full error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? {
          debug: error instanceof Error ? error.message : String(error),
        } : {}),
      },
      { status: 500 },
    );
  }
}
