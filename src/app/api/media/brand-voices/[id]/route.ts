import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import { mapBrandVoice } from '@/features/media-library/utils/media-utils';

/** GET /api/media/brand-voices/[id] — Get a single brand voice */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const voice = await prisma.brandVoice.findFirst({
      where: { id, workspaceId },
    });

    if (!voice) {
      return NextResponse.json(
        { error: 'Brand voice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mapBrandVoice(voice as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching brand voice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand voice' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  voiceGender: z.string().max(50).nullable().optional(),
  voiceAge: z.string().max(50).nullable().optional(),
  voiceTone: z.string().max(200).nullable().optional(),
  voiceAccent: z.string().max(200).nullable().optional(),
  speakingPace: z.string().max(50).nullable().optional(),
  voicePrompt: z.string().max(5000).nullable().optional(),
  ttsProvider: z.string().max(50).nullable().optional(),
  ttsVoiceId: z.string().max(200).nullable().optional(),
  ttsSettings: z.record(z.string(), z.unknown()).nullable().optional(),
  sampleAudioUrl: z.string().url().nullable().optional(),
  isDefault: z.boolean().optional(),
});

/** PATCH /api/media/brand-voices/[id] — Update a brand voice */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
    const existing = await prisma.brandVoice.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Brand voice not found' },
        { status: 404 }
      );
    }

    const { isDefault, ttsSettings, ...rest } = parsed.data;

    // If setting as default, unset all other defaults first
    if (isDefault === true) {
      await prisma.brandVoice.updateMany({
        where: {
          workspaceId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.brandVoice.update({
      where: { id },
      data: {
        ...rest,
        ...(ttsSettings !== undefined
          ? {
              ttsSettings: ttsSettings === null
                ? Prisma.JsonNull
                : (ttsSettings as unknown as Prisma.InputJsonValue),
            }
          : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });

    invalidateCache(cacheKeys.media.brandVoices(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(mapBrandVoice(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating brand voice:', error);
    return NextResponse.json(
      { error: 'Failed to update brand voice' },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/brand-voices/[id] — Delete a brand voice */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.brandVoice.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Brand voice not found' },
        { status: 404 }
      );
    }

    await prisma.brandVoice.delete({ where: { id } });

    invalidateCache(cacheKeys.media.brandVoices(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand voice:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand voice' },
      { status: 500 }
    );
  }
}
