import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    // Verify ownership + load settings for variantAngles hydration
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, pipelineStatus: true, settings: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const components = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      orderBy: { order: 'asc' },
    });

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

    return NextResponse.json({
      components,
      pipelineStatus: deliverable.pipelineStatus,
      variantAngles,
      fidelityScore,
      strictRewrite,
    });
  } catch (error) {
    console.error('[Components List]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
