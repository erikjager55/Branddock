import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { mapStrategyDetail } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

const updateStrategySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(["GROWTH", "MARKET_ENTRY", "PRODUCT_LAUNCH", "BRAND_BUILDING", "OPERATIONAL_EXCELLENCE", "CUSTOM"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

// =============================================================
// GET /api/strategies/[id] — full detail with all relations
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      include: {
        objectives: {
          include: { keyResults: { orderBy: { sortOrder: "asc" } }, focusArea: true },
          orderBy: { sortOrder: "asc" },
        },
        focusAreas: { include: { _count: { select: { objectives: true } } } },
        milestones: { orderBy: { date: "asc" } },
        linkedCampaigns: true,
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    return NextResponse.json(mapStrategyDetail(strategy));
  } catch (error) {
    console.error("[GET /api/strategies/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/strategies/[id] — update strategy
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;

    const strategy = await prisma.businessStrategy.update({
      where: { id },
      data,
      include: {
        objectives: {
          include: { keyResults: { orderBy: { sortOrder: "asc" } }, focusArea: true },
          orderBy: { sortOrder: "asc" },
        },
        focusAreas: { include: { _count: { select: { objectives: true } } } },
        milestones: { orderBy: { date: "asc" } },
        linkedCampaigns: true,
      },
    });

    return NextResponse.json({ strategy: mapStrategyDetail(strategy) });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/strategies/[id] — delete strategy (cascade)
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.businessStrategy.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
