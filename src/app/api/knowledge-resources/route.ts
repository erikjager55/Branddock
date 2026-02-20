import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { KNOWLEDGE_RESOURCE_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

function mapResource(r: any) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    type: r.type,
    category: r.category,
    author: r.author,
    url: r.url || null,
    estimatedDuration: r.estimatedDuration,
    rating: r.rating,
    isFavorite: r.isFavorite,
    isFeatured: r.isFeatured,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const category = searchParams.get("category") || "";
    const isArchived = searchParams.get("isArchived") === "true";

    // Cache unfiltered requests (default: not archived, no search/type/category)
    const isUnfiltered = !search && !type && !category && !isArchived;
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.knowledgeResources.list(workspaceId));
      if (hit) return hit;
    }

    const where: any = {
      workspaceId,
      isArchived,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    const [resources, total] = await Promise.all([
      prisma.knowledgeResource.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: KNOWLEDGE_RESOURCE_LIST_SELECT,
      }),
      prisma.knowledgeResource.count({ where }),
    ]);

    const responseData = { resources: resources.map(mapResource), total };

    if (isUnfiltered) {
      setCache(cacheKeys.knowledgeResources.list(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error("Error fetching knowledge resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge resources" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  type: z.string(),
  url: z.string().max(500).optional().default(""),
  description: z.string().max(3000).optional().default(""),
  difficultyLevel: z.string().optional(),
  estimatedDuration: z.string().max(50).optional(),
  tags: z.array(z.string()).max(20).optional().default([]),
  rating: z.number().min(0).max(5).optional().default(0),
  publicationDate: z.string().optional(),
  isbn: z.string().max(20).optional(),
  pageCount: z.number().int().positive().optional(),
});

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = generateSlug(data.title);

    const resource = await prisma.knowledgeResource.create({
      data: {
        title: data.title,
        slug,
        description: data.description || "",
        type: data.type,
        category: data.category,
        author: data.author,
        url: data.url || "",
        source: "MANUAL",
        difficultyLevel: data.difficultyLevel as any,
        estimatedDuration: data.estimatedDuration,
        tags: data.tags || [],
        rating: data.rating || 0,
        publicationDate: data.publicationDate
          ? new Date(data.publicationDate)
          : null,
        isbn: data.isbn,
        pageCount: data.pageCount,
        isFeatured: false,
        isFavorite: false,
        isArchived: false,
        language: "en",
        status: "active",
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));

    return NextResponse.json(mapResource(resource), { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge resource:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge resource" },
      { status: 500 }
    );
  }
}
