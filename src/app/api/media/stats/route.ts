import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getCached, setCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

/** GET /api/media/stats — Get media library statistics */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const cacheKey = cacheKeys.media.stats(workspaceId);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const baseWhere = { workspaceId, isArchived: false };

    const [
      total,
      images,
      videos,
      documents,
      audio,
      favorites,
      featured,
      archived,
      totalFileSize,
    ] = await Promise.all([
      prisma.mediaAsset.count({ where: baseWhere }),
      prisma.mediaAsset.count({ where: { ...baseWhere, mediaType: "IMAGE" } }),
      prisma.mediaAsset.count({ where: { ...baseWhere, mediaType: "VIDEO" } }),
      prisma.mediaAsset.count({ where: { ...baseWhere, mediaType: "DOCUMENT" } }),
      prisma.mediaAsset.count({ where: { ...baseWhere, mediaType: "AUDIO" } }),
      prisma.mediaAsset.count({ where: { ...baseWhere, isFavorite: true } }),
      prisma.mediaAsset.count({ where: { ...baseWhere, isFeatured: true } }),
      prisma.mediaAsset.count({ where: { workspaceId, isArchived: true } }),
      prisma.mediaAsset.aggregate({
        where: { workspaceId },
        _sum: { fileSize: true },
      }),
    ]);

    const response = {
      total,
      images,
      videos,
      documents,
      audio,
      favorites,
      featured,
      archived,
      totalFileSize: totalFileSize._sum.fileSize ?? 0,
    };

    setCache(cacheKey, response, CACHE_TTL.DASHBOARD);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching media stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch media stats" },
      { status: 500 }
    );
  }
}
