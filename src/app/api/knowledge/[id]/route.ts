import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// PATCH /api/knowledge/:id — update resource fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const resource = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const body = await request.json();

    // Allowed fields for update
    const allowedFields = [
      "title", "description", "type", "author", "category", "tags",
      "difficulty", "language", "url", "thumbnail", "rating", "status",
      "aiSummary", "aiKeyTakeaways", "relatedTrends", "relatedPersonas",
      "relatedAssets", "isFeatured", "isFavorite", "isArchived",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.knowledgeResource.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      author: updated.author,
      category: updated.category,
      tags: (updated.tags as string[]) ?? [],
      difficulty: updated.difficulty,
      language: updated.language,
      url: updated.url,
      thumbnail: updated.thumbnail,
      rating: updated.rating,
      status: updated.status,
      addedBy: updated.addedBy,
      aiSummary: updated.aiSummary,
      aiKeyTakeaways: (updated.aiKeyTakeaways as string[]) ?? null,
      relatedTrends: (updated.relatedTrends as string[]) ?? null,
      relatedPersonas: (updated.relatedPersonas as string[]) ?? null,
      relatedAssets: (updated.relatedAssets as string[]) ?? null,
      isFeatured: updated.isFeatured,
      isFavorite: updated.isFavorite,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/knowledge/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
