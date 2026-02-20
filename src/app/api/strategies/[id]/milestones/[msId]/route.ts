import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; msId: string }> };

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  date: z.string().optional(),
  quarter: z.string().optional(),
  status: z.enum(["DONE", "UPCOMING", "FUTURE"]).optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/milestones/[msId]
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, msId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateMilestoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.quarter !== undefined) data.quarter = parsed.data.quarter;
    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      if (parsed.data.status === "DONE") {
        data.completedAt = new Date();
      }
    }

    const milestone = await prisma.milestone.update({
      where: { id: msId },
      data,
    });

    return NextResponse.json({ milestone: { id: milestone.id } });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/milestones/[msId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/strategies/[id]/milestones/[msId]
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, msId } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    await prisma.milestone.delete({ where: { id: msId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/strategies/[id]/milestones/[msId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
