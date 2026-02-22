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

    const goals = (persona.goals as string[] | null) ?? [];
    const motivations = (persona.motivations as string[] | null) ?? [];
    const frustrations = (persona.frustrations as string[] | null) ?? [];
    const behaviors = (persona.behaviors as string[] | null) ?? [];
    const coreValues = (persona.coreValues as string[] | null) ?? [];
    const buyingTriggers = (persona.buyingTriggers as string[] | null) ?? [];
    const decisionCriteria = (persona.decisionCriteria as string[] | null) ?? [];

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
          summary: `Driven by ${motivations.slice(0, 2).join(" and ") || "a desire for growth"}. ${goals[0] ? `Primary goal: ${goals[0]}.` : ""} Their motivations align with a need for meaningful professional impact.`,
        },
        {
          key: "challenges_frustrations",
          title: "Challenges & Pain Points",
          icon: "Heart",
          summary: `Key frustrations include ${frustrations.slice(0, 2).join(" and ") || "challenges with existing solutions"}. These pain points represent opportunities for targeted value delivery.`,
        },
        {
          key: "value_proposition",
          title: "Value Alignment",
          icon: "Zap",
          summary: `The brand's offering directly addresses ${persona.name}'s core needs. ${behaviors[0] ? `Their behavior pattern of "${behaviors[0]}" suggests` : "Their profile suggests"} strong alignment with the product's value proposition.`,
        },
      ],
      researchBoostPercentage: 15,
      completedAt: new Date().toISOString(),

      // Report fields
      executiveSummary: `Op basis van de analyse van ${persona.name} blijkt dat deze persona een ${persona.occupation ?? "professional"} is${persona.location ? ` gevestigd in ${persona.location}` : ""}, met een focus op ${goals[0] ?? "professionele groei"}. De unieke waardepositie ligt in de combinatie van hun professionele context met hun persoonlijke drijfveren${coreValues.length > 0 ? ` en kernwaarden (${coreValues.slice(0, 3).join(", ")})` : ""}. Met aandacht voor de geïdentificeerde uitdagingen${frustrations.length > 0 ? ` — waaronder ${frustrations[0]}` : ""} — is er een solide basis voor strategische merkpositionering.`,

      findings: [
        {
          title: "Demografisch Profiel",
          description: `${persona.name} is een ${persona.age ?? "professional"} ${persona.gender?.toLowerCase() ?? "persoon"} met als rol ${persona.occupation ?? "niet gespecificeerd"}. ${persona.education ? `Opleidingsniveau: ${persona.education}.` : ""} ${persona.income ? `Inkomensniveau: ${persona.income}.` : ""} ${persona.familyStatus ? `Gezinssituatie: ${persona.familyStatus}.` : ""}`,
        },
        {
          title: "Doelen & Motivaties",
          description: goals.length > 0 || motivations.length > 0
            ? `${goals.length > 0 ? `Doelen: ${goals.join("; ")}. ` : ""}${motivations.length > 0 ? `Motivaties: ${motivations.join("; ")}.` : ""}`
            : "Geen specifieke doelen of motivaties gedefinieerd.",
        },
        {
          title: "Uitdagingen & Pijnpunten",
          description: frustrations.length > 0
            ? `Belangrijkste frustraties: ${frustrations.join("; ")}. Deze pijnpunten bieden mogelijkheden voor gerichte waardecreatie.`
            : "Geen specifieke frustraties gedefinieerd.",
        },
        {
          title: "Gedrag & Beslispatronen",
          description: `${behaviors.length > 0 ? `Gedragspatronen: ${behaviors.join("; ")}. ` : ""}${buyingTriggers.length > 0 ? `Kooptriggers: ${buyingTriggers.join("; ")}. ` : ""}${decisionCriteria.length > 0 ? `Besliscriteria: ${decisionCriteria.join("; ")}.` : ""}` || "Op basis van het profiel kunnen patronen worden geïdentificeerd in besluitvorming.",
        },
        {
          title: "Waardepropositie & Aansluiting",
          description: `Het aanbod sluit aan bij de kernbehoeften van ${persona.name}. ${coreValues.length > 0 ? `De kernwaarden (${coreValues.join(", ")}) vormen de basis voor merkvoorkeur. ` : ""}${persona.quote ? `In eigen woorden: "${persona.quote}"` : ""}`,
        },
      ],

      recommendations: [
        `Integreer het demografisch profiel van ${persona.name} in alle communicatie-uitingen`,
        "Ontwikkel persona-specifieke customer journeys voor de gedefinieerde doelgroep",
        "Creëer content die de unieke waarde tastbaar en begrijpelijk maakt",
        frustrations.length > 0
          ? `Bouw thought leadership rond oplossingen voor: ${frustrations[0]}`
          : "Bouw thought leadership rond oplossingen voor klantuitdagingen",
        coreValues.length > 0
          ? `Vertaal de kernwaarden (${coreValues.slice(0, 3).join(", ")}) naar concrete gedragingen en besliscriteria`
          : "Vertaal waarden naar concrete gedragingen en besliscriteria",
      ],
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
