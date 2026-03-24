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

    // Verify ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, pipelineStatus: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const components = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      components,
      pipelineStatus: deliverable.pipelineStatus,
    });
  } catch (error) {
    console.error('[Components List]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
