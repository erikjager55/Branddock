import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getComponentSpecs, supportsPipelineMode } from '@/lib/studio/component-registry';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    // Fetch deliverable with campaign ownership check
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, contentType: true, pipelineStatus: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if already initialized
    if (deliverable.pipelineStatus !== 'LEGACY' && deliverable.pipelineStatus !== 'BRIEF_REVIEW') {
      return NextResponse.json({ error: 'Pipeline already initialized' }, { status: 409 });
    }

    // Check pipeline support
    if (!supportsPipelineMode(deliverable.contentType)) {
      return NextResponse.json({ error: 'Content type does not support pipeline mode' }, { status: 400 });
    }

    // Get component specs for this content type
    const specs = getComponentSpecs(deliverable.contentType);
    if (!specs || specs.length === 0) {
      return NextResponse.json({ error: 'No component specs found for this content type' }, { status: 400 });
    }

    // Read optional body for additionalInstructions
    const body = await request.json().catch(() => ({}));
    const additionalInstructions = typeof body.additionalInstructions === 'string' ? body.additionalInstructions : null;

    // Create components in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create DeliverableComponent records
      const componentData = specs.map((spec, index) => ({
        deliverableId,
        componentType: spec.type,
        groupType: spec.groupType,
        groupIndex: 0,
        order: index,
        status: 'PENDING' as const,
        version: 1,
      }));

      await tx.deliverableComponent.createMany({ data: componentData });

      // Update deliverable pipeline status
      await tx.deliverable.update({
        where: { id: deliverableId },
        data: {
          pipelineStatus: 'INITIALIZED',
          additionalInstructions,
        },
      });

      // Fetch created components
      return tx.deliverableComponent.findMany({
        where: { deliverableId },
        orderBy: { order: 'asc' },
      });
    });

    return NextResponse.json({ components: result, pipelineStatus: 'INITIALIZED' });
  } catch (error) {
    console.error('[Pipeline Initialize]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
