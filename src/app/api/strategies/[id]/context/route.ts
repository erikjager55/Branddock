import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

const updateContextSchema = z.object({
  vision: z.string().optional(),
  rationale: z.string().optional(),
  keyAssumptions: z.array(z.string()).optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/context — update vision/rationale/keyAssumptions
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
    const parsed = updateContextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.vision !== undefined) data.vision = parsed.data.vision;
    if (parsed.data.rationale !== undefined) data.rationale = parsed.data.rationale;
    if (parsed.data.keyAssumptions !== undefined) data.keyAssumptions = parsed.data.keyAssumptions;

    await prisma.businessStrategy.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
