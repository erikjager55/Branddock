import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';
import { resolveExplorationConfig } from '@/lib/ai/exploration/config-resolver';
import { buildBrandContextString, resolveTemplate, formatAllAnswers } from '@/lib/ai/exploration/prompt-engine';
import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';

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

    // Resolve config + generate AI report
    const slug = (item as Record<string, unknown>)?.slug as string | undefined ?? null;
    const explorationConfig = await resolveExplorationConfig(workspaceId, itemType, slug);

    // Get all messages for report context
    const allMessages = await prisma.explorationMessage.findMany({
      where: { sessionId },
      orderBy: { orderIndex: 'asc' },
    });

    const brandContext = await buildBrandContextString(workspaceId);
    const allAnswers = formatAllAnswers(
      allMessages.map(m => ({
        type: m.type,
        content: m.content,
        metadata: m.metadata as Record<string, unknown> | null,
      })),
    );

    const reportSystemPrompt = resolveTemplate(explorationConfig.systemPrompt, {
      itemName: ((item as Record<string, unknown>)?.name as string) ?? 'Unknown',
      itemType,
      brandContext,
      customKnowledge: explorationConfig.customKnowledge,
    });

    const reportUserPrompt = resolveTemplate(explorationConfig.reportPrompt, {
      itemName: ((item as Record<string, unknown>)?.name as string) ?? 'Unknown',
      itemDescription: ((item as Record<string, unknown>)?.description as string) ?? '',
      itemType,
      allAnswers,
      brandContext,
      customKnowledge: explorationConfig.customKnowledge,
    });

    let insightsData: Record<string, unknown>;
    try {
      const reportResponse = await generateAIResponse(
        explorationConfig.provider,
        explorationConfig.model,
        reportSystemPrompt,
        reportUserPrompt,
        0.3,
        explorationConfig.maxTokens,
      );
      const cleaned = reportResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insightsData = JSON.parse(cleaned);
    } catch (err) {
      console.warn('[exploration-report] AI report failed, using builder fallback:', err);
      insightsData = await config.generateInsights(item, analysisSession);
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
