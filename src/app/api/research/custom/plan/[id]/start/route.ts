import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// POST /api/research/custom/plan/[id]/start — start validation (free-only plans)
// =============================================================
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const plan = await prisma.validationPlan.findFirst({
      where: { id, workspaceId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.validationPlan.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json({ success: true, status: "in_progress" });
  } catch (error) {
    console.error("[POST /api/research/custom/plan/[id]/start]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
