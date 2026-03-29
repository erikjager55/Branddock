import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import { mapBrandVoice } from '@/features/media-library/utils/media-utils';

/** GET /api/media/brand-voices — List brand voices for workspace */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const voices = await prisma.brandVoice.findMany({
      where: { workspaceId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      brandVoices: voices.map(v => mapBrandVoice(v as unknown as Record<string, unknown>)),
      total: voices.length,
    });
  } catch (error) {
    console.error('Error fetching brand voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand voices' },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  voiceGender: z.string().max(50).optional(),
  voiceAge: z.string().max(50).optional(),
  voiceTone: z.string().max(200).optional(),
  voiceAccent: z.string().max(200).optional(),
  speakingPace: z.string().max(50).optional(),
  voicePrompt: z.string().max(5000).optional(),
  ttsProvider: z.string().max(50).optional(),
  ttsVoiceId: z.string().max(200).optional(),
  ttsSettings: z.record(z.string(), z.unknown()).optional(),
  sampleAudioUrl: z.string().url().optional(),
  isDefault: z.boolean().optional().default(false),
});

/** POST /api/media/brand-voices — Create a new brand voice */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { isDefault, ttsSettings, ...rest } = parsed.data;

    // If setting as default, unset all other defaults first
    if (isDefault) {
      await prisma.brandVoice.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const voice = await prisma.brandVoice.create({
      data: {
        ...rest,
        ttsSettings: ttsSettings
          ? (ttsSettings as unknown as Prisma.InputJsonValue)
          : undefined,
        isDefault,
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.media.brandVoices(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      { brandVoice: mapBrandVoice(voice as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating brand voice:', error);
    return NextResponse.json(
      { error: 'Failed to create brand voice' },
      { status: 500 }
    );
  }
}
