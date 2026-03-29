import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { mapSoundEffect } from '@/features/media-library/utils/media-utils';

/** GET /api/media/sound-effects — List sound effects for workspace */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effects = await prisma.soundEffect.findMany({
      where: { workspaceId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      soundEffects: effects.map(e => mapSoundEffect(e as unknown as Record<string, unknown>)),
      total: effects.length,
    });
  } catch (error) {
    console.error('Error fetching sound effects:', error);
    return NextResponse.json({ error: 'Failed to fetch sound effects' }, { status: 500 });
  }
}

/** POST /api/media/sound-effects — Upload a sound effect */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawName = formData.get('name') as string | null;
    const soundType = (formData.get('soundType') as string) || 'SFX';

    if (!file || !rawName) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      );
    }

    const name = rawName.trim().slice(0, 200);
    if (!name) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate soundType enum
    const validSoundTypes = ['SFX', 'JINGLE', 'SOUND_LOGO', 'AMBIENT', 'MUSIC'];
    if (!validSoundTypes.includes(soundType)) {
      return NextResponse.json(
        { error: 'Invalid sound type' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: mp3, wav, ogg, aac, mp4, webm' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const provider = getStorageProvider();
    const result = await provider.upload(buffer, {
      workspaceId,
      fileName: safeFileName,
      contentType: file.type,
    });

    // Create DB record — clean up storage file if DB write fails
    let effect;
    try {
      effect = await prisma.soundEffect.create({
        data: {
          name,
          soundType,
          fileUrl: result.url,
          fileName: safeFileName,
          fileSize: result.fileSize,
          fileType: file.type,
          source: 'UPLOAD',
          workspaceId,
          createdById: session.user.id,
        },
      });
    } catch (dbError) {
      try { await provider.delete(result.url); } catch { /* best-effort cleanup */ }
      throw dbError;
    }

    invalidateCache(cacheKeys.media.soundEffects(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      mapSoundEffect(effect as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading sound effect:', error);
    return NextResponse.json({ error: 'Failed to upload sound effect' }, { status: 500 });
  }
}
