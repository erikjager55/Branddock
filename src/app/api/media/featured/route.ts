import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getCached, setCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

/** GET /api/media/featured — Get featured media assets */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const cacheKey = cacheKeys.media.featured(workspaceId);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const assets = await prisma.mediaAsset.findMany({
      where: {
        workspaceId,
        isFeatured: true,
        isArchived: false,
      },
      include: {
        tags: { include: { mediaTag: true } },
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const response = { assets };

    setCache(cacheKey, response, CACHE_TTL.OVERVIEW);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching featured media assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured media assets" },
      { status: 500 }
    );
  }
}
