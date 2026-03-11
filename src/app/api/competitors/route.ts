import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { COMPETITOR_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import type { CompetitorStatus, CompetitorTier, Prisma } from "@prisma/client";

// ─── Zod Schemas ────────────────────────────────────────────

const createCompetitorSchema = z.object({
  name: z.string().min(1).max(200),
  websiteUrl: z.string().url().optional(),
  description: z.string().max(5000).optional(),
  tagline: z.string().max(300).optional(),
  tier: z.enum(["DIRECT", "INDIRECT", "ASPIRATIONAL"]).optional(),
  source: z.string().max(50).optional(),
  status: z.enum(["DRAFT", "ANALYZED", "ARCHIVED"]).optional(),
  foundingYear: z.number().int().min(1800).max(2100).optional(),
  headquarters: z.string().max(200).optional(),
  employeeRange: z.string().max(50).optional(),
  logoUrl: z.string().url().optional(),
  valueProposition: z.string().max(2000).optional(),
  targetAudience: z.string().max(2000).optional(),
  differentiators: z.array(z.string().max(200)).max(10).optional(),
  mainOfferings: z.array(z.string().max(200)).max(10).optional(),
  pricingModel: z.string().max(100).optional(),
  pricingDetails: z.string().max(2000).optional(),
  toneOfVoice: z.string().max(2000).optional(),
  messagingThemes: z.array(z.string().max(200)).max(10).optional(),
  visualStyleNotes: z.string().max(2000).optional(),
  strengths: z.array(z.string().max(200)).max(10).optional(),
  weaknesses: z.array(z.string().max(200)).max(10).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  hasBlog: z.boolean().optional(),
  hasCareersPage: z.boolean().optional(),
  competitiveScore: z.number().int().min(0).max(100).optional(),
  analysisData: z.unknown().optional(),
});

// GET /api/competitors
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "name";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    // Cache unfiltered default requests
    const isUnfiltered = !tier && !status && !search && sortBy === "name" && sortOrder === "asc";
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.competitors.list(workspaceId));
      if (hit) return hit;
    }

    const where: Record<string, unknown> = { workspaceId };
    if (tier) where.tier = tier;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderByMap: Record<string, string> = {
      name: "name",
      tier: "tier",
      competitiveScore: "competitiveScore",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    };
    const orderByField = orderByMap[sortBy] ?? "name";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    const dbCompetitors = await prisma.competitor.findMany({
      where,
      orderBy,
      select: COMPETITOR_LIST_SELECT,
    });

    const competitors = dbCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      websiteUrl: c.websiteUrl,
      description: c.description,
      tagline: c.tagline,
      logoUrl: c.logoUrl,
      tier: c.tier,
      status: c.status,
      competitiveScore: c.competitiveScore,
      differentiators: c.differentiators,
      isLocked: c.isLocked,
      linkedProductCount: c._count.linkedProducts,
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Compute stats
    const direct = competitors.filter((c) => c.tier === "DIRECT").length;
    const indirect = competitors.filter((c) => c.tier === "INDIRECT").length;
    const aspirational = competitors.filter((c) => c.tier === "ASPIRATIONAL").length;
    const scored = competitors.filter((c) => c.competitiveScore !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + (c.competitiveScore ?? 0), 0) / scored.length)
      : 0;

    const responseData = {
      competitors,
      stats: { total: competitors.length, direct, indirect, aspirational, avgScore },
    };

    if (isUnfiltered) {
      setCache(cacheKeys.competitors.list(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { "X-Cache": "MISS" } : {},
    });
  } catch (error) {
    console.error("[GET /api/competitors]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/competitors
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCompetitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, tier, source, status, ...rest } = parsed.data;

    // Generate slug
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slug) {
      slug = `competitor-${Date.now()}`;
    }

    // Check for unique constraint collision
    const existing = await prisma.competitor.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const resolvedTier = (tier ?? "DIRECT") as CompetitorTier;
    const resolvedStatus = (status ?? (source === "WEBSITE_URL" ? "ANALYZED" : "DRAFT")) as CompetitorStatus;

    const competitor = await prisma.competitor.create({
      data: {
        name,
        slug,
        tier: resolvedTier,
        status: resolvedStatus,
        source: source ?? "MANUAL",
        workspaceId,
        ...rest,
        socialLinks: (rest.socialLinks ?? undefined) as Prisma.InputJsonValue | undefined,
        analysisData: (rest.analysisData ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error("[POST /api/competitors]", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}
