import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { deleteFromR2 } from '@/lib/storage/r2-storage';

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

/** DELETE /api/consistent-models/:id/reference-images/:imageId — Delete a reference image */
export async function DELETE(
  _request: NextRequest,
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

    const { id, imageId } = await context.params;

    // Verify model ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Find the image
    const image = await prisma.referenceImage.findFirst({
      where: { id: imageId, consistentModelId: id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from R2 (non-blocking — don't fail if storage delete fails)
    try {
      await deleteFromR2(image.storageKey);
      if (image.thumbnailKey) {
        await deleteFromR2(image.thumbnailKey);
      }
    } catch (storageError) {
      console.error('Failed to delete image from R2:', storageError);
    }

    // Delete from database
    await prisma.referenceImage.delete({ where: { id: imageId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/consistent-models/:id/reference-images/:imageId error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
