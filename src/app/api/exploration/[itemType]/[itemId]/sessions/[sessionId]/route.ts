import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';

// ─── GET /api/exploration/[itemType]/[itemId]/sessions/[sessionId] ──
// Fetch an exploration session with all messages.
// ────────────────────────────────────────────────────────────

export async function GET(
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

    const { itemType, sessionId } = await params;

    const config = getItemTypeConfig(itemType);
    if (!config) {
      return NextResponse.json(
        { error: `Item type "${itemType}" not supported` },
        { status: 501 },
      );
    }

    const session = await prisma.aIPersonaAnalysisSession.findFirst({
      where: { id: sessionId, workspaceId },
      include: {
        messages: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      progress: session.progress,
      totalDimensions: session.totalDimensions,
      answeredDimensions: session.answeredDimensions,
      insightsData: session.insightsData,
      createdAt: session.createdAt.toISOString(),
      messages: session.messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        orderIndex: m.orderIndex,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[GET /api/exploration/.../session]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
