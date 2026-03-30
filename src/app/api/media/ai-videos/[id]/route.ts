import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { mapGeneratedVideo } from '@/features/media-library/utils/media-utils';

/** GET /api/media/ai-videos/[id] — Get a single generated video */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const video = await prisma.generatedVideo.findFirst({
      where: { id, workspaceId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Generated video not found' }, { status: 404 });
    }

    return NextResponse.json(mapGeneratedVideo(video as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching generated video:', error);
    return NextResponse.json({ error: 'Failed to fetch generated video' }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isFavorite: z.boolean().optional(),
});

/** PATCH /api/media/ai-videos/[id] — Update a generated video */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.generatedVideo.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Generated video not found' }, { status: 404 });
    }

    const updated = await prisma.generatedVideo.update({
      where: { id },
      data: parsed.data,
    });

    invalidateCache(cacheKeys.media.aiVideos(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(mapGeneratedVideo(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating generated video:', error);
    return NextResponse.json({ error: 'Failed to update generated video' }, { status: 500 });
  }
}

/** DELETE /api/media/ai-videos/[id] — Delete a generated video */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.generatedVideo.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Generated video not found' }, { status: 404 });
    }

    await prisma.generatedVideo.delete({ where: { id } });

    try {
      const provider = getStorageProvider();
      await provider.delete(existing.fileUrl);
    } catch {
      console.warn('Failed to delete storage file for generated video:', id);
    }

    invalidateCache(cacheKeys.media.aiVideos(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated video:', error);
    return NextResponse.json({ error: 'Failed to delete generated video' }, { status: 500 });
  }
}
