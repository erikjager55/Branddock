import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';

// ─── GET /api/exploration/[itemType]/[itemId]/latest ─────────
// Fetch the most recent exploration session for an item.
// Returns { session, messages } or { session: null }.
// ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { itemType, itemId } = await params;

    const config = getItemTypeConfig(itemType);
    if (!config) {
      return NextResponse.json(
        { error: `Item type "${itemType}" not supported` },
        { status: 501 },
      );
    }

    const session = await prisma.explorationSession.findFirst({
      where: { itemType, itemId, workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        progress: session.progress,
        totalDimensions: session.totalDimensions,
        answeredDimensions: session.answeredDimensions,
        insightsData: session.insightsData,
        metadata: session.metadata,
        createdAt: session.createdAt.toISOString(),
        messages: session.messages.map((m) => ({
          id: m.id,
          type: m.type,
          content: m.content,
          orderIndex: m.orderIndex,
          metadata: m.metadata,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('[GET /api/exploration/.../latest]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
