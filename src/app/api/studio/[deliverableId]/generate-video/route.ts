import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { getFalVideoProviderById, FAL_VIDEO_PROVIDERS } from '@/lib/integrations/fal/fal-video-providers';
import { buildVideoPromptFromScript } from '@/lib/studio/video-prompt-builder';
import { getBrandContext } from '@/lib/ai/brand-context';

// Allow up to 5 minutes for video generation
export const maxDuration = 300;

const validProviderIds = FAL_VIDEO_PROVIDERS.map((p) => p.id);

const bodySchema = z.object({
  scriptText: z.string().min(1).max(5000),
  provider: z.string().refine((v) => validProviderIds.includes(v), {
    message: 'Unknown video provider',
  }),
  duration: z.number().min(3).max(15),
  aspectRatio: z.string().min(1).max(10),
  sourceImageUrl: z.string().max(2000).optional(),
  existingVideoUrl: z.string().max(2000).optional(),
  sceneId: z.enum(['hook', 'body', 'cta', 'full']).optional().default('full'),
});

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/generate-video
// SSE endpoint — generates a concept video from a content script.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Verify deliverable ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });

    if (!deliverable || deliverable.campaign?.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    // Parse body
    const rawBody = await request.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { scriptText, provider: providerId, duration, aspectRatio, sourceImageUrl, existingVideoUrl, sceneId } = parsed.data;

    const provider = getFalVideoProviderById(providerId);
    if (!provider) {
      return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 400 });
    }

    // Existing video mode: no generation needed, just save the reference
    if (existingVideoUrl) {
      const evGroup = sceneId === 'full' ? 'concept-video' : `scene-video-${sceneId}`;
      await prisma.deliverableComponent.deleteMany({
        where: { deliverableId, variantGroup: evGroup },
      });
      await prisma.deliverableComponent.create({
        data: {
          deliverableId,
          componentType: 'video',
          groupType: 'single',
          order: 900,
          status: 'APPROVED',
          variantGroup: evGroup,
          variantIndex: 0,
          isSelected: true,
          videoUrl: existingVideoUrl,
          aiProvider: 'existing',
          aiModel: 'library',
          generatedAt: new Date(),
        },
      });
      invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
      return NextResponse.json({ videoUrl: existingVideoUrl });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 400 });
    }

    // --- SSE Stream ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: unknown) {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            /* stream closed */
          }
        }

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            /* stream closed */
          }
        }, 15_000);

        try {
          fal.config({ credentials: process.env.FAL_KEY });
          const isKling = provider.endpoint.includes('kling');

          // Step 1: Build video prompt from script
          sendEvent('video_prompt_generating', { status: 'generating' });

          const brandContext = await getBrandContext(workspaceId);
          const videoPrompt = await buildVideoPromptFromScript(
            scriptText,
            brandContext,
            deliverable.contentType ?? 'tiktok-script',
            workspaceId,
            sceneId,
          );

          sendEvent('video_prompt_ready', { prompt: videoPrompt });

          // Step 2: Determine endpoint and input based on mode
          sendEvent('video_generating', {
            status: 'generating',
            provider: provider.label,
            mode: sourceImageUrl ? 'image-to-video' : 'text-to-video',
          });

          let endpoint: string;
          const input: Record<string, unknown> = {
            prompt: videoPrompt,
            duration: isKling ? String(duration) : duration,
            aspect_ratio: aspectRatio,
            generate_audio: provider.supportsAudio,
          };

          if (sourceImageUrl) {
            // Image-to-video mode: resolve local files to fal storage
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
            endpoint = provider.endpoint; // image-to-video endpoint
          } else {
            endpoint = provider.textToVideoEndpoint ?? provider.endpoint;
          }

          const result = await fal.subscribe(endpoint, {
            input,
            timeout: 300_000,
          });

          const data = result.data as Record<string, unknown>;
          const video = data?.video as { url?: string } | undefined;
          if (!video?.url) {
            sendEvent('video_error', { message: 'No video returned from provider' });
            return;
          }

          // Step 3: Download and store video
          const videoResponse = await fetch(video.url);
          if (!videoResponse.ok) {
            sendEvent('video_error', { message: 'Failed to download generated video' });
            return;
          }

          const videoBytes = Buffer.from(await videoResponse.arrayBuffer());
          const fileName = `concept-video-${Date.now()}.mp4`;
          const storageProvider = getStorageProvider();
          const uploadResult = await storageProvider.upload(videoBytes, {
            workspaceId,
            fileName,
            contentType: 'video/mp4',
          });

          // Step 4: Save as DeliverableComponent
          const variantGroup = sceneId === 'full' ? 'concept-video' : `scene-video-${sceneId}`;
          await prisma.deliverableComponent.deleteMany({
            where: { deliverableId, variantGroup },
          });

          await prisma.deliverableComponent.create({
            data: {
              deliverableId,
              componentType: 'video',
              groupType: 'single',
              order: 900,
              status: 'APPROVED',
              variantGroup,
              variantIndex: 0,
              isSelected: true,
              generatedContent: videoPrompt,
              videoUrl: uploadResult.url,
              imagePromptUsed: videoPrompt,
              aiProvider: providerId,
              aiModel: provider.label,
              generatedAt: new Date(),
            },
          });

          invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

          sendEvent('video_complete', {
            videoUrl: uploadResult.url,
            prompt: videoPrompt,
            provider: provider.label,
            duration,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Video generation failed';
          console.error('[generate-video] Error:', message, error);
          sendEvent('video_error', { message });
        } finally {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/generate-video]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
