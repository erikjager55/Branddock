import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforcePlanLimit, enforceNotLocked } from "@/lib/stripe/enforcement";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { DifficultyLevel, Prisma, type KnowledgeResource } from "@prisma/client";
import { KNOWLEDGE_RESOURCE_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

type ResourceListItem = Pick<
  KnowledgeResource,
  | "id"
  | "title"
  | "slug"
  | "description"
  | "type"
  | "category"
  | "author"
  | "url"
  | "estimatedDuration"
  | "rating"
  | "isFavorite"
  | "isFeatured"
  | "createdAt"
>;

function mapResource(r: ResourceListItem) {
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

    const where: Prisma.KnowledgeResourceWhereInput = {
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
  // Long-form body + AI-metadata (o.a. voor Deep Research-rapporten).
  content: z.string().max(200_000).optional(),
  aiSummary: z.string().max(5000).optional(),
  aiKeyTakeaways: z.array(z.string()).max(50).optional(),
  source: z.enum(["MANUAL", "URL_IMPORT", "FILE_UPLOAD", "DEEP_RESEARCH"]).optional(),
  importedMetadata: z
    .unknown()
    .refine(
      (v) => v === undefined || JSON.stringify(v).length <= 100_000,
      "importedMetadata exceeds 100KB",
    )
    .optional(),
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

    // M5: server-side plan-limit enforcement (no-op while billing disabled).
    const limited = await enforcePlanLimit(workspaceId, "KNOWLEDGE_RESOURCES");
    if (limited) return limited;

    // Fase 4: verlopen no-card trial → read-only-lock op entity-creatie
    // (lezen + bestaande data blijven volledig toegankelijk).
    const locked = await enforceNotLocked(workspaceId);
    if (locked) return locked;

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
        source: data.source ?? "MANUAL",
        difficultyLevel: data.difficultyLevel as DifficultyLevel | undefined,
        estimatedDuration: data.estimatedDuration,
        tags: data.tags || [],
        rating: data.rating || 0,
        publicationDate: data.publicationDate
          ? new Date(data.publicationDate)
          : null,
        isbn: data.isbn,
        pageCount: data.pageCount,
        content: data.content ?? null,
        aiSummary: data.aiSummary ?? null,
        aiKeyTakeaways: data.aiKeyTakeaways ?? undefined,
        importedMetadata: (data.importedMetadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
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
