import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { scoreContentQuality, type QualityDimension } from '@/lib/studio/quality-scorer';
import { generateImproveSuggestions } from '@/lib/studio/improve-suggester';
import { buildGenerationContext } from '@/lib/studio/context-builder';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/improve — Generate or return improvement suggestions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId },
      },
      include: {
        campaign: {
          select: {
            workspaceId: true,
            title: true,
            campaignGoalType: true,
            strategy: true,
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Check for existing PENDING suggestions first
    const existingSuggestions = await prisma.improveSuggestion.findMany({
      where: {
        deliverableId,
        status: { not: 'DISMISSED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingSuggestions = existingSuggestions.filter((s) => s.status === 'PENDING');

    // If we already have pending suggestions, return them
    if (pendingSuggestions.length > 0) {
      const currentScore = deliverable.qualityScore ?? 0;
      const pendingImpact = pendingSuggestions.reduce((sum, s) => sum + s.impactPoints, 0);

      return NextResponse.json({
        currentScore,
        targetScore: 95,
        potentialScore: Math.min(100, currentScore + pendingImpact),
        suggestions: existingSuggestions.map((s) => ({
          id: s.id,
          metric: s.metric,
          impactPoints: s.impactPoints,
          currentText: s.currentText,
          suggestedText: s.suggestedText,
          reason: s.reason,
          status: s.status,
        })),
      });
    }

    // No pending suggestions — generate new ones if we have content
    const content = deliverable.generatedText;
    if (!content || content.trim().length < 50) {
      return NextResponse.json({
        currentScore: deliverable.qualityScore ?? 0,
        targetScore: 95,
        potentialScore: deliverable.qualityScore ?? 0,
        suggestions: existingSuggestions.map((s) => ({
          id: s.id,
          metric: s.metric,
          impactPoints: s.impactPoints,
          currentText: s.currentText,
          suggestedText: s.suggestedText,
          reason: s.reason,
          status: s.status,
        })),
      });
    }

    // Build context for suggestion generation
    const context = await buildGenerationContext(
      deliverable.campaign.workspaceId,
      [],
      {
        campaignTitle: deliverable.campaign.title,
        campaignGoalType: deliverable.campaign.campaignGoalType,
        strategy: deliverable.campaign.strategy as Record<string, unknown> | null,
      },
      deliverable.title,
    );

    // Get quality dimensions — use stored metrics or score fresh
    let dimensions: QualityDimension[];
    const storedMetrics = deliverable.qualityMetrics as Record<string, unknown> | null;

    // Check if qualityMetrics contains a ValidationResult (has 'score' + 'warnings')
    const hasValidationResult = storedMetrics &&
      typeof storedMetrics.score === 'number' && Array.isArray(storedMetrics.warnings);

    if (hasValidationResult) {
      // ValidationResult format from generate endpoint — score fresh for proper dimensions
      const result = await scoreContentQuality(
        content,
        context,
        deliverable.contentType,
        deliverable.title,
        workspaceId,
        deliverable.contentType,
      );
      dimensions = result.dimensions;

      // Persist in rich format for future reads
      const metricsObj: Record<string, { score: number; weight: number; explanation: string }> = {};
      for (const dim of result.dimensions) {
        metricsObj[dim.name] = { score: dim.score, weight: dim.weight, explanation: dim.explanation };
      }
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          qualityScore: result.overall,
          qualityMetrics: metricsObj,
        },
      });
    } else if (storedMetrics && Object.keys(storedMetrics).length > 0) {
      // Support both rich format { score, weight, explanation } and legacy flat format (number)
      const entries = Object.entries(storedMetrics);
      const isRichFormat = entries.length > 0 && typeof entries[0][1] === 'object' && entries[0][1] !== null;

      if (isRichFormat) {
        dimensions = entries.map(([name, val]) => {
          const rich = val as { score: number; weight: number; explanation: string };
          return { name, score: rich.score, weight: rich.weight, explanation: rich.explanation ?? '' };
        });
      } else {
        // Legacy flat format — look up type-specific criteria for correct weights
        const typeDef = getDeliverableTypeById(deliverable.contentType);
        const criteriaByName = new Map(
          (typeDef?.qualityCriteria ?? []).map((c) => [c.name, c.weight]),
        );
        const equalWeight = 1 / entries.length;
        dimensions = entries.map(([name, score]) => ({
          name,
          score: score as number,
          weight: criteriaByName.get(name) ?? equalWeight,
          explanation: '',
        }));
      }
    } else {
      // Score first, then suggest (pass contentType as deliverableTypeId for type-specific criteria)
      const result = await scoreContentQuality(
        content,
        context,
        deliverable.contentType,
        deliverable.title,
        workspaceId,
        deliverable.contentType,
      );
      dimensions = result.dimensions;

      // Save scores with weight and explanation for later retrieval
      const metricsObj: Record<string, { score: number; weight: number; explanation: string }> = {};
      for (const dim of result.dimensions) {
        metricsObj[dim.name] = { score: dim.score, weight: dim.weight, explanation: dim.explanation };
      }
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          qualityScore: result.overall,
          qualityMetrics: metricsObj,
        },
      });
    }

    // Generate suggestions via AI (pass contentType as deliverableTypeId for type-aware suggestions)
    const suggestionsData = await generateImproveSuggestions(
      content,
      dimensions,
      context,
      deliverable.contentType,
      workspaceId,
      deliverable.contentType,
    );

    // Delete old PENDING suggestions before inserting new ones
    await prisma.improveSuggestion.deleteMany({
      where: {
        deliverableId,
        status: 'PENDING',
      },
    });

    // Save new suggestions to DB
    const created = await Promise.all(
      suggestionsData.map((s) =>
        prisma.improveSuggestion.create({
          data: {
            deliverableId,
            metric: s.metric,
            impactPoints: s.impactPoints,
            currentText: s.currentText,
            suggestedText: s.suggestedText,
            reason: s.reason,
            status: 'PENDING',
          },
        }),
      ),
    );

    // Re-fetch all non-dismissed suggestions
    const allSuggestions = await prisma.improveSuggestion.findMany({
      where: {
        deliverableId,
        status: { not: 'DISMISSED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentScore = deliverable.qualityScore ?? 0;
    const pendingImpact = created.reduce((sum, s) => sum + s.impactPoints, 0);

    return NextResponse.json({
      currentScore,
      targetScore: 95,
      potentialScore: Math.min(100, currentScore + pendingImpact),
      suggestions: allSuggestions.map((s) => ({
        id: s.id,
        metric: s.metric,
        impactPoints: s.impactPoints,
        currentText: s.currentText,
        suggestedText: s.suggestedText,
        reason: s.reason,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/improve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
