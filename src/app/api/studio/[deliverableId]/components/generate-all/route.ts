import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get pending components
    const pending = await prisma.deliverableComponent.findMany({
      where: { deliverableId, status: { in: ['PENDING', 'NEEDS_REVISION'] } },
      orderBy: { order: 'asc' },
    });

    if (pending.length === 0) {
      return NextResponse.json({ message: 'No pending components', generated: 0 });
    }

    // Mark all as generating
    await prisma.deliverableComponent.updateMany({
      where: { id: { in: pending.map(p => p.id) } },
      data: { status: 'GENERATING' },
    });

    // TODO: Generate each sequentially with cascading context
    // For now, stub generate all
    let generatedCount = 0;
    for (const comp of pending) {
      const stubContent = `[Batch Generated ${comp.componentType}] — Component ${comp.order + 1} of ${pending.length}. Placeholder content.`;

      await prisma.deliverableComponent.update({
        where: { id: comp.id },
        data: {
          status: 'GENERATED',
          generatedContent: stubContent,
          generatedAt: new Date(),
          version: { increment: 1 },
        },
      });
      generatedCount++;
    }

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { pipelineStatus: 'IN_PROGRESS' },
    });

    return NextResponse.json({ message: `Generated ${generatedCount} components`, generated: generatedCount });
  } catch (error) {
    console.error('[Generate All]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
