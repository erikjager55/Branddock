import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/improve — List improvement suggestions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: {
        qualityScore: true,
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const suggestions = await prisma.improveSuggestion.findMany({
      where: {
        deliverableId,
        status: { not: 'DISMISSED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentScore = deliverable.qualityScore ?? 0;
    const pendingImpact = suggestions
      .filter((s) => s.status === 'PENDING')
      .reduce((sum, s) => sum + s.impactPoints, 0);

    return NextResponse.json({
      currentScore,
      targetScore: 95,
      potentialScore: Math.min(100, currentScore + pendingImpact),
      suggestions: suggestions.map((s) => ({
        id: s.id,
        metric: s.metric,
        impactPoints: s.impactPoints,
        currentText: s.currentText,
        suggestedText: s.suggestedText,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/improve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
