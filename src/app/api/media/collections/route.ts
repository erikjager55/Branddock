import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import { generateMediaSlug } from "@/features/media-library/utils/media-utils";

/** GET /api/media/collections — list collections for workspace */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hit = cachedJson(cacheKeys.media.collections(workspaceId));
    if (hit) return hit;

    const collections = await prisma.mediaCollection.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
        parent: {
          select: { id: true, name: true },
        },
        assets: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          include: {
            mediaAsset: {
              select: { fileUrl: true, thumbnailUrl: true, mediaType: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = collections.map((c) => {
      const firstAsset = c.assets[0]?.mediaAsset;
      const previewAssetUrl =
        firstAsset?.mediaType === "IMAGE"
          ? firstAsset.fileUrl || firstAsset.thumbnailUrl
          : firstAsset?.thumbnailUrl || null;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        coverImageUrl: c.coverImageUrl,
        color: c.color,
        parentId: c.parentId,
        parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
        previewAssetUrl: c.coverImageUrl || previewAssetUrl || null,
        _count: { assets: c._count.assets, children: c._count.children },
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    setCache(cacheKeys.media.collections(workspaceId), result, CACHE_TTL.OVERVIEW);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching media collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

/** POST /api/media/collections — create a new collection */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, coverImageUrl, color, parentId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const slug = generateMediaSlug(name.trim());

    // Check for slug conflict (@@unique([workspaceId, slug]))
    const existing = await prisma.mediaCollection.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A collection with this name already exists" },
        { status: 409 }
      );
    }

    // Validate parentId belongs to same workspace if provided
    if (parentId) {
      const parentCollection = await prisma.mediaCollection.findFirst({
        where: { id: parentId, workspaceId },
      });
      if (!parentCollection) {
        return NextResponse.json(
          { error: "Parent collection not found" },
          { status: 404 }
        );
      }
    }

    const collection = await prisma.mediaCollection.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        coverImageUrl: coverImageUrl || null,
        color: color || null,
        parentId: parentId || null,
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        coverImageUrl: collection.coverImageUrl,
        color: collection.color,
        parentId: collection.parentId,
        _count: { assets: 0, children: 0 },
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating media collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
