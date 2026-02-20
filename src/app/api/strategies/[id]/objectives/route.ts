import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { mapObjective } from "../../route";

type RouteParams = { params: Promise<{ id: string }> };

const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  focusAreaId: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  metricType: z.enum(["PERCENTAGE", "NUMBER", "CURRENCY"]).optional(),
  startValue: z.number().optional(),
  targetValue: z.number(),
  keyResults: z.array(z.string()).optional(),
});

// =============================================================
// GET /api/strategies/[id]/objectives — sorted, include KRs + focusArea
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
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const objectives = await prisma.objective.findMany({
      where: { strategyId: id },
      include: {
        keyResults: { orderBy: { sortOrder: "asc" } },
        focusArea: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ objectives: objectives.map(mapObjective) });
  } catch (error) {
    console.error("[GET /api/strategies/[id]/objectives]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/strategies/[id]/objectives — create + optional KR strings
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Determine next sortOrder
    const maxOrder = await prisma.objective.aggregate({
      where: { strategyId: id },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const { keyResults, ...rest } = parsed.data;

    const objective = await prisma.objective.create({
      data: {
        ...rest,
        sortOrder: nextOrder,
        strategyId: id,
        keyResults: keyResults?.length
          ? {
              create: keyResults.map((desc, i) => ({
                description: desc,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        keyResults: { orderBy: { sortOrder: "asc" } },
        focusArea: true,
      },
    });

    return NextResponse.json({ objective: mapObjective(objective) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/objectives]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
