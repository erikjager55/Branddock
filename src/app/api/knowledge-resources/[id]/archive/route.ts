import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

function mapResource(r: any) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    type: r.type,
    category: r.category,
    author: r.author,
    estimatedDuration: r.estimatedDuration,
    rating: r.rating,
    isFavorite: r.isFavorite,
    isFeatured: r.isFeatured,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const resource = await prisma.knowledgeResource.update({
      where: { id },
      data: { isArchived: !existing.isArchived },
    });

    invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));

    return NextResponse.json(mapResource(resource));
  } catch (error) {
    console.error("Error toggling archive status:", error);
    return NextResponse.json(
      { error: "Failed to toggle archive status" },
      { status: 500 }
    );
  }
}
