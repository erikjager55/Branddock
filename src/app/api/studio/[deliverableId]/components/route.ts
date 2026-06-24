import { NextResponse } from 'next/server';
import { requireDeliverableAccess } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const { deliverableId } = await params;

    // Resource-based auth: workspace van het deliverable, niet cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const access = await requireDeliverableAccess(deliverableId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Load settings for variantAngles hydration
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { id: true, pipelineStatus: true, settings: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const components = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      orderBy: [{ order: 'asc' }, { variantIndex: 'asc' }, { id: 'asc' }],
    });

    // G8 — fetch the most recent visual fidelity score per image component
    // so the UI can hydrate per-variant badges on page load (not only via
    // the post-generation SSE flow).
    const imageComponentIds = components
      .filter((c) => c.componentType === 'image' && c.imageUrl)
      .map((c) => c.id);
    const visualFidelityScores = imageComponentIds.length > 0
      ? await prisma.contentVisualFidelityScore.findMany({
          where: { componentId: { in: imageComponentIds } },
          orderBy: { scoredAt: 'desc' },
          select: {
            componentId: true,
            compositeScore: true,
            thresholdMet: true,
            scoredAt: true,
            colorAlignment: true,
            aiJudgeDimensions: true,
          },
        })
      : [];
    // Most recent per componentId — findMany returned desc, dedupe to first.
    const visualFidelityByComponent = new Map<
      string,
      {
        compositeScore: number;
        thresholdMet: boolean;
        judgeSkipped: boolean;
        colorAlignment: unknown;
        aiJudgeDimensions: unknown;
      }
    >();
    for (const s of visualFidelityScores) {
      if (visualFidelityByComponent.has(s.componentId)) continue;
      const dims = s.aiJudgeDimensions as { skipped?: boolean } | null;
      visualFidelityByComponent.set(s.componentId, {
        compositeScore: s.compositeScore,
        thresholdMet: s.thresholdMet,
        judgeSkipped: dims?.skipped === true,
        colorAlignment: s.colorAlignment,
        aiJudgeDimensions: s.aiJudgeDimensions,
      });
    }

    // Extract variantAngles array uit settings — geïndexeerd op variantIndex
    // zodat de UI hydrate-flow de creative angle labels terug kan koppelen
    // aan de geladen variants. Leeg array bij legacy 1-call generations.
    const settings = (deliverable.settings as Record<string, unknown> | null) ?? {};
    const variantAngles = Array.isArray(settings.variantAngles)
      ? (settings.variantAngles as unknown[]).map((v) => (typeof v === 'string' ? v : ''))
      : [];

    // Persistente fidelity + strict snapshots — hydrate de position-bar
    // en STRICT badge bij page refresh zodat de UI niet leeg lijkt na
    // een eerdere succesvolle generatie.
    const fidelityScore = settings.fidelityScore ?? null;
    const strictRewrite = settings.strictRewrite ?? null;
    // GEO/SEO meet-haak — gepersisteerd bij publish van een long-form GEO-artikel.
    // Hydrate het GEO-meet-paneel (Fase 2-opvolg) bij page refresh.
    const geoOptimizationAnalysis = settings.geoOptimizationAnalysis ?? null;

    return NextResponse.json({
      components,
      pipelineStatus: deliverable.pipelineStatus,
      variantAngles,
      fidelityScore,
      strictRewrite,
      geoOptimizationAnalysis,
      visualFidelityScores: Array.from(
        visualFidelityByComponent.entries(),
      ).map(([componentId, data]) => ({ componentId, ...data })),
    });
  } catch (error) {
    console.error('[Components List]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
