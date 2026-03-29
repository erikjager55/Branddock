import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import {
  generateSpeech,
  isElevenLabsConfigured,
} from '@/lib/integrations/elevenlabs/elevenlabs-client';
import type { VoiceSettings } from '@/lib/integrations/elevenlabs/elevenlabs-client';
import { getStorageProvider } from '@/lib/storage';

const bodySchema = z.object({
  text: z.string().min(1, 'Text is required').max(500, 'Text must be 500 characters or fewer'),
});

/** POST /api/media/brand-voices/[id]/generate-sample — Generate TTS audio sample */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
        { error: 'ElevenLabs API key not configured' },
        { status: 503 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Fetch the brand voice and verify ownership
    const voice = await prisma.brandVoice.findFirst({
      where: { id, workspaceId },
    });

    if (!voice) {
      return NextResponse.json({ error: 'Brand voice not found' }, { status: 404 });
    }

    if (!voice.ttsVoiceId) {
      return NextResponse.json(
        { error: 'No TTS voice selected. Please select a voice first.' },
        { status: 400 },
      );
    }

    // Extract voice settings from the JSON field
    const voiceSettings = voice.ttsSettings as Record<string, unknown> | null;
    const settings: VoiceSettings | undefined = voiceSettings
      ? {
          stability: typeof voiceSettings.stability === 'number' ? voiceSettings.stability : undefined,
          similarity_boost:
            typeof voiceSettings.similarity_boost === 'number' ? voiceSettings.similarity_boost : undefined,
          style: typeof voiceSettings.style === 'number' ? voiceSettings.style : undefined,
          use_speaker_boost:
            typeof voiceSettings.use_speaker_boost === 'boolean' ? voiceSettings.use_speaker_boost : undefined,
        }
      : undefined;

    // Generate audio via ElevenLabs
    const audioBuffer = await generateSpeech(voice.ttsVoiceId, parsed.data.text, settings);

    // Upload to storage
    const storage = getStorageProvider();
    const fileName = `brand-voice-sample-${id}-${Date.now()}.mp3`;
    const uploadResult = await storage.upload(audioBuffer, {
      workspaceId,
      fileName,
      contentType: 'audio/mpeg',
    });

    // Update brand voice record with new sample URL
    await prisma.brandVoice.update({
      where: { id },
      data: { sampleAudioUrl: uploadResult.url },
    });

    // Invalidate caches
    invalidateCache(cacheKeys.media.brandVoices(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ sampleAudioUrl: uploadResult.url });
  } catch (error) {
    console.error('Error generating voice sample:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate voice sample';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
