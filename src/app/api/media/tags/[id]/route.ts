import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { generateMediaSlug } from "@/features/media-library/utils/media-utils";

/** PATCH /api/media/tags/[id] — update a tag */
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
    const body = await request.json();
    const { name, color } = body;

    const existing = await prisma.mediaTag.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "Tag name cannot be empty" },
          { status: 400 }
        );
      }
      const slug = generateMediaSlug(trimmed);

      // Check slug conflict if name changed
      if (slug !== existing.slug) {
        const conflict = await prisma.mediaTag.findUnique({
          where: { workspaceId_slug: { workspaceId, slug } },
        });
        if (conflict) {
          return NextResponse.json(
            { error: "A tag with this name already exists" },
            { status: 409 }
          );
        }
      }

      data.name = trimmed;
      data.slug = slug;
    }

    if (color !== undefined) {
      data.color = color || null;
    }

    const updated = await prisma.mediaTag.update({
      where: { id },
      data,
      include: { _count: { select: { assets: true } } },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      color: updated.color,
      _count: { assets: updated._count.assets },
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating media tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/tags/[id] — delete a tag */
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

    const existing = await prisma.mediaTag.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.mediaTag.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
