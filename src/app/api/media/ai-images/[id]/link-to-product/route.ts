import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import type { ProductImageCategory } from '@prisma/client';

const linkSchema = z.object({
  productId: z.string().min(1),
  category: z.string().optional(),
  altText: z.string().max(500).optional(),
});

/** POST /api/media/ai-images/[id]/link-to-product — Link AI image to a product */
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

    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { productId, category, altText } = parsed.data;

    // Verify product belongs to workspace and check image limit
    const product = await prisma.product.findFirst({
      where: { id: productId, workspaceId },
      include: { _count: { select: { images: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (product._count.images >= 20) {
      return NextResponse.json({ error: 'Product has reached the maximum of 20 images' }, { status: 400 });
    }

    const productImage = await prisma.productImage.create({
      data: {
        url: generatedImage.fileUrl,
        category: (category ?? 'OTHER') as ProductImageCategory,
        altText: altText ?? generatedImage.name,
        source: 'AI_GENERATED',
        productId,
      },
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ productImage }, { status: 201 });
  } catch (error) {
    console.error('Error linking AI image to product:', error);
    return NextResponse.json(
      { error: 'Failed to link image to product' },
      { status: 500 }
    );
  }
}
