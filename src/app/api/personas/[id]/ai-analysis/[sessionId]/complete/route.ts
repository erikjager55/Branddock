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
      executiveSummary: `Based on the analysis of ${persona.name}, this persona is a ${persona.occupation ?? "professional"}${persona.location ? ` based in ${persona.location}` : ""}, with a focus on ${goals[0] ?? "professional growth"}. The unique value position lies in the combination of their professional context with their personal drivers${coreValues.length > 0 ? ` and core values (${coreValues.slice(0, 3).join(", ")})` : ""}. With attention to the identified challenges${frustrations.length > 0 ? ` — including ${frustrations[0]}` : ""} — there is a solid foundation for strategic brand positioning.`,

      findings: [
        {
          title: "Demographic Profile",
          description: `${persona.name} is a ${persona.age ?? "professional"} ${persona.gender?.toLowerCase() ?? "individual"} working as ${persona.occupation ?? "not specified"}. ${persona.education ? `Education level: ${persona.education}.` : ""} ${persona.income ? `Income level: ${persona.income}.` : ""} ${persona.familyStatus ? `Family situation: ${persona.familyStatus}.` : ""}`,
        },
        {
          title: "Goals & Motivations",
          description: goals.length > 0 || motivations.length > 0
            ? `${goals.length > 0 ? `Goals: ${goals.join("; ")}. ` : ""}${motivations.length > 0 ? `Motivations: ${motivations.join("; ")}.` : ""}`
            : "No specific goals or motivations defined.",
        },
        {
          title: "Challenges & Pain Points",
          description: frustrations.length > 0
            ? `Key frustrations: ${frustrations.join("; ")}. These pain points offer opportunities for targeted value creation.`
            : "No specific frustrations defined.",
        },
        {
          title: "Behavior & Decision Patterns",
          description: `${behaviors.length > 0 ? `Behavioral patterns: ${behaviors.join("; ")}. ` : ""}${buyingTriggers.length > 0 ? `Buying triggers: ${buyingTriggers.join("; ")}. ` : ""}${decisionCriteria.length > 0 ? `Decision criteria: ${decisionCriteria.join("; ")}.` : ""}` || "Based on the profile, patterns can be identified in decision-making.",
        },
        {
          title: "Value Proposition & Alignment",
          description: `The offering aligns with the core needs of ${persona.name}. ${coreValues.length > 0 ? `The core values (${coreValues.join(", ")}) form the basis for brand preference. ` : ""}${persona.quote ? `In their own words: "${persona.quote}"` : ""}`,
        },
      ],

      recommendations: [
        `Integrate the demographic profile of ${persona.name} into all communication assets`,
        "Develop persona-specific customer journeys for the defined target audience",
        "Create content that makes the unique value tangible and understandable",
        frustrations.length > 0
          ? `Build thought leadership around solutions for: ${frustrations[0]}`
          : "Build thought leadership around solutions for customer challenges",
        coreValues.length > 0
          ? `Translate the core values (${coreValues.slice(0, 3).join(", ")}) into concrete behaviors and decision criteria`
          : "Translate values into concrete behaviors and decision criteria",
      ],

      fieldSuggestions: generateFieldSuggestions(persona, {
        goals, motivations, frustrations, behaviors, coreValues, buyingTriggers, decisionCriteria,
      }),
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

/**
 * Generates field suggestions based on persona data gaps and analysis insights.
 * Each suggestion proposes a new or improved value for a persona field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateFieldSuggestions(persona: any, arrays: {
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  coreValues: string[];
  buyingTriggers: string[];
  decisionCriteria: string[];
}) {
  const suggestions: Array<{
    id: string;
    field: string;
    label: string;
    currentValue: string | string[] | null;
    suggestedValue: string | string[];
    reason: string;
    status: string;
  }> = [];

  let counter = 1;
  const add = (
    field: string,
    label: string,
    currentValue: string | string[] | null,
    suggestedValue: string | string[],
    reason: string,
  ) => {
    suggestions.push({
      id: `fs-${counter++}`,
      field,
      label,
      currentValue,
      suggestedValue,
      reason,
      status: "pending",
    });
  };

  // Suggest tagline if missing
  if (!persona.tagline) {
    const role = persona.occupation ?? "professional";
    const loc = persona.location ? ` from ${persona.location}` : "";
    add(
      "tagline",
      "Tagline",
      null,
      `The ${persona.age ?? "ambitious"} ${role}${loc} who values quality and efficiency`,
      "A tagline summarizes the persona concisely and makes it easier to recognize within your team.",
    );
  }

  // Suggest quote if missing
  if (!persona.quote) {
    const goal = arrays.goals[0] ?? "growth and innovation";
    add(
      "quote",
      "Quote",
      null,
      `"I'm looking for solutions that help me with ${goal} — without unnecessary complexity."`,
      "A representative quote brings the persona to life and makes communication more human.",
    );
  }

  // Suggest bio if missing
  if (!persona.bio) {
    const parts: string[] = [];
    if (persona.age && persona.occupation) {
      parts.push(`${persona.name} is a ${persona.age}-year-old ${persona.occupation}`);
    } else {
      parts.push(`${persona.name} is a driven professional`);
    }
    if (persona.location) parts.push(`based in ${persona.location}`);
    if (persona.education) parts.push(`with a background in ${persona.education}`);
    if (arrays.goals.length > 0) {
      parts.push(`who strives for ${arrays.goals[0]}`);
    }
    add(
      "bio",
      "Bio",
      null,
      parts.join(", ") + ".",
      "A short bio provides context for the persona and helps with content creation.",
    );
  }

  // Suggest buying triggers if empty or sparse
  if (arrays.buyingTriggers.length < 2) {
    const suggested = [
      "Proven ROI and concrete results",
      "Recommendation from a trusted peer",
      "Time pressure due to deadline or market change",
    ];
    add(
      "buyingTriggers",
      "Buying Triggers",
      arrays.buyingTriggers.length > 0 ? arrays.buyingTriggers : null,
      suggested,
      "Buying triggers help with timing sales and marketing moments.",
    );
  }

  // Suggest decision criteria if empty or sparse
  if (arrays.decisionCriteria.length < 2) {
    const suggested = [
      "Price-quality ratio",
      "Scalability and future-proofing",
      "Ease of use and implementation time",
    ];
    add(
      "decisionCriteria",
      "Decision Criteria",
      arrays.decisionCriteria.length > 0 ? arrays.decisionCriteria : null,
      suggested,
      "Decision criteria are essential for sales enablement and product positioning.",
    );
  }

  // Suggest additional frustrations if sparse
  if (arrays.frustrations.length < 2) {
    add(
      "frustrations",
      "Frustrations",
      arrays.frustrations.length > 0 ? arrays.frustrations : null,
      [
        "Too many tools that don't integrate well",
        "Lack of data-driven insights for decision-making",
      ],
      "More pain points help sharpen the formulation of your value proposition.",
    );
  }

  // Suggest behaviors if sparse
  if (arrays.behaviors.length < 2) {
    add(
      "behaviors",
      "Behaviors",
      arrays.behaviors.length > 0 ? arrays.behaviors : null,
      [
        "Conducts extensive online research before purchases",
        "Consults reviews and comparison sites",
        "Follows thought leaders on LinkedIn",
      ],
      "Behavioral patterns inform which channels and content formats work best.",
    );
  }

  return suggestions;
}
