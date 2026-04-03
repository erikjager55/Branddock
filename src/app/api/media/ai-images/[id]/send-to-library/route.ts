import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import type { MediaCategory, ProductImageCategory } from '@prisma/client';

const PROVIDER_TAG_LABELS: Record<string, string> = {
  IMAGEN: 'Imagen 4',
  DALLE: 'DALL-E 3',
  FLUX_PRO: 'Flux Pro',
  RECRAFT: 'Recraft V3',
  IDEOGRAM: 'Ideogram V2',
  TRAINED_MODEL: 'Trained Model',
};

const AI_COLLECTION_NAME = 'AI Generated Images';
const AI_COLLECTION_SLUG = 'ai-generated-images';

const sendToLibrarySchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  productId: z.string().optional(),
  productImageCategory: z.string().optional(),
});

/** POST /api/media/ai-images/[id]/send-to-library — Copy AI image to Media Library */
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

    const generatedImage = await prisma.generatedImage.findFirst({
      where: { id, workspaceId },
    });
    if (!generatedImage) {
      return NextResponse.json({ error: 'Generated image not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendToLibrarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { category, tags: extraTagSlugs, collectionId, productId, productImageCategory } = parsed.data;

    // ─── Build auto-tags ──────────────────────────────────
    const autoTagNames = ['AI Generated'];
    const providerLabel = PROVIDER_TAG_LABELS[generatedImage.provider] ?? generatedImage.provider;
    autoTagNames.push(providerLabel);
    if (generatedImage.quality === 'hd') autoTagNames.push('HD');
    if (generatedImage.style) autoTagNames.push(generatedImage.style === 'vivid' ? 'Vivid' : 'Natural');

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
      const assetSlug = generatedImage.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + `-${Date.now()}`;

      const asset = await tx.mediaAsset.create({
        data: {
          name: generatedImage.name,
          slug: assetSlug,
          fileUrl: generatedImage.fileUrl,
          fileType: generatedImage.fileType,
          fileSize: generatedImage.fileSize,
          fileName: generatedImage.fileName,
          width: generatedImage.width,
          height: generatedImage.height,
          mediaType: 'IMAGE',
          category: (category ?? 'OTHER') as MediaCategory,
          source: 'AI_GENERATED',
          sourceUrl: `ai-image:${generatedImage.id}`,
          aiDescription: generatedImage.prompt,
          workspaceId,
          uploadedById: session.user.id,
          tags: {
            create: tagIds.map((tagId) => ({ mediaTagId: tagId })),
          },
        },
      });

      // 3. Auto-collection: "AI Generated Images"
      const targetCollectionId = collectionId ?? null;
      let usedCollectionId = targetCollectionId;

      if (!usedCollectionId) {
        const aiCollection = await tx.mediaCollection.upsert({
          where: { workspaceId_slug: { workspaceId, slug: AI_COLLECTION_SLUG } },
          create: {
            name: AI_COLLECTION_NAME,
            slug: AI_COLLECTION_SLUG,
            description: 'Automatically collected AI-generated images from AI Studio',
            workspaceId,
          },
          update: {},
        });
        usedCollectionId = aiCollection.id;
      }

      await tx.mediaCollectionAsset.create({
        data: {
          mediaAssetId: asset.id,
          collectionId: usedCollectionId,
        },
      });

      // 4. Optional: link to product
      let productImage = null;
      if (productId) {
        const product = await tx.product.findFirst({
          where: { id: productId, workspaceId },
          include: { _count: { select: { images: true } } },
        });
        if (product && product._count.images < 20) {
          productImage = await tx.productImage.create({
            data: {
              url: generatedImage.fileUrl,
              category: (productImageCategory ?? 'OTHER') as ProductImageCategory,
              altText: generatedImage.name,
              source: 'AI_GENERATED',
              productId,
            },
          });
        }
      }

      return { asset, productImage };
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.media.aiImages(workspaceId));
    if (productId) {
      invalidateCache(cacheKeys.prefixes.products(workspaceId));
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error sending AI image to library:', error);
    return NextResponse.json(
      { error: 'Failed to send image to library' },
      { status: 500 }
    );
  }
}
