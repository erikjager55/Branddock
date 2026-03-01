import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { requireUnlocked } from '@/lib/lock-guard';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';
import { resolveExplorationConfig } from '@/lib/ai/exploration/config-resolver';
import { resolveTemplate } from '@/lib/ai/exploration/prompt-engine';
import { resolveItemSubType } from '@/lib/ai/exploration/constants';

// ─── POST /api/exploration/[itemType]/[itemId]/analyze ──────
// Start a new exploration session for any item type.
// Delegates to item-type specific config for questions, intro, etc.
// ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
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

    // Parse optional modelId from request body
    let modelId: string | null = null;
    try {
      const body = await request.json();
      if (body.modelId && typeof body.modelId === 'string') {
        modelId = body.modelId;
      }
    } catch {
      // No body or invalid JSON — use default model
    }

    // Resolve config-driven dimensions + intro
    const itemSubType = resolveItemSubType(item as Record<string, unknown>);
    const explorationConfig = await resolveExplorationConfig(workspaceId, itemType, itemSubType);
    const dimensions = explorationConfig.dimensions;
    const totalDimensions = dimensions.length;

    const introContent = resolveTemplate(
      `Welcome to the AI Exploration for **{{itemName}}**${(item as Record<string, unknown>)?.description ? ` — {{itemDescription}}` : ''}. I'll guide you through ${totalDimensions} key dimensions. Let's begin!`,
      {
        itemName: ((item as Record<string, unknown>)?.name as string) ?? 'this item',
        itemDescription: ((item as Record<string, unknown>)?.description as string) ?? '',
      },
    );
    const firstQuestion = dimensions[0];

    // Create generic exploration session
    const explorationSession = await prisma.explorationSession.create({
      data: {
        itemType,
        itemId,
        status: 'IN_PROGRESS',
        progress: 0,
        totalDimensions,
        answeredDimensions: 0,
        modelId,
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
        sessionId: explorationSession.id,
        status: explorationSession.status,
        progress: explorationSession.progress,
        totalDimensions: explorationSession.totalDimensions,
        answeredDimensions: explorationSession.answeredDimensions,
        messages: explorationSession.messages.map((m) => ({
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
    console.error('[POST /api/exploration] Error:', error instanceof Error ? error.message : error);

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
