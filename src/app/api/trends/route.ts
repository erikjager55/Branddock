import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import type { TrendWithMeta, TrendListResponse } from "@/types/trend";

// L8 Zod-sweep (audit 2026-06-26, batch 2): de POST zette ~11 rest-velden
// 1-op-1 in prisma.trend.create; sources/keyInsights/relevantIndustries/tags
// waren ongevalideerde JSON. Zelfde caps als het knowledge-schema (batch 1).
const strArray = z.array(z.string().max(500)).max(100);
const createTrendSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  category: z.string().max(100).optional(),
  impact: z.string().max(50).optional(),
  timeframe: z.string().max(50).optional(),
  direction: z.string().max(50).nullish(),
  level: z.string().max(50).nullish(),
  relevance: z.number().int().min(0).max(100).nullish(),
  relevantIndustries: strArray.optional(),
  keyInsights: z.string().max(20000).nullish(),
  sources: strArray.nullish(),
  tags: strArray.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
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
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, createTrendSchema);
    if (!parsed.ok) return parsed.response;
    const { title, ...rest } = parsed.data;

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
