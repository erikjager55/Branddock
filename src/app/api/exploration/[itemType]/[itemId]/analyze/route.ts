import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { requireUnlocked } from '@/lib/lock-guard';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';

// ─── POST /api/exploration/[itemType]/[itemId]/analyze ──────
// Start a new exploration session for any item type.
// Delegates to item-type specific config for questions, intro, etc.
// ────────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemType, itemId } = await params;

    // Get item-type specific config
    const config = getItemTypeConfig(itemType);
    if (!config) {
      return NextResponse.json(
        { error: `Item type "${itemType}" is not yet supported for AI Exploration` },
        { status: 501 },
      );
    }

    // Lock guard
    const lockResponse = await requireUnlocked(config.lockType as Parameters<typeof requireUnlocked>[0], itemId);
    if (lockResponse) return lockResponse;

    // Verify item exists and belongs to workspace
    const item = await config.fetchItem(itemId, workspaceId);
    if (!item) {
      return NextResponse.json(
        { error: `${itemType} not found` },
        { status: 404 },
      );
    }

    // Build intro + first question
    const dimensions = config.getDimensions();
    const totalDimensions = dimensions.length;
    const introContent = config.buildIntro(item);
    const firstQuestion = dimensions[0];

    // Create session using the existing AIPersonaAnalysisSession model
    // (We reuse this model for now; Phase 2 will create a generic ExplorationSession model)
    const analysisSession = await prisma.aIPersonaAnalysisSession.create({
      data: {
        status: 'IN_PROGRESS',
        progress: 0,
        totalDimensions,
        answeredDimensions: 0,
        personaId: itemId, // Required by schema — works for persona, needs generic model later
        workspaceId,
        createdById: session.user.id,
        messages: {
          create: [
            {
              type: 'SYSTEM_INTRO',
              content: introContent,
              orderIndex: 0,
            },
            {
              type: 'AI_QUESTION',
              content: firstQuestion.question,
              orderIndex: 1,
              metadata: {
                dimensionKey: firstQuestion.key,
                dimensionTitle: firstQuestion.title,
              },
            },
          ],
        },
      },
      include: {
        messages: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return NextResponse.json(
      {
        sessionId: analysisSession.id,
        status: analysisSession.status,
        progress: analysisSession.progress,
        totalDimensions: analysisSession.totalDimensions,
        answeredDimensions: analysisSession.answeredDimensions,
        messages: analysisSession.messages.map((m) => ({
          id: m.id,
          type: m.type,
          content: m.content,
          orderIndex: m.orderIndex,
          metadata: m.metadata,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(`[POST /api/exploration] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
