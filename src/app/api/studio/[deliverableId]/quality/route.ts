import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

interface QualityMetric {
  name: string;
  score: number;
  maxScore: number;
}

// GET /api/studio/[deliverableId]/quality — Return quality score + metrics
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
      select: {
        qualityScore: true,
        qualityMetrics: true,
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    if (!deliverable.qualityMetrics) {
      return NextResponse.json({ overall: 0, metrics: [] });
    }

    const metricsObj = deliverable.qualityMetrics as Record<string, unknown>;

    // Check if qualityMetrics contains a ValidationResult (has 'score' + 'warnings')
    const hasValidationResult =
      typeof metricsObj.score === 'number' && Array.isArray(metricsObj.warnings);

    if (hasValidationResult) {
      const validationScore = metricsObj.score as number;

      // Build 4 balanced dimensions (25 points each)
      const contentSafety = Math.round((validationScore / 100) * 25);
      const metrics: QualityMetric[] = [
        { name: 'Brand Alignment', score: deliverable.qualityScore ? Math.round(deliverable.qualityScore * 0.25) : 0, maxScore: 25 },
        { name: 'Audience Fit', score: deliverable.qualityScore ? Math.round(deliverable.qualityScore * 0.25) : 0, maxScore: 25 },
        { name: 'Engagement', score: deliverable.qualityScore ? Math.round(deliverable.qualityScore * 0.25) : 0, maxScore: 25 },
        { name: 'Content Safety', score: contentSafety, maxScore: 25 },
      ];

      const overall = metrics.reduce((sum, m) => sum + m.score, 0);

      return NextResponse.json({ overall, metrics });
    }

    // Legacy format: qualityMetrics is a flat Record<string, number>
    const numericMetrics = metricsObj as Record<string, number>;
    const metricNames = Object.keys(numericMetrics);
    return NextResponse.json({
      overall: deliverable.qualityScore ?? 0,
      metrics: metricNames.map((name) => ({
        name,
        score: numericMetrics[name],
        maxScore: 100,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/quality error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
