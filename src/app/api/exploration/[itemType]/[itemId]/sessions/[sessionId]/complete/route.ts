import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';

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

    const analysisSession = await prisma.aIPersonaAnalysisSession.findFirst({
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

    // Generate insights data (report + field suggestions)
    const insightsData = await config.generateInsights(item, analysisSession);

    // Mark session as completed
    await prisma.aIPersonaAnalysisSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        answeredDimensions: config.getDimensions().length,
        insightsData: insightsData as unknown as Record<string, never>,
        completedAt: new Date(),
      },
    });

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
    console.error('[POST /api/exploration/.../complete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
