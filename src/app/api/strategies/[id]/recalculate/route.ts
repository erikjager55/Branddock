import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// POST /api/strategies/[id]/recalculate — recalculate progress
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const strategy = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
      include: {
        objectives: true,
      },
    });
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    // Per objective: min(100, max(0, ((current - start) / (target - start)) * 100))
    const objectivePercentages = strategy.objectives.map((obj) => {
      const range = obj.targetValue - obj.startValue;
      if (range === 0) return obj.currentValue >= obj.targetValue ? 100 : 0;
      return Math.min(100, Math.max(0, ((obj.currentValue - obj.startValue) / range) * 100));
    });

    // Strategy progress = average of all objective percentages
    const progressPercentage =
      objectivePercentages.length > 0
        ? Math.round(
            objectivePercentages.reduce((sum, p) => sum + p, 0) / objectivePercentages.length,
          )
        : 0;

    await prisma.businessStrategy.update({
      where: { id },
      data: { progressPercentage },
    });

    return NextResponse.json({ progressPercentage });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/recalculate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
