import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { generateMediaSlug } from "@/features/media-library/utils/media-utils";

// L8 Zod-sweep (audit 2026-06-26, batch 5): description/coverImageUrl/color
// waren untyped — een object-waarde passeerde de `|| null`-guards en 500'de
// in prisma.update. De naam-/slug-/parent-semantiek blijft in de route
// (trim-400, slug-409, circular-parent-check).
const updateCollectionSchema = z.object({
  name: z.string().max(300).optional(),
  description: z.string().max(2000).nullish(),
  coverImageUrl: z.string().max(2000).nullish(),
  color: z.string().max(50).nullish(),
  parentId: z.string().min(1).max(100).nullish(),
});

/** GET /api/media/collections/[id] — collection detail with assets */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.mediaCollection.findFirst({
      where: { id, workspaceId },
      include: {
        children: {
          select: { id: true, name: true, slug: true, color: true },
          orderBy: { name: "asc" },
        },
        assets: {
          include: {
            mediaAsset: {
              select: {
                id: true,
                name: true,
                slug: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
                mediaType: true,
                category: true,
                thumbnailUrl: true,
                width: true,
                height: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      coverImageUrl: collection.coverImageUrl,
      color: collection.color,
      parentId: collection.parentId,
      parent: collection.parent
        ? { id: collection.parent.id, name: collection.parent.name }
        : null,
      children: collection.children,
      assets: collection.assets.map((ca) => ({
        id: ca.id,
        sortOrder: ca.sortOrder,
        asset: ca.mediaAsset,
      })),
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching collection detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

/** PATCH /api/media/collections/[id] — update a collection */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = await parseJsonBody(request, updateCollectionSchema);
    if (!parsed.ok) return parsed.response;
    const { name, description, coverImageUrl, color, parentId } = parsed.data;

    const existing = await prisma.mediaCollection.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "Collection name cannot be empty" },
          { status: 400 }
        );
      }
      const slug = generateMediaSlug(trimmed);

      if (slug !== existing.slug) {
        const conflict = await prisma.mediaCollection.findUnique({
          where: { workspaceId_slug: { workspaceId, slug } },
        });
        if (conflict) {
          return NextResponse.json(
            { error: "A collection with this name already exists" },
            { status: 409 }
          );
        }
      }

      data.name = trimmed;
      data.slug = slug;
    }

    if (description !== undefined) data.description = description || null;
    if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl || null;
    if (color !== undefined) data.color = color || null;

    if (parentId !== undefined) {
      if (parentId === null) {
        data.parentId = null;
      } else {
        // Prevent setting self as parent
        if (parentId === id) {
          return NextResponse.json(
            { error: "A collection cannot be its own parent" },
            { status: 400 }
          );
        }
        const parentCollection = await prisma.mediaCollection.findFirst({
          where: { id: parentId, workspaceId },
        });
        if (!parentCollection) {
          return NextResponse.json(
            { error: "Parent collection not found" },
            { status: 404 }
          );
        }

        // Check for circular parent reference
        let currentId: string | null = parentId ?? null;
        const visited = new Set<string>([id]);
        while (currentId) {
          if (visited.has(currentId)) {
            return NextResponse.json(
              { error: "Circular parent reference detected" },
              { status: 400 }
            );
          }
          visited.add(currentId);
          const parent: { parentId: string | null } | null =
            await prisma.mediaCollection.findUnique({
              where: { id: currentId },
              select: { parentId: true },
            });
          currentId = parent?.parentId ?? null;
        }

        data.parentId = parentId;
      }
    }

    const updated = await prisma.mediaCollection.update({
      where: { id },
      data,
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      coverImageUrl: updated.coverImageUrl,
      color: updated.color,
      parentId: updated.parentId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/collections/[id] — delete a collection */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.mediaCollection.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Count children that will become root-level (SetNull on parentId)
    const childrenCount = await prisma.mediaCollection.count({
      where: { parentId: id, workspaceId },
    });

    await prisma.mediaCollection.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true, childrenReassigned: childrenCount });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
