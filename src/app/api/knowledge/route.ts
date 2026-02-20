import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type { KnowledgeWithMeta, KnowledgeListResponse } from "@/types/knowledge";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "title";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    const where: Record<string, unknown> = { workspaceId };
    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderByMap: Record<string, string> = { title: "title", rating: "rating", updatedAt: "updatedAt", createdAt: "createdAt" };
    const orderByField = orderByMap[sortBy] ?? "title";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    const dbResources = await prisma.knowledgeResource.findMany({ where, orderBy });

    const resources: KnowledgeWithMeta[] = dbResources.map((r) => ({
      id: r.id, title: r.title, description: r.description, type: r.type,
      author: r.author, category: r.category, tags: (r.tags as string[]) ?? [],
      difficulty: r.difficulty, language: r.language, url: r.url, thumbnail: r.thumbnail,
      rating: r.rating, status: r.status, addedBy: r.addedBy, aiSummary: r.aiSummary,
      aiKeyTakeaways: (r.aiKeyTakeaways as string[]) ?? null,
      relatedTrends: (r.relatedTrends as string[]) ?? null,
      relatedPersonas: (r.relatedPersonas as string[]) ?? null,
      relatedAssets: (r.relatedAssets as string[]) ?? null,
      isFeatured: r.isFeatured,
      isFavorite: r.isFavorite,
      isArchived: r.isArchived,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const r of resources) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }

    return NextResponse.json({ resources, stats: { total: resources.length, byType, byCategory } } as KnowledgeListResponse);
  } catch (error) {
    console.error("[GET /api/knowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const { title, ...rest } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const resource = await prisma.knowledgeResource.create({
      data: {
        title, description: rest.description ?? "", type: rest.type ?? "article",
        author: rest.author ?? "", category: rest.category ?? "", tags: rest.tags ?? [],
        difficulty: rest.difficulty ?? null, language: rest.language ?? "en",
        url: rest.url ?? "", thumbnail: rest.thumbnail ?? null, rating: rest.rating ?? 0,
        aiSummary: rest.aiSummary ?? null,
        aiKeyTakeaways: rest.aiKeyTakeaways ?? undefined,
        relatedTrends: rest.relatedTrends ?? undefined,
        relatedPersonas: rest.relatedPersonas ?? undefined,
        relatedAssets: rest.relatedAssets ?? undefined,
        workspaceId,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("[POST /api/knowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
