import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ workshopId: string }> };

const timerSchema = z.object({
  timerSeconds: z.number().int().min(0),
});

// =============================================================
// PATCH /api/workshops/[workshopId]/timer
// Timer sync
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;
    const body = await request.json();
    const parsed = timerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.workshop.updateMany({
      where: { id: workshopId, workspaceId },
      data: { timerSeconds: parsed.data.timerSeconds },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json({ timerSeconds: parsed.data.timerSeconds });
  } catch (error) {
    console.error("[PATCH /api/workshops/:workshopId/timer]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
