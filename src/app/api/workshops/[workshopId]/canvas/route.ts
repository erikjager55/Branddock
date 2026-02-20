import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ workshopId: string }> };

const canvasSchema = z.object({
  canvasData: z.record(z.string(), z.unknown()),
  canvasLocked: z.boolean().optional(),
});

// =============================================================
// PATCH /api/workshops/[workshopId]/canvas
// Update canvas data (unlock/edit/lock)
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;
    const body = await request.json();
    const parsed = canvasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      canvasData: parsed.data.canvasData,
    };
    if (parsed.data.canvasLocked !== undefined) {
      updateData.canvasLocked = parsed.data.canvasLocked;
    }

    const updated = await prisma.workshop.updateMany({
      where: { id: workshopId, workspaceId },
      data: updateData,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json({
      canvasData: parsed.data.canvasData,
      canvasLocked: parsed.data.canvasLocked,
    });
  } catch (error) {
    console.error("[PATCH /api/workshops/:workshopId/canvas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
