import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; objId: string; krId: string }> };

const updateKeyResultSchema = z.object({
  description: z.string().optional(),
  status: z.enum(["ON_TRACK", "COMPLETE", "BEHIND"]).optional(),
  progressValue: z.string().nullable().optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/objectives/[objId]/key-results/[krId]
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, krId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateKeyResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const keyResult = await prisma.keyResult.update({
      where: { id: krId },
      data: parsed.data,
    });

    return NextResponse.json({ keyResult: { id: keyResult.id } });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/objectives/[objId]/key-results/[krId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/strategies/[id]/objectives/[objId]/key-results/[krId]
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, krId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.keyResult.delete({ where: { id: krId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]/objectives/[objId]/key-results/[krId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
