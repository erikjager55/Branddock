import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, componentId } = await params;

    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!component.generatedContent && !component.imageUrl) {
      return NextResponse.json({ error: 'Cannot approve component without content' }, { status: 400 });
    }

    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    // Check if all components are approved → update pipeline to COMPLETE
    const allComponents = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      select: { status: true },
    });
    const allApproved = allComponents.every(c => c.status === 'APPROVED' || c.status === 'SKIPPED');
    if (allApproved) {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { pipelineStatus: 'COMPLETE' },
      });
    } else {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { pipelineStatus: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Component Approve]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
