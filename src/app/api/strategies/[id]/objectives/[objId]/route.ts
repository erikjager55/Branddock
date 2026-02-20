import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { mapObjective } from "../../../route";

type RouteParams = { params: Promise<{ id: string; objId: string }> };

const updateObjectiveSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  focusAreaId: z.string().nullable().optional(),
  metricType: z.enum(["PERCENTAGE", "NUMBER", "CURRENCY"]).optional(),
  startValue: z.number().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/objectives/[objId]
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, objId } = await params;

    // Verify strategy belongs to workspace
    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const objective = await prisma.objective.update({
      where: { id: objId },
      data: parsed.data,
      include: {
        keyResults: { orderBy: { sortOrder: "asc" } },
        focusArea: true,
      },
    });

    return NextResponse.json({ objective: mapObjective(objective) });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/objectives/[objId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/strategies/[id]/objectives/[objId]
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, objId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.objective.delete({ where: { id: objId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]/objectives/[objId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
