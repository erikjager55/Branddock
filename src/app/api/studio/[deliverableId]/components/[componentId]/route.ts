import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, componentId } = await params;

    // Verify ownership
    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();

    // Whitelist allowed fields
    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.feedbackText !== undefined) updateData.feedbackText = body.feedbackText;
    if (body.generatedContent !== undefined) updateData.generatedContent = body.generatedContent;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.imageSource !== undefined) updateData.imageSource = body.imageSource;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.visualBrief !== undefined) updateData.visualBrief = body.visualBrief;

    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Component Update]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
