import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const componentPatchSchema = z.object({
  isSelected: z.boolean().optional(),
  status: z.string().max(50).optional(),
  rating: z.number().int().min(0).max(5).optional(),
  feedbackText: z.string().max(5000).optional().nullable(),
  generatedContent: z.string().optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  imageSource: z.string().max(100).optional().nullable(),
  videoUrl: z.string().url().max(2048).optional().nullable(),
  visualBrief: z.string().max(10000).optional().nullable(),
}).strict();

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

    const raw = await request.json();
    const parsed = componentPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    // Handle isSelected with sibling deselection
    if (body.isSelected === true) {
      const [, selected] = await prisma.$transaction([
        prisma.deliverableComponent.updateMany({
          where: {
            deliverableId: component.deliverableId,
            variantGroup: component.variantGroup,
            isSelected: true,
            NOT: { id: componentId },
          },
          data: { isSelected: false },
        }),
        prisma.deliverableComponent.update({
          where: { id: componentId },
          data: { isSelected: true },
        }),
      ]);
      return NextResponse.json(selected);
    }

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
