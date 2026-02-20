import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; objId: string }> };

const createKeyResultSchema = z.object({
  description: z.string().min(1),
  status: z.enum(["ON_TRACK", "COMPLETE", "BEHIND"]).optional(),
  progressValue: z.string().optional(),
});

// =============================================================
// POST /api/strategies/[id]/objectives/[objId]/key-results
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const parsed = createKeyResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Determine next sortOrder
    const maxOrder = await prisma.keyResult.aggregate({
      where: { objectiveId: objId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const keyResult = await prisma.keyResult.create({
      data: {
        ...parsed.data,
        sortOrder: nextOrder,
        objectiveId: objId,
      },
    });

    return NextResponse.json({ keyResult: { id: keyResult.id } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/objectives/[objId]/key-results]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
