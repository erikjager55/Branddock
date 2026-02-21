import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { openaiClient } from "@/lib/ai/openai-client";

interface StrategicImplication {
  category: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

function buildPrompt(persona: Record<string, unknown>): string {
  const lines: string[] = [];

  lines.push(`Persona: ${persona.name}`);
  if (persona.tagline) lines.push(`Tagline: ${persona.tagline}`);
  if (persona.age) lines.push(`Leeftijd: ${persona.age}`);
  if (persona.location) lines.push(`Locatie: ${persona.location}`);
  if (persona.occupation) lines.push(`Beroep: ${persona.occupation}`);
  if (persona.income) lines.push(`Inkomen: ${persona.income}`);
  if (persona.education) lines.push(`Opleiding: ${persona.education}`);
  if (persona.personalityType) lines.push(`Persoonlijkheidstype: ${persona.personalityType}`);

  const arr = (v: unknown) => (Array.isArray(v) && v.length > 0 ? v.join(", ") : null);

  const coreValues = arr(persona.coreValues);
  if (coreValues) lines.push(`Kernwaarden: ${coreValues}`);
  const interests = arr(persona.interests);
  if (interests) lines.push(`Interesses: ${interests}`);
  const goals = arr(persona.goals);
  if (goals) lines.push(`Doelen: ${goals}`);
  const motivations = arr(persona.motivations);
  if (motivations) lines.push(`Motivaties: ${motivations}`);
  const frustrations = arr(persona.frustrations);
  if (frustrations) lines.push(`Frustraties: ${frustrations}`);
  const behaviors = arr(persona.behaviors);
  if (behaviors) lines.push(`Gedragingen: ${behaviors}`);

  return lines.join("\n");
}

// POST /api/personas/[id]/strategic-implications
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const personaProfile = buildPrompt(persona as unknown as Record<string, unknown>);

    const systemPrompt = `Je bent een strategisch brand consultant. Je analyseert personas en genereert concrete, actionable strategische implicaties voor het merk.

Antwoord ALTIJD in valid JSON met precies deze structuur:
{
  "implications": [
    {
      "category": "Messaging",
      "title": "korte titel (max 8 woorden)",
      "description": "2-3 zinnen concrete aanbeveling, specifiek voor deze persona",
      "priority": "high"
    }
  ]
}

De priority waarde moet "high", "medium" of "low" zijn.`;

    const userPrompt = `Analyseer de volgende persona en genereer 5 concrete strategische implicaties:

${personaProfile}

Genereer precies 5 strategische implicaties in deze categorieën:
1. Messaging — Hoe communiceer je met deze persona?
2. Channel Strategy — Via welke kanalen bereik je deze persona?
3. Content — Welk type content resoneert?
4. Product — Welke product-aanpassingen zijn nodig?
5. Brand — Hoe bouw je vertrouwen op?

Antwoord in JSON.`;

    const result = await openaiClient.createStructuredCompletion<{
      implications: StrategicImplication[];
    }>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { useCase: "STRUCTURED" }
    );

    const implications = result.implications;
    if (!Array.isArray(implications) || implications.length === 0) {
      throw new Error("Invalid AI response: no implications array");
    }

    // Store as JSON string in the strategicImplications field
    const strategicImplications = JSON.stringify(implications);

    await prisma.persona.update({
      where: { id },
      data: { strategicImplications },
    });

    return NextResponse.json({ strategicImplications });
  } catch (error) {
    console.error("[POST /api/personas/:id/strategic-implications]", error);
    return NextResponse.json(
      { error: "Failed to generate strategic implications" },
      { status: 500 }
    );
  }
}
