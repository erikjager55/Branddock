import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const reorderSchema = z.object({
  imageIds: z.array(z.string()).min(1),
});

/** PATCH /api/consistent-models/:id/reference-images/reorder — Reorder reference images */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;

    // Verify model ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { imageIds } = parsed.data;

    // Update sort order for each image
    await prisma.$transaction(
      imageIds.map((imageId, index) =>
        prisma.referenceImage.updateMany({
          where: { id: imageId, consistentModelId: id },
          data: { sortOrder: index },
        })
      )
    );

    // Return updated list
    const images = await prisma.referenceImage.findMany({
      where: { consistentModelId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error('PATCH /api/consistent-models/:id/reference-images/reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
