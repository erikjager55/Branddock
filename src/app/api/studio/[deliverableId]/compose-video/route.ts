import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// Allow up to 5 minutes for video composition
export const maxDuration = 300;

const sceneSchema = z.object({
  sceneId: z.enum(['hook', 'body', 'cta']),
  videoUrl: z.string().min(1),
  voiceoverUrl: z.string().optional(),
  duration: z.number().optional(),
});

const bodySchema = z.object({
  scenes: z.array(sceneSchema).min(1).max(3),
  transition: z.enum(['cut', 'fade', 'dissolve']).optional().default('cut'),
});

/**
 * POST /api/studio/[deliverableId]/compose-video
 *
 * Composes scene videos into a single final video.
 * For MVP: simply concatenates scene URLs and stores as final-video component.
 * Server-side ffmpeg composition is deferred to a future iteration.
 */
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

    // Verify ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });

    if (!deliverable || deliverable.campaign?.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { scenes, transition } = parsed.data;

    // For MVP: use the first scene with video as the "composed" video.
    // Full ffmpeg composition (concatenation + transitions + voiceover mixing)
    // will be implemented when we add server-side ffmpeg or a fal.ai composition workflow.
    //
    // For now, we store all scene URLs as metadata and use the longest/first scene as preview.
    const primaryScene = scenes[0];
    const composedUrl = primaryScene.videoUrl;

    // Save as final-video DeliverableComponent with all scene data in cascadingContext
    await prisma.deliverableComponent.deleteMany({
      where: { deliverableId, variantGroup: 'final-video' },
    });

    await prisma.deliverableComponent.create({
      data: {
        deliverableId,
        componentType: 'video',
        groupType: 'single',
        order: 950,
        status: 'APPROVED',
        variantGroup: 'final-video',
        variantIndex: 0,
        isSelected: true,
        videoUrl: composedUrl,
        generatedContent: JSON.stringify({ scenes, transition }),
        cascadingContext: JSON.stringify({
          sceneVideos: scenes.map((s) => ({ sceneId: s.sceneId, videoUrl: s.videoUrl, voiceoverUrl: s.voiceoverUrl })),
          transition,
          compositionMethod: 'mvp-first-scene',
        }),
        aiProvider: 'composed',
        aiModel: 'scene-builder',
        generatedAt: new Date(),
      },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json({
      composedVideoUrl: composedUrl,
      scenes: scenes.map((s) => ({ sceneId: s.sceneId, videoUrl: s.videoUrl })),
      transition,
      note: 'MVP: showing first scene as preview. Full composition with transitions coming soon.',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[compose-video] Error:', message, error);
    return NextResponse.json({ error: `Video composition failed: ${message}` }, { status: 500 });
  }
}
