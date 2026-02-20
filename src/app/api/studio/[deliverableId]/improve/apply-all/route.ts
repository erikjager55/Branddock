import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// POST /api/studio/[deliverableId]/improve/apply-all — Apply all pending suggestions
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const pendingSuggestions = await prisma.improveSuggestion.findMany({
      where: {
        deliverableId,
        status: 'PENDING',
      },
    });

    if (pendingSuggestions.length === 0) {
      return NextResponse.json({
        appliedCount: 0,
        qualityScore: deliverable.qualityScore ?? 0,
      });
    }

    // Apply text replacements sequentially
    let currentText = deliverable.generatedText;
    let totalImpact = 0;

    for (const suggestion of pendingSuggestions) {
      // Update status to APPLIED
      await prisma.improveSuggestion.update({
        where: { id: suggestion.id },
        data: { status: 'APPLIED' },
      });

      // Replace text if applicable
      if (suggestion.suggestedText && suggestion.currentText && currentText) {
        currentText = currentText.replace(suggestion.currentText, suggestion.suggestedText);
      }

      totalImpact += suggestion.impactPoints;
    }

    // Update deliverable quality score
    const newScore = Math.min(100, (deliverable.qualityScore ?? 0) + totalImpact);

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        qualityScore: newScore,
        ...(currentText !== deliverable.generatedText ? { generatedText: currentText } : {}),
      },
    });

    return NextResponse.json({
      appliedCount: pendingSuggestions.length,
      qualityScore: newScore,
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/improve/apply-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
