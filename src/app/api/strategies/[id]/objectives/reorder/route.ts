import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

const reorderSchema = z.object({
  objectiveIds: z.array(z.string()),
});

// =============================================================
// PATCH /api/strategies/[id]/objectives/reorder
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updates = parsed.data.objectiveIds.map((objId, i) =>
      prisma.objective.updateMany({
        where: { id: objId, strategyId: id },
        data: { sortOrder: i },
      }),
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/objectives/reorder]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
