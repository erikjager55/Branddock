import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import type { MediaCategory } from '@prisma/client';

const AI_COLLECTION_NAME = 'AI Generated Videos';
const AI_COLLECTION_SLUG = 'ai-generated-videos';

const sendToLibrarySchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** POST /api/media/ai-videos/[id]/send-to-library — Copy AI video to Media Library */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const generatedVideo = await prisma.generatedVideo.findFirst({
      where: { id, workspaceId },
    });
    if (!generatedVideo) {
      return NextResponse.json({ error: 'Generated video not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendToLibrarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { category, tags: extraTagSlugs } = parsed.data;

    // ─── Build auto-tags ──────────────────────────────────
    const autoTagNames = ['AI Generated'];
    const providerLabel = generatedVideo.model || generatedVideo.provider;
    autoTagNames.push(providerLabel);

    // ─── Transaction: create asset + tags + collection ────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert auto-tags
      const tagIds: string[] = [];
      for (const tagName of autoTagNames) {
        const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tag = await tx.mediaTag.upsert({
          where: { workspaceId_slug: { workspaceId, slug } },
          create: { name: tagName, slug, workspaceId },
          update: {},
        });
        tagIds.push(tag.id);
      }

      // Upsert extra user-provided tags
      if (extraTagSlugs?.length) {
        for (const slug of extraTagSlugs) {
          const tag = await tx.mediaTag.upsert({
            where: { workspaceId_slug: { workspaceId, slug } },
            create: { name: slug, slug, workspaceId },
            update: {},
          });
          tagIds.push(tag.id);
        }
      }

      // 2. Create MediaAsset
      const assetSlug = generatedVideo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + `-${Date.now()}`;

      const thumbnailUrl = generatedVideo.thumbnailUrl ?? null;

      const asset = await tx.mediaAsset.create({
        data: {
          name: generatedVideo.name,
          slug: assetSlug,
          fileUrl: generatedVideo.fileUrl,
          fileType: generatedVideo.fileType,
          fileSize: generatedVideo.fileSize,
          fileName: generatedVideo.fileName,
          thumbnailUrl,
          width: generatedVideo.width,
          height: generatedVideo.height,
          mediaType: 'VIDEO',
          category: (category ?? 'OTHER') as MediaCategory,
          source: 'AI_GENERATED',
          sourceUrl: `ai-video:${generatedVideo.id}`,
          aiDescription: generatedVideo.prompt,
          workspaceId,
          uploadedById: session.user.id,
          tags: {
            create: tagIds.map((tagId) => ({ mediaTagId: tagId })),
          },
        },
      });

      // 3. Auto-collection: "AI Generated Videos"
      const aiCollection = await tx.mediaCollection.upsert({
        where: { workspaceId_slug: { workspaceId, slug: AI_COLLECTION_SLUG } },
        create: {
          name: AI_COLLECTION_NAME,
          slug: AI_COLLECTION_SLUG,
          description: 'Automatically collected AI-generated videos from AI Studio',
          workspaceId,
        },
        update: {},
      });

      await tx.mediaCollectionAsset.create({
        data: {
          mediaAssetId: asset.id,
          collectionId: aiCollection.id,
        },
      });

      return { asset };
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.media.aiVideos(workspaceId));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error sending AI video to library:', error);
    return NextResponse.json(
      { error: 'Failed to send video to library' },
      { status: 500 }
    );
  }
}
