import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/knowledge/featured — featured resources voor carousel
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const dbResources = await prisma.knowledgeResource.findMany({
      where: {
        workspaceId,
        isFeatured: true,
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    const resources = dbResources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      author: r.author,
      category: r.category,
      tags: (r.tags as string[]) ?? [],
      difficulty: r.difficulty,
      url: r.url,
      thumbnail: r.thumbnail,
      rating: r.rating,
      isFavorite: r.isFavorite,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("[GET /api/knowledge/featured]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
