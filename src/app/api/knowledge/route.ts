import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type { KnowledgeWithMeta, KnowledgeListResponse } from "@/types/knowledge";

// L8 Zod-sweep (audit 2026-06-26): de POST spreadde `rest.*` (rating, tags,
// difficulty, rel/ai-JSON-velden) ongevalideerd in prisma.create — een
// string-`rating` of arbitraire JSON landde zo in de DB. Cap + type-guard
// per veld; onbekende keys worden genegeerd (geen `.strict()` — de client
// stuurt soms extra UI-velden mee).
const strArray = z.array(z.string().max(200)).max(100);
const createKnowledgeSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.string().max(100).optional(),
  author: z.string().max(300).optional(),
  category: z.string().max(200).optional(),
  tags: strArray.optional(),
  difficulty: z.string().max(100).nullish(),
  language: z.string().max(20).optional(),
  url: z.string().max(2000).optional(),
  thumbnail: z.string().max(2000).nullish(),
  rating: z.number().min(0).max(5).optional(),
  aiSummary: z.string().max(20000).nullish(),
  aiKeyTakeaways: strArray.nullish(),
  relatedTrends: strArray.nullish(),
  relatedPersonas: strArray.nullish(),
  relatedAssets: strArray.nullish(),
});

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

    const parsed = createKnowledgeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const resource = await prisma.knowledgeResource.create({
      data: {
        title: data.title, description: data.description ?? "", type: data.type ?? "article",
        author: data.author ?? "", category: data.category ?? "", tags: data.tags ?? [],
        difficulty: data.difficulty ?? null, language: data.language ?? "en",
        url: data.url ?? "", thumbnail: data.thumbnail ?? null, rating: data.rating ?? 0,
        aiSummary: data.aiSummary ?? null,
        aiKeyTakeaways: data.aiKeyTakeaways ?? undefined,
        relatedTrends: data.relatedTrends ?? undefined,
        relatedPersonas: data.relatedPersonas ?? undefined,
        relatedAssets: data.relatedAssets ?? undefined,
        workspaceId,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("[POST /api/knowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
