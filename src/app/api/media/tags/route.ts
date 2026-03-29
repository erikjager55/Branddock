import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import { generateMediaSlug } from "@/features/media-library/utils/media-utils";

/** GET /api/media/tags — list tags for workspace */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hit = cachedJson(cacheKeys.media.tags(workspaceId));
    if (hit) return hit;

    const tags = await prisma.mediaTag.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      _count: { assets: t._count.assets },
      createdAt: t.createdAt.toISOString(),
    }));

    setCache(cacheKeys.media.tags(workspaceId), result, CACHE_TTL.OVERVIEW);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching media tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

/** POST /api/media/tags — create a new tag */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const slug = generateMediaSlug(name.trim());

    // Check for slug conflict (@@unique([workspaceId, slug]))
    const existing = await prisma.mediaTag.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.mediaTag.create({
      data: {
        name: name.trim(),
        slug,
        color: color || null,
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        _count: { assets: 0 },
        createdAt: tag.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating media tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
