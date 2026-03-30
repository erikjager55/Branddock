import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { mapGeneratedVideo } from '@/features/media-library/utils/media-utils';

/** GET /api/media/ai-videos — List generated videos for workspace */
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

    const videos = await prisma.generatedVideo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      videos: videos.map(vid => mapGeneratedVideo(vid as unknown as Record<string, unknown>)),
      total: videos.length,
    });
  } catch (error) {
    console.error('Error fetching generated videos:', error);
    return NextResponse.json({ error: 'Failed to fetch generated videos' }, { status: 500 });
  }
}
