import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { compileComponentFeedback, buildCascadingComponentContext } from '@/lib/studio/context-builder';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, componentId } = await params;

    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
      include: {
        deliverable: {
          include: {
            campaign: { select: { masterMessage: true } },
          },
        },
      },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const feedback = typeof body.feedback === 'string' ? body.feedback : '';
    const aiModel = (body.aiModel as string) || null;

    // Mark as generating
    await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: { status: 'GENERATING', feedbackText: feedback, aiModel },
    });

    // Get siblings for context
    const allComponents = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
    });

    const masterMessage = component.deliverable.campaign.masterMessage as { coreClaim: string; proofPoint: string; emotionalHook: string; primaryCta: string } | null;

    // Compile feedback context
    const feedbackContext = compileComponentFeedback(
      {
        ...component,
        personaReactions: component.personaReactions as string | null,
      },
      allComponents,
      masterMessage,
    );

    // TODO: Call AI with feedback context. Stub for now.
    const stubContent = `[Regenerated ${component.componentType}] — Based on feedback: "${feedback}". Version ${component.version + 1}.`;

    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: {
        status: 'GENERATED',
        generatedContent: stubContent,
        cascadingContext: buildCascadingComponentContext(componentId, allComponents, masterMessage) || null,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Component Regenerate]', error);

    const { componentId } = await params;
    await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: { status: 'NEEDS_REVISION' },
    }).catch(() => {});

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
