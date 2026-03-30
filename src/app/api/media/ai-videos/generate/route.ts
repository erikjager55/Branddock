import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { isRunwayConfigured, generateVideo } from '@/lib/integrations/runway/runway-client';
import { mapGeneratedVideo } from '@/features/media-library/utils/media-utils';

const generateSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(1000),
  provider: z.enum(['RUNWAY', 'KLING', 'FAL']),
  duration: z.union([z.literal(5), z.literal(10)]).optional(),
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
});

/** POST /api/media/ai-videos/generate — Generate a video via Runway ML */
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

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, prompt, provider, duration, aspectRatio } = parsed.data;

    // Currently only Runway is supported
    if (provider !== 'RUNWAY') {
      return NextResponse.json(
        { error: `Provider "${provider}" is not yet supported. Only RUNWAY is available.` },
        { status: 400 }
      );
    }

    if (!isRunwayConfigured()) {
      return NextResponse.json(
        { error: 'Runway ML API key is not configured. Add RUNWAYML_API_SECRET to enable video generation.' },
        { status: 400 }
      );
    }

    // Generate video (blocks until Runway completes, up to 180s)
    const result = await generateVideo(prompt, {
      duration: duration ?? 5,
      ratio: aspectRatio ?? '16:9',
    });

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug || 'ai-video'}-${Date.now()}.mp4`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(result.videoBytes, {
      workspaceId,
      fileName,
      contentType: result.mimeType,
    });

    // Create DB record — clean up storage file if DB write fails
    let video;
    try {
      video = await prisma.generatedVideo.create({
        data: {
          name,
          prompt,
          provider,
          model: 'gen4.5',
          fileUrl: uploadResult.url,
          fileName,
          fileSize: uploadResult.fileSize,
          fileType: result.mimeType,
          duration: result.duration,
          aspectRatio: aspectRatio ?? '16:9',
          status: 'COMPLETED',
          workspaceId,
          createdById: session.user.id,
        },
      });
    } catch (dbError) {
      try { await storageProvider.delete(uploadResult.url); } catch { /* best-effort cleanup */ }
      throw dbError;
    }

    invalidateCache(cacheKeys.media.aiVideos(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      mapGeneratedVideo(video as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: 'Failed to generate video. Please try again.' },
      { status: 500 }
    );
  }
}
