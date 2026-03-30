import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';

/** GET /api/media/ai-images — List generated images for workspace */
export async function GET(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const favorite = searchParams.get('favorite');

    const where: Record<string, unknown> = { workspaceId };
    if (favorite === 'true') {
      where.isFavorite = true;
    }

    const images = await prisma.generatedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      images: images.map(img => mapGeneratedImage(img as unknown as Record<string, unknown>)),
      total: images.length,
    });
  } catch (error) {
    console.error('Error fetching generated images:', error);
    return NextResponse.json({ error: 'Failed to fetch generated images' }, { status: 500 });
  }
}
