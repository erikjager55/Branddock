import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// ─── Zod Schema for PATCH ───────────────────────────────────

const updateCompetitorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  tagline: z.string().max(300).optional().nullable(),
  foundingYear: z.number().int().min(1800).max(2100).optional().nullable(),
  headquarters: z.string().max(200).optional().nullable(),
  employeeRange: z.string().max(50).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  valueProposition: z.string().max(2000).optional().nullable(),
  targetAudience: z.string().max(2000).optional().nullable(),
  differentiators: z.array(z.string().max(200)).max(10).optional(),
  mainOfferings: z.array(z.string().max(200)).max(10).optional(),
  pricingModel: z.string().max(100).optional().nullable(),
  pricingDetails: z.string().max(2000).optional().nullable(),
  toneOfVoice: z.string().max(2000).optional().nullable(),
  messagingThemes: z.array(z.string().max(200)).max(10).optional(),
  visualStyleNotes: z.string().max(2000).optional().nullable(),
  strengths: z.array(z.string().max(200)).max(10).optional(),
  weaknesses: z.array(z.string().max(200)).max(10).optional(),
  tier: z.enum(["DIRECT", "INDIRECT", "ASPIRATIONAL"]).optional(),
  status: z.enum(["DRAFT", "ANALYZED", "ARCHIVED"]).optional(),
  competitiveScore: z.number().int().min(0).max(100).optional().nullable(),
});

// GET /api/competitors/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      include: {
        linkedProducts: {
          include: {
            product: {
              select: { id: true, name: true, category: true },
            },
          },
        },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const detail = {
      id: competitor.id,
      name: competitor.name,
      slug: competitor.slug,
      websiteUrl: competitor.websiteUrl,
      description: competitor.description,
      tagline: competitor.tagline,
      foundingYear: competitor.foundingYear,
      headquarters: competitor.headquarters,
      employeeRange: competitor.employeeRange,
      logoUrl: competitor.logoUrl,
      valueProposition: competitor.valueProposition,
      targetAudience: competitor.targetAudience,
      differentiators: competitor.differentiators,
      mainOfferings: competitor.mainOfferings,
      pricingModel: competitor.pricingModel,
      pricingDetails: competitor.pricingDetails,
      toneOfVoice: competitor.toneOfVoice,
      messagingThemes: competitor.messagingThemes,
      visualStyleNotes: competitor.visualStyleNotes,
      strengths: competitor.strengths,
      weaknesses: competitor.weaknesses,
      socialLinks: competitor.socialLinks as Record<string, string> | null,
      hasBlog: competitor.hasBlog,
      hasCareersPage: competitor.hasCareersPage,
      competitiveScore: competitor.competitiveScore,
      tier: competitor.tier,
      status: competitor.status,
      source: competitor.source,
      lastScrapedAt: competitor.lastScrapedAt?.toISOString() ?? null,
      analysisData: competitor.analysisData,
      isLocked: competitor.isLocked,
      lockedAt: competitor.lockedAt?.toISOString() ?? null,
      lockedBy: competitor.lockedBy ? { id: competitor.lockedBy.id, name: competitor.lockedBy.name } : null,
      linkedProducts: competitor.linkedProducts.map((lp) => ({
        id: lp.product.id,
        name: lp.product.name,
        category: lp.product.category,
      })),
      createdAt: competitor.createdAt.toISOString(),
      updatedAt: competitor.updatedAt.toISOString(),
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("[GET /api/competitors/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/competitors/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.competitor.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }
    if (existing.isLocked) {
      return NextResponse.json({ error: "Competitor is locked" }, { status: 423 });
    }

    const body = await request.json();
    const parsed = updateCompetitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await prisma.competitor.update({
      where: { id },
      data,
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/competitors/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/competitors/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }
    if (competitor.isLocked) {
      return NextResponse.json({ error: "Competitor is locked" }, { status: 423 });
    }

    // CompetitorProduct records cascade-delete via onDelete: Cascade
    await prisma.competitor.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/competitors/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
