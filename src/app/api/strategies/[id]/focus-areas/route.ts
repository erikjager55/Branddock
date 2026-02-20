import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

const createFocusAreaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// =============================================================
// POST /api/strategies/[id]/focus-areas
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
    const parsed = createFocusAreaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const focusArea = await prisma.focusArea.create({
      data: {
        ...parsed.data,
        strategyId: id,
      },
    });

    return NextResponse.json({ focusArea: { id: focusArea.id } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/focus-areas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
