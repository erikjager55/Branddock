import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type { ResearchPlanWithMeta, ResearchPlanListResponse } from "@/types/research-plan";

// L8 Zod-sweep (audit 2026-06-26): de POST spreadde `configuration` (vrije
// JSON) + `unlockedMethods`/`unlockedAssets`-arrays ongevalideerd in
// prisma.create. Cap de arrays en begrens de vrije JSON tot een object.
const createResearchPlanSchema = z.object({
  method: z.string().min(1).max(200),
  entryMode: z.string().max(50).optional(),
  unlockedMethods: z.array(z.string().max(200)).max(100).optional(),
  unlockedAssets: z.array(z.string().max(200)).max(100).optional(),
  // rationale is een Record<string,string> in het contract (types + Prisma
  // + de GET in dit bestand), niet een losse string.
  rationale: z.record(z.string().max(200), z.string().max(10000)).optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/research-plans
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
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

// POST /api/research-plans
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const parsed = createResearchPlanSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { method, entryMode, unlockedMethods, unlockedAssets, rationale, configuration } =
      parsed.data;

    const plan = await prisma.researchPlan.create({
      data: {
        method,
        entryMode: entryMode ?? "bundle",
        unlockedMethods: unlockedMethods ?? [],
        unlockedAssets: unlockedAssets ?? [],
        rationale: rationale ?? undefined,
        configuration: (configuration ?? undefined) as
          | import("@prisma/client").Prisma.InputJsonValue
          | undefined,
        workspaceId,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research-plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/research-plans  { id, ...updates }
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
