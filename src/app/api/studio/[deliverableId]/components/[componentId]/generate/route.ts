import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { buildGenerationContext } from '@/lib/studio/context-builder';
import { buildCascadingComponentContext } from '@/lib/studio/context-builder';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, componentId } = await params;

    // Fetch component with deliverable and campaign data
    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
      include: {
        deliverable: {
          include: {
            campaign: {
              select: { id: true, title: true, campaignGoalType: true, strategy: true, masterMessage: true },
            },
          },
        },
      },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (component.status === 'GENERATING') {
      return NextResponse.json({ error: 'Already generating' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const aiModel = (body.aiModel as string) || null;
    const additionalInstructions = (body.additionalInstructions as string) || '';

    // Mark as generating
    await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: { status: 'GENERATING', aiModel },
    });

    // Get all sibling components for cascading context
    const allComponents = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
    });

    // Build cascading context from approved siblings
    const masterMessage = component.deliverable.campaign.masterMessage as { coreClaim: string; proofPoint: string; emotionalHook: string; primaryCta: string } | null;
    const cascadingContext = buildCascadingComponentContext(
      componentId,
      allComponents,
      masterMessage,
    );

    // Build full generation context
    const campaignData = {
      campaignTitle: component.deliverable.campaign.title,
      campaignGoalType: component.deliverable.campaign.campaignGoalType,
      strategy: component.deliverable.campaign.strategy as Record<string, unknown> | null,
    };

    const personaIds: string[] = []; // TODO: extract from deliverable settings
    const generationContext = await buildGenerationContext(
      workspaceId,
      personaIds,
      campaignData,
      component.deliverable.title,
    );

    // TODO: Actually call AI here with the context. For now, generate stub content.
    const stubContent = `[AI Generated ${component.componentType}] — This is placeholder content for "${component.deliverable.title}". Component: ${component.componentType}. Cascading context included: ${cascadingContext ? 'yes' : 'no'}.`;

    // Update component with generated content
    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: {
        status: 'GENERATED',
        generatedContent: stubContent,
        cascadingContext: cascadingContext || null,
        promptUsed: `Brand context: ${generationContext.brandContext.slice(0, 200)}...`,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    // Update pipeline status if needed
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { pipelineStatus: 'IN_PROGRESS' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Component Generate]', error);

    // Try to reset component status on error
    const { componentId } = await params;
    await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: { status: 'PENDING' },
    }).catch(() => {});

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
