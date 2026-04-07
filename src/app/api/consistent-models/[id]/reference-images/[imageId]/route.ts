import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

/** PATCH /api/consistent-models/:id/reference-images/:imageId — Update caption */
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

    const { id, imageId } = await context.params;

    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const caption = typeof body.caption === 'string' ? body.caption.trim() : undefined;

    const updated = await prisma.referenceImage.updateMany({
      where: { id: imageId, consistentModelId: id },
      data: { ...(caption !== undefined ? { caption } : {}) },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/consistent-models/:id/reference-images/:imageId error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Delete from storage (non-blocking — don't fail if storage delete fails)
    try {
      const storage = getStorageProvider();
      await storage.delete(image.storageUrl);
      if (image.thumbnailUrl) {
        await storage.delete(image.thumbnailUrl);
      }
    } catch (storageError) {
      console.error('Failed to delete image from storage:', storageError);
    }

    // Delete from database
    await prisma.referenceImage.delete({ where: { id: imageId } });

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/consistent-models/:id/reference-images/:imageId error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
