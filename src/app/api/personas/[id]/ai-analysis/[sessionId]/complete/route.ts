import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const VALIDATION_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS: 0.30,
  QUESTIONNAIRE: 0.30,
  USER_TESTING: 0.25,
};

function computeValidationPercentage(
  researchMethods: { method: string; status: string }[]
): number {
  let total = 0;
  for (const rm of researchMethods) {
    if (rm.status === "COMPLETED") {
      const weight = VALIDATION_WEIGHTS[rm.method] ?? 0;
      total += weight * 100;
    }
  }
  return Math.min(100, Math.round(total));
}

// POST /api/personas/[id]/ai-analysis/[sessionId]/complete
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, sessionId } = await params;

    const analysisSession = await prisma.aIPersonaAnalysisSession.findFirst({
      where: { id: sessionId, personaId: id, workspaceId },
    });

    if (!analysisSession) {
      return NextResponse.json({ error: "Analysis session not found" }, { status: 404 });
    }

    if (analysisSession.status === "COMPLETED") {
      return NextResponse.json({ error: "Analysis already completed" }, { status: 400 });
    }

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const insightsData = {
      dimensions: [
        {
          key: "demographics",
          title: "Demographics Profile",
          icon: "Users",
          summary: `${persona.name} represents a ${persona.age ?? "young professional"} ${persona.gender?.toLowerCase() ?? "individual"} based in ${persona.location ?? "an urban environment"}. ${persona.occupation ? `Working as ${persona.occupation}, they bring` : "They bring"} a unique perspective shaped by their professional and cultural context.`,
        },
        {
          key: "goals_motivations",
          title: "Goals & Motivations",
          icon: "TrendingUp",
          summary: `Driven by ${persona.motivations?.slice(0, 2).join(" and ") || "a desire for growth"}. ${persona.goals?.[0] ? `Primary goal: ${persona.goals[0]}.` : ""} Their motivations align with a need for meaningful professional impact.`,
        },
        {
          key: "challenges_frustrations",
          title: "Challenges & Pain Points",
          icon: "Heart",
          summary: `Key frustrations include ${persona.frustrations?.slice(0, 2).join(" and ") || "challenges with existing solutions"}. These pain points represent opportunities for targeted value delivery.`,
        },
        {
          key: "value_proposition",
          title: "Value Alignment",
          icon: "Zap",
          summary: `The brand's offering directly addresses ${persona.name}'s core needs. ${persona.behaviors?.[0] ? `Their behavior pattern of "${persona.behaviors[0]}" suggests` : "Their profile suggests"} strong alignment with the product's value proposition.`,
        },
      ],
      researchBoostPercentage: 15,
      completedAt: new Date().toISOString(),
    };

    // Mark session as completed
    await prisma.aIPersonaAnalysisSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        progress: 100,
        answeredDimensions: 4,
        insightsData,
        completedAt: new Date(),
      },
    });

    // Update research method AI_EXPLORATION → COMPLETED
    await prisma.personaResearchMethod.updateMany({
      where: { personaId: id, method: "AI_EXPLORATION" },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    });

    // Recalculate validation percentage
    const methods = await prisma.personaResearchMethod.findMany({
      where: { personaId: id },
    });

    const validationPercentage = computeValidationPercentage(
      methods.map((m) => ({ method: m.method, status: m.status }))
    );

    return NextResponse.json({
      status: "COMPLETED",
      insightsData,
      researchBoost: 15,
      validationPercentage,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/ai-analysis/:sessionId/complete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
