import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { mapSoundEffect } from '@/features/media-library/utils/media-utils';

/** GET /api/media/sound-effects/[id] — Get a single sound effect */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const effect = await prisma.soundEffect.findFirst({
      where: { id, workspaceId },
    });

    if (!effect) {
      return NextResponse.json({ error: 'Sound effect not found' }, { status: 404 });
    }

    return NextResponse.json(mapSoundEffect(effect as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching sound effect:', error);
    return NextResponse.json({ error: 'Failed to fetch sound effect' }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  soundType: z.enum(['SFX', 'JINGLE', 'SOUND_LOGO', 'AMBIENT', 'MUSIC']).optional(),
  isDefault: z.boolean().optional(),
});

/** PATCH /api/media/sound-effects/[id] — Update a sound effect */
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

    // Verify ownership
    const existing = await prisma.soundEffect.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Sound effect not found' }, { status: 404 });
    }

    const { isDefault, ...rest } = parsed.data;

    // Use transaction when toggling default to ensure consistency
    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.soundEffect.updateMany({
          where: {
            workspaceId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      return tx.soundEffect.update({
        where: { id },
        data: {
          ...rest,
          ...(isDefault !== undefined ? { isDefault } : {}),
        },
      });
    });

    invalidateCache(cacheKeys.media.soundEffects(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(mapSoundEffect(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating sound effect:', error);
    return NextResponse.json({ error: 'Failed to update sound effect' }, { status: 500 });
  }
}

/** DELETE /api/media/sound-effects/[id] — Delete a sound effect */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.soundEffect.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Sound effect not found' }, { status: 404 });
    }

    // Delete DB record first (authoritative), then clean up storage
    await prisma.soundEffect.delete({ where: { id } });

    try {
      const provider = getStorageProvider();
      await provider.delete(existing.fileUrl);
    } catch {
      console.warn('Failed to delete storage file for sound effect:', id);
    }

    invalidateCache(cacheKeys.media.soundEffects(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sound effect:', error);
    return NextResponse.json({ error: 'Failed to delete sound effect' }, { status: 500 });
  }
}
