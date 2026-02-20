import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string; suggestionId: string }> };

// POST /api/studio/[deliverableId]/improve/[suggestionId]/dismiss — Dismiss suggestion
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId, suggestionId } = await params;

    // Verify ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: { id: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const suggestion = await prisma.improveSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.deliverableId !== deliverableId) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    await prisma.improveSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'DISMISSED' },
    });

    return NextResponse.json({
      suggestion: {
        id: suggestion.id,
        status: 'DISMISSED',
      },
    });
  } catch (error) {
    console.error('POST /api/studio/.../improve/.../dismiss error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
