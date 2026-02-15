import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ResearchPlanWithMeta, ResearchPlanListResponse } from "@/types/research-plan";

// =============================================================
// GET /api/research-plans?workspaceId=xxx
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const status = searchParams.get("status");
    const where: Record<string, unknown> = { workspaceId };
    if (status) where.status = status;

    const dbPlans = await prisma.researchPlan.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    const plans: ResearchPlanWithMeta[] = dbPlans.map((p) => ({
      id: p.id,
      method: p.method,
      entryMode: p.entryMode,
      status: p.status,
      unlockedMethods: (p.unlockedMethods as string[]) ?? [],
      unlockedAssets: (p.unlockedAssets as string[]) ?? [],
      rationale: (p.rationale as Record<string, string>) ?? null,
      configuration: p.configuration ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const response: ResearchPlanListResponse = {
      plans,
      stats: {
        total: plans.length,
        active: plans.filter((p) => p.status === "active").length,
        completed: plans.filter((p) => p.status === "completed").length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/research-plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/research-plans
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, entryMode, unlockedMethods, unlockedAssets, rationale, configuration, workspaceId } = body;

    if (!method || !workspaceId) {
      return NextResponse.json({ error: "method and workspaceId are required" }, { status: 400 });
    }

    const plan = await prisma.researchPlan.create({
      data: {
        method,
        entryMode: entryMode ?? "bundle",
        unlockedMethods: unlockedMethods ?? [],
        unlockedAssets: unlockedAssets ?? [],
        rationale: rationale ?? undefined,
        configuration: configuration ?? undefined,
        workspaceId,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research-plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/research-plans  { id, ...updates }
// =============================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const plan = await prisma.researchPlan.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[PATCH /api/research-plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
