import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { getAssetCompletenessFields } from '@/lib/brand-asset-completeness';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Fetch the Deliverable with its Campaign
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            campaignGoalType: true,
            strategy: true,
            knowledgeAssets: true,
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Build Brief from deliverable.settings Json field
    const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
    const briefData = (settings.brief ?? {}) as Record<string, unknown>;
    const brief = {
      objective: (briefData.objective as string) || null,
      keyMessage: (briefData.keyMessage as string) || null,
      toneDirection: (briefData.toneDirection as string) || null,
      cta: (briefData.callToAction as string) || (briefData.cta as string) || null,
      contentOutline: Array.isArray(briefData.contentOutline)
        ? (briefData.contentOutline as string[])
        : null,
      targetPersonas: Array.isArray(briefData.targetPersonas)
        ? (briefData.targetPersonas as string[])
        : null,
      channel: (settings.channel as string) || null,
      phase: (settings.phase as string) || null,
    };

    // Build AI Context Preview
    const brandCtx = await getBrandContext(workspaceId);

    const [personas, products, competitors, trends, assets] = await Promise.all([
      prisma.persona.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        take: 10,
      }),
      prisma.product.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        take: 10,
      }),
      prisma.competitor.findMany({
        where: { workspaceId },
        select: { name: true },
        take: 5,
      }),
      prisma.detectedTrend.findMany({
        where: { workspaceId, isActivated: true, isDismissed: false },
        select: { title: true },
        take: 5,
      }),
      prisma.brandAsset.findMany({
        where: { workspaceId },
        select: { description: true, frameworkType: true, frameworkData: true },
      }),
    ]);

    // Calculate brand completeness
    const completenessScores = assets.map((a) => {
      const fields = getAssetCompletenessFields(a);
      if (fields.length === 0) return 0;
      return fields.filter((f) => f.filled).length / fields.length;
    });
    const completenessPercentage =
      completenessScores.length > 0
        ? Math.round(
            (completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length) * 100
          )
        : 0;

    const aiContext = {
      brandName: brandCtx.brandName || null,
      brandVoice: brandCtx.brandToneOfVoice || null,
      archetype: brandCtx.brandArchetype || null,
      competitors: competitors.map((c) => c.name),
      activeTrends: trends.map((t) => t.title),
      personas: personas.map((p) => ({ id: p.id, name: p.name })),
      products: products.map((p) => ({ id: p.id, name: p.name })),
      completenessPercentage,
    };

    // Gap Detection
    const gaps: Array<{
      field: string;
      severity: 'critical' | 'warning' | 'info';
      message: string;
      suggestion?: string;
    }> = [];

    if (!brief.objective) {
      gaps.push({
        field: 'objective',
        severity: 'warning',
        message: 'No objective defined for this deliverable',
        suggestion: 'Add an objective to guide AI content generation',
      });
    }
    if (!brief.keyMessage) {
      gaps.push({
        field: 'keyMessage',
        severity: 'warning',
        message: 'No key message specified',
        suggestion: 'Define the core message for this deliverable',
      });
    }
    if (!brief.toneDirection) {
      gaps.push({
        field: 'toneDirection',
        severity: 'info',
        message: 'No tone direction set — AI will use brand voice defaults',
      });
    }
    if (!aiContext.brandName) {
      gaps.push({
        field: 'brandName',
        severity: 'critical',
        message: 'Brand name not set in workspace settings',
        suggestion: 'Set your brand name in workspace settings',
      });
    }
    if (completenessPercentage < 30) {
      gaps.push({
        field: 'brandContext',
        severity: 'critical',
        message: `Brand Foundation is only ${completenessPercentage}% complete`,
        suggestion: 'Complete more brand assets for better AI output',
      });
    }
    if (personas.length === 0) {
      gaps.push({
        field: 'personas',
        severity: 'warning',
        message: 'No personas defined in workspace',
        suggestion: 'Create target personas for more personalized content',
      });
    }

    return NextResponse.json({
      brief,
      aiContext,
      gaps,
      enrichedBrief: deliverable.enrichedBrief || null,
      additionalInstructions: deliverable.additionalInstructions || null,
    });
  } catch (error) {
    console.error('[brief-context] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
