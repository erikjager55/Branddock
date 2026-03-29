import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getCached, setCache, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import { getStorageProvider } from "@/lib/storage";

const MEDIA_ASSET_INCLUDE = {
  tags: { include: { mediaTag: true } },
  uploadedBy: { select: { id: true, name: true, image: true } },
  collections: {
    include: {
      collection: { select: { id: true, name: true, slug: true } },
    },
  },
};

/** GET /api/media/[id] — Get media asset detail */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const cacheKey = cacheKeys.media.detail(workspaceId, id);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const asset = await prisma.mediaAsset.findFirst({
      where: { id, workspaceId },
      include: MEDIA_ASSET_INCLUDE,
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    setCache(cacheKey, asset, CACHE_TTL.DETAIL);

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error fetching media asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch media asset" },
      { status: 500 }
    );
  }
}

/** PATCH /api/media/[id] — Update media asset fields */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.mediaAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) {
      allowedFields.name = body.name;
      // Update slug if name changed
      let slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slugConflict = await prisma.mediaAsset.findFirst({
        where: { workspaceId, slug, id: { not: id } },
        select: { id: true },
      });
      if (slugConflict) {
        slug = `${slug}-${Date.now()}`;
      }
      allowedFields.slug = slug;
    }
    if (body.category !== undefined) allowedFields.category = body.category;
    if (body.aiDescription !== undefined) allowedFields.aiDescription = body.aiDescription;
    if (body.aiTags !== undefined) allowedFields.aiTags = body.aiTags;
    if (body.attribution !== undefined) allowedFields.attribution = body.attribution;

    // Handle tag linking if tagIds provided
    const hasTagUpdate = body.tagIds !== undefined && Array.isArray(body.tagIds);
    let tagIds: string[] = [];

    if (hasTagUpdate) {
      tagIds = [...new Set<string>(
        body.tagIds.filter((t: unknown): t is string => typeof t === "string")
      )];

      // Verify all tags belong to this workspace
      if (tagIds.length > 0) {
        const validTags = await prisma.mediaTag.findMany({
          where: { id: { in: tagIds }, workspaceId },
          select: { id: true },
        });
        const validTagIds = new Set(validTags.map((t) => t.id));
        const invalidIds = tagIds.filter((t) => !validTagIds.has(t));
        if (invalidIds.length > 0) {
          return NextResponse.json(
            { error: `Invalid tag IDs: ${invalidIds.join(", ")}` },
            { status: 400 }
          );
        }
      }
    }

    // Atomically apply field + tag updates in a single transaction
    const hasFieldUpdate = Object.keys(allowedFields).length > 0;

    if (!hasFieldUpdate && !hasTagUpdate) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      ...(hasFieldUpdate
        ? [prisma.mediaAsset.update({ where: { id }, data: allowedFields })]
        : []),
      ...(hasTagUpdate
        ? [
            prisma.mediaAssetTag.deleteMany({ where: { mediaAssetId: id } }),
            ...tagIds.map((tagId) =>
              prisma.mediaAssetTag.create({
                data: { mediaAssetId: id, mediaTagId: tagId },
              })
            ),
          ]
        : []),
    ]);

    // Fetch the updated asset with all includes
    const asset = await prisma.mediaAsset.findFirstOrThrow({
      where: { id, workspaceId },
      include: MEDIA_ASSET_INCLUDE,
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error updating media asset:", error);
    return NextResponse.json(
      { error: "Failed to update media asset" },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/[id] — Delete a media asset */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.mediaAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    // Clean up physical files before deleting DB record
    const storage = getStorageProvider();
    if (existing.fileUrl) {
      await storage.delete(existing.fileUrl).catch(() => {/* non-critical */});
    }
    if (existing.thumbnailUrl) {
      await storage.delete(existing.thumbnailUrl).catch(() => {/* non-critical */});
    }

    await prisma.mediaAsset.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media asset:", error);
    return NextResponse.json(
      { error: "Failed to delete media asset" },
      { status: 500 }
    );
  }
}
