import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  date: z.string(),
  quarter: z.string().optional(),
  status: z.enum(["DONE", "UPCOMING", "FUTURE"]).optional(),
});

// =============================================================
// POST /api/strategies/[id]/milestones
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
    const parsed = createMilestoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const dateObj = new Date(parsed.data.date);
    const quarter = parsed.data.quarter ?? `Q${Math.ceil((dateObj.getMonth() + 1) / 3)} ${dateObj.getFullYear()}`;

    const milestone = await prisma.milestone.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        date: dateObj,
        quarter,
        status: parsed.data.status ?? "UPCOMING",
        strategyId: id,
      },
    });

    return NextResponse.json({
      milestone: {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        date: milestone.date.toISOString(),
        quarter: milestone.quarter,
        status: milestone.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/milestones]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
