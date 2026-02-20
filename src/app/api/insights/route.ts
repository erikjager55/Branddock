import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type { Prisma } from "@prisma/client";
import { INSIGHT_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// =============================================================
// GET /api/insights
// Filters: category, impactLevel, timeframe, search
// Returns: { insights, stats }
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const impactLevel = searchParams.get("impactLevel");
    const timeframe = searchParams.get("timeframe");
    const search = searchParams.get("search");

    // Cache unfiltered requests
    const isUnfiltered = !category && !impactLevel && !timeframe && !search;
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.insights.list(workspaceId));
      if (hit) return hit;
    }

    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;
    if (impactLevel) where.impactLevel = impactLevel;
    if (timeframe) where.timeframe = timeframe;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const dbInsights = await prisma.marketInsight.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: INSIGHT_LIST_SELECT,
    });

    const insights = dbInsights.map((i) => ({
      id: i.id,
      title: i.title,
      slug: i.slug,
      description: i.description,
      category: i.category,
      scope: i.scope,
      impactLevel: i.impactLevel,
      timeframe: i.timeframe,
      relevanceScore: i.relevanceScore,
      source: i.source,
      industries: i.industries,
      tags: i.tags,
      howToUse: i.howToUse,
      sourceUrls: i.sourceUrls.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
      })),
      useBrandContext: i.useBrandContext,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));

    // Stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      active: insights.length,
      highImpact: insights.filter((i) => i.impactLevel === "HIGH").length,
      newThisMonth: insights.filter((i) => new Date(i.createdAt) >= monthStart).length,
    };

    const responseData = { insights, stats };

    if (isUnfiltered) {
      setCache(cacheKeys.insights.list(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error("[GET /api/insights]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createInsightSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  category: z.enum(["TECHNOLOGY", "ENVIRONMENTAL", "SOCIAL", "CONSUMER", "BUSINESS"]),
  scope: z.enum(["MICRO", "MESO", "MACRO"]).optional(),
  impactLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  timeframe: z.enum(["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"]).optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  source: z.enum(["MANUAL", "AI_RESEARCH", "IMPORTED"]).optional(),
  industries: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  howToUse: z.array(z.string()).optional(),
  aiResearchPrompt: z.string().optional(),
  aiResearchConfig: z.record(z.string(), z.unknown()).optional(),
  useBrandContext: z.boolean().optional(),
  sourceUrls: z.array(z.object({
    name: z.string().min(1),
    url: z.string().url(),
  })).optional(),
});

// =============================================================
// POST /api/insights  — create new insight
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createInsightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { sourceUrls, ...data } = parsed.data;

    // Generate slug
    const slug = slugify(data.title);

    // Check duplicate slug
    const existing = await prisma.marketInsight.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Insight with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const insight = await prisma.marketInsight.create({
      data: {
        title: data.title,
        slug,
        description: data.description ?? null,
        category: data.category,
        scope: data.scope ?? "MICRO",
        impactLevel: data.impactLevel ?? "MEDIUM",
        timeframe: data.timeframe ?? "SHORT_TERM",
        relevanceScore: data.relevanceScore ?? 75,
        source: data.source ?? "MANUAL",
        industries: data.industries ?? [],
        tags: data.tags ?? [],
        howToUse: data.howToUse ?? [],
        aiResearchPrompt: data.aiResearchPrompt ?? null,
        aiResearchConfig: data.aiResearchConfig as Prisma.InputJsonValue | undefined,
        useBrandContext: data.useBrandContext ?? false,
        workspaceId,
        sourceUrls: sourceUrls
          ? { create: sourceUrls }
          : undefined,
      },
      include: { sourceUrls: true },
    });

    invalidateCache(cacheKeys.prefixes.insights(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    console.error("[POST /api/insights]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
