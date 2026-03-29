import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider, extractDominantColors } from '@/lib/storage';
import { z } from 'zod';
import { generateMediaSlug } from '@/features/media-library/utils/media-utils';

const importSchema = z.object({
  photoUrl: z.string().url(),
  photographer: z.string().min(1).max(200),
  photographerUrl: z.string().url().optional(),
  pexelsUrl: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** Stock-specific slug that always appends a timestamp for uniqueness */
function generateStockSlug(name: string): string {
  return `${generateMediaSlug(name)}-${Date.now()}`;
}

/** POST /api/media/stock/import — Download photo from Pexels and save as MediaAsset */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { photoUrl, photographer, photographerUrl, pexelsUrl, width, height } = parsed.data;

    // Fetch the image from Pexels
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download image from Pexels' },
        { status: 502 }
      );
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[contentType] || '.jpg';
    const fileName = `pexels-${photographer.toLowerCase().replace(/\s+/g, '-')}${ext}`;

    // Upload via storage provider
    const storage = getStorageProvider();
    const uploadResult = await storage.upload(buffer, {
      workspaceId,
      fileName,
      contentType,
      generateThumbnail: true,
    });

    // Extract dominant colors
    let dominantColors: string[] = [];
    try {
      dominantColors = await extractDominantColors(buffer);
    } catch {
      // Non-critical — proceed without colors
    }

    const name = `Photo by ${photographer}`;
    const slug = generateStockSlug(name);
    const attribution = `Photo by ${photographer} on Pexels`;

    // Create MediaAsset
    const asset = await prisma.mediaAsset.create({
      data: {
        name,
        slug,
        fileUrl: uploadResult.url,
        fileType: contentType,
        fileSize: uploadResult.fileSize,
        fileName,
        width: uploadResult.width ?? width ?? null,
        height: uploadResult.height ?? height ?? null,
        mediaType: 'IMAGE',
        source: 'STOCK',
        sourceUrl: pexelsUrl ?? photoUrl,
        attribution,
        thumbnailUrl: uploadResult.thumbnailUrl ?? null,
        dominantColors,
        workspaceId,
        uploadedById: session.user.id,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error importing stock photo:', error);
    return NextResponse.json(
      { error: 'Failed to import stock photo' },
      { status: 500 }
    );
  }
}
