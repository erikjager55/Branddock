import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TrendWithMeta, TrendListResponse } from "@/types/trend";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const category = searchParams.get("category");
    const impact = searchParams.get("impact");
    const timeframe = searchParams.get("timeframe");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "title";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;
    if (impact) where.impact = impact;
    if (timeframe) where.timeframe = timeframe;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderByMap: Record<string, string> = { title: "title", relevance: "relevance", impact: "impact", updatedAt: "updatedAt" };
    const orderByField = orderByMap[sortBy] ?? "title";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    const dbTrends = await prisma.trend.findMany({ where, orderBy });

    const trends: TrendWithMeta[] = dbTrends.map((t) => ({
      id: t.id, title: t.title, description: t.description, category: t.category,
      impact: t.impact, timeframe: t.timeframe, direction: t.direction, level: t.level,
      relevance: t.relevance, relevantIndustries: (t.relevantIndustries as string[]) ?? [],
      keyInsights: t.keyInsights, sources: (t.sources as string[]) ?? null,
      tags: (t.tags as string[]) ?? [],
      createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    }));

    const byCategory: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    for (const t of trends) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      byImpact[t.impact] = (byImpact[t.impact] ?? 0) + 1;
    }

    return NextResponse.json({ trends, stats: { total: trends.length, byCategory, byImpact } } as TrendListResponse);
  } catch (error) {
    console.error("[GET /api/trends]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, workspaceId, ...rest } = body;

    if (!title || !workspaceId) {
      return NextResponse.json({ error: "title and workspaceId are required" }, { status: 400 });
    }

    const trend = await prisma.trend.create({
      data: {
        title, description: rest.description ?? "", category: rest.category ?? "technology",
        impact: rest.impact ?? "medium", timeframe: rest.timeframe ?? "medium-term",
        direction: rest.direction ?? null, level: rest.level ?? null,
        relevance: rest.relevance ?? null, relevantIndustries: rest.relevantIndustries ?? [],
        keyInsights: rest.keyInsights ?? null, sources: rest.sources ?? undefined,
        tags: rest.tags ?? [], workspaceId,
      },
    });

    return NextResponse.json(trend, { status: 201 });
  } catch (error) {
    console.error("[POST /api/trends]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
