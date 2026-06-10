import { NextResponse } from 'next/server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, pipelineStatus: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const components = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      select: { status: true },
    });

    const total = components.filter(c => c.status !== 'SKIPPED').length;
    const approved = components.filter(c => c.status === 'APPROVED').length;
    const generated = components.filter(c => c.status === 'GENERATED' || c.status === 'APPROVED').length;
    const pending = components.filter(c => c.status === 'PENDING' || c.status === 'NEEDS_REVISION').length;

    return NextResponse.json({
      pipelineStatus: deliverable.pipelineStatus,
      total,
      approved,
      generated,
      pending,
      percentage: total > 0 ? Math.round((approved / total) * 100) : 0,
    });
  } catch (error) {
    console.error('[Pipeline Progress]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
