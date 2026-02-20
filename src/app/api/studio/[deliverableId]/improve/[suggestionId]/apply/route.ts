import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string; suggestionId: string }> };

// POST /api/studio/[deliverableId]/improve/[suggestionId]/apply — Apply suggestion
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

    // Update suggestion status to APPLIED
    await prisma.improveSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'APPLIED' },
    });

    // If suggestion has suggestedText and deliverable has generatedText, do replacement
    let updatedText = deliverable.generatedText;
    if (suggestion.suggestedText && suggestion.currentText && deliverable.generatedText) {
      updatedText = deliverable.generatedText.replace(
        suggestion.currentText,
        suggestion.suggestedText,
      );
    }

    // Add impactPoints to qualityScore
    const newScore = Math.min(100, (deliverable.qualityScore ?? 0) + suggestion.impactPoints);

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        qualityScore: newScore,
        ...(updatedText !== deliverable.generatedText ? { generatedText: updatedText } : {}),
      },
    });

    return NextResponse.json({
      suggestion: {
        id: suggestion.id,
        status: 'APPLIED',
      },
      qualityScore: newScore,
    });
  } catch (error) {
    console.error('POST /api/studio/.../improve/.../apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
