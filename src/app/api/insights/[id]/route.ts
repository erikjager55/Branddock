import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/insights/:id — detail with sourceUrls and howToUse
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const insight = await prisma.marketInsight.findFirst({
      where: { id, workspaceId },
      include: { sourceUrls: true },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: insight.id,
      title: insight.title,
      slug: insight.slug,
      description: insight.description,
      category: insight.category,
      scope: insight.scope,
      impactLevel: insight.impactLevel,
      timeframe: insight.timeframe,
      relevanceScore: insight.relevanceScore,
      source: insight.source,
      industries: insight.industries,
      tags: insight.tags,
      howToUse: insight.howToUse,
      sourceUrls: insight.sourceUrls.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
      })),
      aiResearchPrompt: insight.aiResearchPrompt,
      aiResearchConfig: insight.aiResearchConfig,
      useBrandContext: insight.useBrandContext,
      createdAt: insight.createdAt.toISOString(),
      updatedAt: insight.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/insights/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateInsightSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.enum(["TECHNOLOGY", "ENVIRONMENTAL", "SOCIAL", "CONSUMER", "BUSINESS"]).optional(),
  scope: z.enum(["MICRO", "MESO", "MACRO"]).optional(),
  impactLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  timeframe: z.enum(["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"]).optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  source: z.enum(["MANUAL", "AI_RESEARCH", "IMPORTED"]).optional(),
  industries: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  howToUse: z.array(z.string()).optional(),
  aiResearchPrompt: z.string().nullable().optional(),
  aiResearchConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  useBrandContext: z.boolean().optional(),
});

// =============================================================
// PATCH /api/insights/:id — update insight
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateInsightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.marketInsight.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    const { aiResearchConfig, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (aiResearchConfig !== undefined) {
      updateData.aiResearchConfig = aiResearchConfig as Record<string, unknown> | null;
    }

    const insight = await prisma.marketInsight.update({
      where: { id },
      data: updateData,
      include: { sourceUrls: true },
    });

    invalidateCache(cacheKeys.prefixes.insights(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      id: insight.id,
      title: insight.title,
      slug: insight.slug,
      description: insight.description,
      category: insight.category,
      scope: insight.scope,
      impactLevel: insight.impactLevel,
      timeframe: insight.timeframe,
      relevanceScore: insight.relevanceScore,
      source: insight.source,
      industries: insight.industries,
      tags: insight.tags,
      howToUse: insight.howToUse,
      sourceUrls: insight.sourceUrls.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
      })),
      useBrandContext: insight.useBrandContext,
      createdAt: insight.createdAt.toISOString(),
      updatedAt: insight.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/insights/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/insights/:id — delete insight (cascades to sources)
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.marketInsight.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    // InsightSourceUrl has onDelete: Cascade, so sources are auto-deleted
    await prisma.marketInsight.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.insights(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/insights/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
