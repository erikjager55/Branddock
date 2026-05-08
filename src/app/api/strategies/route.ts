import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, type KeyResult, type Milestone } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// ---------------------------------------------------------------
// Mapper-input types
// ---------------------------------------------------------------
// mapStrategyDetail accepts BOTH the POST/route.ts include (no lockedBy,
// linkedCampaigns without campaign) AND the [id]/route.ts include (with both).
// Canonical type is the narrower one; richer caller is assignable to it.
// lockedBy is added as optional intersection — read defensively with `?.`.
type StrategyDetailInput = Prisma.BusinessStrategyGetPayload<{
  include: {
    objectives: { include: { keyResults: true; focusArea: true } };
    focusAreas: { include: { _count: { select: { objectives: true } } } };
    milestones: true;
    linkedCampaigns: true;
  };
}> & {
  lockedBy?: { id: string; name: string | null } | null;
};

type ObjectiveInput = Prisma.ObjectiveGetPayload<{
  include: { keyResults: true; focusArea: true };
}>;

type FocusAreaInput = Prisma.FocusAreaGetPayload<{
  include: { _count: { select: { objectives: true } } };
}> & {
  objectives?: unknown[]; // fallback path — only `.length` is read
};

const createStrategySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum(["GROWTH", "MARKET_ENTRY", "PRODUCT_LAUNCH", "BRAND_BUILDING", "OPERATIONAL_EXCELLENCE", "CUSTOM"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vision: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  initialObjectives: z.array(z.object({
    title: z.string().min(1).max(200),
    keyResults: z.array(z.string()).optional(),
  })).optional(),
});

// =============================================================
// GET /api/strategies — list strategies with computed stats
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = { workspaceId };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const strategies = await prisma.businessStrategy.findMany({
      where,
      include: {
        objectives: { select: { id: true, status: true } },
        focusAreas: { select: { name: true } },
        linkedCampaigns: { select: { campaignId: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = strategies.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      type: s.type,
      status: s.status,
      progressPercentage: s.progressPercentage,
      objectives: {
        total: s.objectives.length,
        onTrack: s.objectives.filter((o) => o.status === "ON_TRACK").length,
        atRisk: s.objectives.filter((o) => o.status === "AT_RISK").length,
      },
      focusAreas: s.focusAreas.map((fa) => fa.name),
      linkedCampaignCount: s.linkedCampaigns.length,
      isLocked: s.isLocked,
      startDate: s.startDate?.toISOString() ?? null,
      endDate: s.endDate?.toISOString() ?? null,
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ strategies: mapped });
  } catch (error) {
    console.error("[GET /api/strategies]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/strategies — create strategy
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, type, startDate, endDate, vision, focusAreas, initialObjectives } = parsed.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const strategy = await prisma.$transaction(async (tx) => {
      const created = await tx.businessStrategy.create({
        data: {
          name,
          slug,
          description,
          type: type ?? "CUSTOM",
          vision: vision ?? null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          workspaceId,
          createdById: session.user.id,
          focusAreas: focusAreas?.length
            ? {
                create: focusAreas.map((fa) => ({ name: fa })),
              }
            : undefined,
        },
      });

      // Create initial objectives with key results if provided
      if (initialObjectives?.length) {
        for (let i = 0; i < initialObjectives.length; i++) {
          const obj = initialObjectives[i];
          await tx.objective.create({
            data: {
              title: obj.title,
              strategyId: created.id,
              sortOrder: i,
              targetValue: 100,
              keyResults: obj.keyResults?.length
                ? {
                    create: obj.keyResults.map((kr, krIdx) => ({
                      description: kr,
                      sortOrder: krIdx,
                    })),
                  }
                : undefined,
            },
          });
        }
      }

      // Re-fetch with all relations
      return tx.businessStrategy.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          objectives: { include: { keyResults: true, focusArea: true } },
          focusAreas: { include: { _count: { select: { objectives: true } } } },
          milestones: true,
          linkedCampaigns: true,
        },
      });
    });

    return NextResponse.json({ strategy: mapStrategyDetail(strategy) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/strategies]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mapStrategyDetail(s: StrategyDetailInput) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    type: s.type,
    status: s.status,
    progressPercentage: s.progressPercentage,
    vision: s.vision,
    rationale: s.rationale,
    keyAssumptions: s.keyAssumptions ?? [],
    strengths: s.strengths ?? [],
    weaknesses: s.weaknesses ?? [],
    opportunities: s.opportunities ?? [],
    threats: s.threats ?? [],
    objectives: (s.objectives ?? []).map(mapObjective),
    focusAreaDetails: (s.focusAreas ?? []).map(mapFocusArea),
    milestones: (s.milestones ?? []).map(mapMilestone),
    linkedCampaigns: (s.linkedCampaigns ?? []).map((lc: { campaignId: string; campaign?: { title: string; type: string; status: string; slug: string } }) => ({
      campaignId: lc.campaignId,
      title: lc.campaign?.title ?? "Unknown",
      type: lc.campaign?.type ?? "STRATEGIC",
      status: lc.campaign?.status ?? "ACTIVE",
      slug: lc.campaign?.slug ?? "",
    })),
    focusAreas: (s.focusAreas ?? []).map((fa: { name: string }) => fa.name),
    linkedCampaignCount: s.linkedCampaigns?.length ?? 0,
    isLocked: s.isLocked ?? false,
    lockedAt: s.lockedAt?.toISOString() ?? null,
    lockedBy: s.lockedBy ? { id: s.lockedBy.id, name: s.lockedBy.name } : null,
    startDate: s.startDate?.toISOString() ?? null,
    endDate: s.endDate?.toISOString() ?? null,
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapObjective(o: ObjectiveInput) {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    status: o.status,
    priority: o.priority,
    sortOrder: o.sortOrder,
    metricType: o.metricType,
    startValue: o.startValue,
    targetValue: o.targetValue,
    currentValue: o.currentValue,
    keyResults: (o.keyResults ?? []).map(mapKeyResult),
    focusArea: o.focusArea ? { id: o.focusArea.id, name: o.focusArea.name } : null,
  };
}

function mapKeyResult(kr: KeyResult) {
  return {
    id: kr.id,
    description: kr.description,
    status: kr.status,
    progressValue: kr.progressValue,
    sortOrder: kr.sortOrder,
  };
}

function mapFocusArea(fa: FocusAreaInput) {
  return {
    id: fa.id,
    name: fa.name,
    description: fa.description,
    icon: fa.icon,
    color: fa.color,
    objectiveCount: fa._count?.objectives ?? fa.objectives?.length ?? 0,
  };
}

function mapMilestone(m: Milestone) {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    date: m.date.toISOString(),
    quarter: m.quarter,
    status: m.status,
    completedAt: m.completedAt?.toISOString() ?? null,
  };
}

export { mapStrategyDetail, mapObjective, mapKeyResult, mapFocusArea, mapMilestone };
