import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; faId: string }> };

const updateFocusAreaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/focus-areas/[faId]
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, faId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateFocusAreaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const focusArea = await prisma.focusArea.update({
      where: { id: faId },
      data: parsed.data,
    });

    return NextResponse.json({ focusArea: { id: focusArea.id, name: focusArea.name } });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/focus-areas/[faId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/strategies/[id]/focus-areas/[faId]
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, faId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.focusArea.delete({ where: { id: faId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]/focus-areas/[faId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
