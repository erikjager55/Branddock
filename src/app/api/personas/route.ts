import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/personas?workspaceId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const dbPersonas = await prisma.persona.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      include: {
        researchMethods: true,
        createdBy: { select: { name: true, avatarUrl: true } },
      },
    });

    const personas = dbPersonas.map((p) => {
      const methodsCompleted = p.researchMethods.filter(
        (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
      ).length;

      // Validation percentage: gewogen op basis van methode progress
      const totalWeight = p.researchMethods.length || 1;
      const weightedProgress = p.researchMethods.reduce(
        (sum, m) => sum + m.progress, 0
      );
      const validationPercentage = Math.round(weightedProgress / totalWeight);

      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        avatarUrl: p.avatarUrl,
        avatarSource: p.avatarSource,
        age: p.age,
        gender: p.gender,
        location: p.location,
        occupation: p.occupation,
        education: p.education,
        income: p.income,
        familyStatus: p.familyStatus,
        personalityType: p.personalityType,
        coreValues: p.coreValues,
        interests: p.interests,
        goals: p.goals,
        motivations: p.motivations,
        frustrations: p.frustrations,
        behaviors: p.behaviors,
        strategicImplications: p.strategicImplications,
        isLocked: p.isLocked,
        lockedAt: p.lockedAt?.toISOString() ?? null,
        validationPercentage,
        researchMethods: p.researchMethods.map((m) => ({
          id: m.id,
          method: m.method,
          status: m.status,
          progress: m.progress,
          completedAt: m.completedAt?.toISOString() ?? null,
          artifactsCount: m.artifactsCount,
        })),
        createdBy: {
          name: p.createdBy.name ?? "Unknown",
          avatarUrl: p.createdBy.avatarUrl,
        },
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const stats = {
      total: personas.length,
      ready: personas.filter((p) => p.validationPercentage >= 80).length,
      needsWork: personas.filter((p) => p.validationPercentage < 80).length,
    };

    return NextResponse.json({ personas, stats });
  } catch (error) {
    console.error("[GET /api/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/personas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, workspaceId, createdById, ...rest } = body;

    if (!name || !workspaceId || !createdById) {
      return NextResponse.json(
        { error: "name, workspaceId and createdById are required" },
        { status: 400 }
      );
    }

    const persona = await prisma.persona.create({
      data: {
        name,
        workspaceId,
        createdById,
        tagline: rest.tagline ?? null,
        age: rest.age ?? null,
        gender: rest.gender ?? null,
        location: rest.location ?? null,
        occupation: rest.occupation ?? null,
        education: rest.education ?? null,
        income: rest.income ?? null,
        familyStatus: rest.familyStatus ?? null,
        personalityType: rest.personalityType ?? null,
        coreValues: rest.coreValues ?? [],
        interests: rest.interests ?? [],
        goals: rest.goals ?? [],
        motivations: rest.motivations ?? [],
        frustrations: rest.frustrations ?? [],
        behaviors: rest.behaviors ?? [],
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
