import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import {
  isElevenLabsConfigured,
  generateSoundEffect,
} from '@/lib/integrations/elevenlabs/elevenlabs-client';
import { mapSoundEffect } from '@/features/media-library/utils/media-utils';

const generateSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(200),
  soundType: z.enum(['SFX', 'JINGLE', 'SOUND_LOGO', 'AMBIENT', 'MUSIC']).optional().default('SFX'),
  durationSeconds: z.number().min(0.5).max(22).optional(),
  promptInfluence: z.number().min(0).max(1).optional(),
});

/** POST /api/media/sound-effects/generate — Generate a sound effect via ElevenLabs */
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

    if (!isElevenLabsConfigured()) {
      return NextResponse.json(
        { error: 'ElevenLabs API key is not configured. Add ELEVENLABS_API_KEY to enable AI sound generation.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, prompt, soundType, durationSeconds, promptInfluence } = parsed.data;

    // Generate audio via ElevenLabs
    const audioBuffer = await generateSoundEffect(prompt, {
      durationSeconds,
      promptInfluence,
    });

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { error: 'ElevenLabs returned empty audio. Please try a different prompt.' },
        { status: 502 }
      );
    }

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug || 'sound-effect'}-${Date.now()}.mp3`;
    const provider = getStorageProvider();
    const result = await provider.upload(audioBuffer, {
      workspaceId,
      fileName,
      contentType: 'audio/mpeg',
    });

    // Create DB record — clean up storage file if DB write fails
    let effect;
    try {
      effect = await prisma.soundEffect.create({
        data: {
          name,
          soundType,
          fileUrl: result.url,
          fileName,
          fileSize: result.fileSize,
          fileType: 'audio/mpeg',
          duration: durationSeconds ?? null,
          prompt,
          promptInfluence: promptInfluence ?? null,
          source: 'AI_GENERATED',
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
    console.error('Error generating sound effect:', error);
    return NextResponse.json(
      { error: 'Failed to generate sound effect. Please try again.' },
      { status: 500 }
    );
  }
}
