import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { getFalVideoProviderById } from '@/lib/integrations/fal/fal-video-providers';
import { truncatePromptForModel } from '@/lib/integrations/fal/fal-client';
import { buildNegativePrompt } from '@/lib/ai/image-quality/negative-prompts';
import { mapGeneratedVideo } from '@/features/media-library/utils/media-utils';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { fetchWithSizeLimit, AI_VIDEO_SIZE_CAP } from '@/lib/security/fetch-with-limit';

const generateSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(1000),
  provider: z.string().min(1),
  duration: z.number().min(3).max(15).optional().default(5),
  aspectRatio: z.string().optional().default('16:9'),
  sourceImageUrl: z.string().min(1).optional(),
});

/** POST /api/media/ai-videos/generate — Generate a video via fal.ai */
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

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, prompt, provider: providerId, duration, aspectRatio, sourceImageUrl } = parsed.data;

    // Resolve the fal.ai video provider
    const provider = getFalVideoProviderById(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown video provider: ${providerId}` },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY is not configured. Add FAL_KEY to enable fal.ai video generation.' },
        { status: 400 }
      );
    }

    // Configure fal.ai client
    fal.config({ credentials: process.env.FAL_KEY });

    // Build fal.ai input based on the provider
    const isKling = provider.endpoint.includes('kling');
    // Kling and Veo expose a native negative_prompt input; Seedance and LTX
    // do not, so the quality defaults are only sent where they take effect
    // (prompt-audit 2026-06-11, gap-fal-image-paths).
    const supportsNegativePrompt = isKling || provider.endpoint.includes('veo');
    const input: Record<string, unknown> = {
      prompt,
      duration: isKling ? String(duration) : duration,
      aspect_ratio: aspectRatio,
      generate_audio: true,
      ...(supportsNegativePrompt ? { negative_prompt: buildNegativePrompt() } : {}),
    };

    // Determine endpoint: image-to-video or text-to-video
    let endpoint: string;
    if (sourceImageUrl) {
      // Image-to-video: resolve the source image to a public URL that fal.ai can download.
      // Local storage URLs (e.g. /uploads/media/...) are not accessible externally,
      // so we read the file from disk and upload it to fal.ai's temporary storage.
      let resolvedImageUrl = sourceImageUrl;
      if (sourceImageUrl.startsWith('/uploads/') || sourceImageUrl.startsWith('/public/uploads/')) {
        const localPath = join(process.cwd(), 'public', sourceImageUrl.replace(/^\/public/, ''));
        const fileBytes = await readFile(localPath);
        const fileName = sourceImageUrl.split('/').pop() ?? 'source.jpg';
        const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const blob = new Blob([fileBytes], { type: mimeType });
        const file = new File([blob], fileName, { type: mimeType });
        resolvedImageUrl = await fal.storage.upload(file);
      }

      const imageUrlField = provider.imageUrlField ?? 'image_url';
      input[imageUrlField] = resolvedImageUrl;
      endpoint = provider.endpoint;
    } else {
      // Text-to-video: use the text-to-video endpoint
      endpoint = provider.textToVideoEndpoint ?? provider.endpoint;
    }

    // Central per-model prompt cap — this route subscribes directly, which
    // bypassed the truncatePromptForModel guard that generateFalImage applies.
    input.prompt = truncatePromptForModel(prompt, endpoint);

    // Call fal.ai — 5 minute timeout since video generation is slow
    console.log('[video-generate] endpoint:', endpoint, 'input:', JSON.stringify(input));
    const result = await fal.subscribe(endpoint, {
      input,
      timeout: 300_000,
    });

    const data = result.data as Record<string, unknown>;
    const video = data?.video as { url?: string } | undefined;
    if (!video?.url) {
      return NextResponse.json({ error: 'No video generated' }, { status: 500 });
    }

    // Download the video bytes from the fal.ai result URL (size-capped)
    let videoBytes: Buffer;
    try {
      videoBytes = await fetchWithSizeLimit(video.url, AI_VIDEO_SIZE_CAP);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download generated video';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const mimeType = 'video/mp4';

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug || 'ai-video'}-${Date.now()}.mp4`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(videoBytes, {
      workspaceId,
      fileName,
      contentType: mimeType,
    });

    // Create DB record — clean up storage file if DB write fails
    let generatedVideo;
    try {
      generatedVideo = await prisma.generatedVideo.create({
        data: {
          name,
          prompt,
          provider: providerId,
          model: provider.label,
          fileUrl: uploadResult.url,
          fileName,
          fileSize: uploadResult.fileSize,
          fileType: mimeType,
          duration,
          aspectRatio,
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
      mapGeneratedVideo(generatedVideo as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // fal.ai ApiError has a `body` with detail
    const body = (error as Record<string, unknown>)?.body;
    const detail = body ? JSON.stringify(body) : '';
    console.error('Error generating video:', message, detail, error);
    return NextResponse.json(
      { error: `Video generation failed: ${message}${detail ? ` — ${detail}` : ''}` },
      { status: 500 }
    );
  }
}
