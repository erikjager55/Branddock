import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";

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
  if (persona.age) lines.push(`Age: ${persona.age}`);
  if (persona.location) lines.push(`Location: ${persona.location}`);
  if (persona.occupation) lines.push(`Occupation: ${persona.occupation}`);
  if (persona.income) lines.push(`Income: ${persona.income}`);
  if (persona.education) lines.push(`Education: ${persona.education}`);
  if (persona.personalityType) lines.push(`Personality: ${persona.personalityType}`);
  const arr = (v: unknown) => (Array.isArray(v) && v.length > 0 ? v.join(", ") : null);
  const coreValues = arr(persona.coreValues);
  if (coreValues) lines.push(`Core Values: ${coreValues}`);
  const interests = arr(persona.interests);
  if (interests) lines.push(`Interests: ${interests}`);
  const goals = arr(persona.goals);
  if (goals) lines.push(`Goals: ${goals}`);
  const motivations = arr(persona.motivations);
  if (motivations) lines.push(`Motivations: ${motivations}`);
  const frustrations = arr(persona.frustrations);
  if (frustrations) lines.push(`Frustrations: ${frustrations}`);
  const behaviors = arr(persona.behaviors);
  if (behaviors) lines.push(`Behaviors: ${behaviors}`);
  return lines.join("\n");
}

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

    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const personaProfile = buildPrompt(persona as unknown as Record<string, unknown>);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a strategic brand consultant. Analyze the following persona and generate exactly 5 strategic implications.

${personaProfile}

Generate exactly 5 strategic implications in these categories:
1. Messaging — How to communicate with this persona?
2. Channel Strategy — Which channels reach this persona?
3. Content — What content resonates?
4. Product — What product adjustments are needed?
5. Brand — How to build trust?

Respond ONLY with valid JSON, no markdown, no backticks:
{"implications":[{"category":"Messaging","title":"short title max 8 words","description":"2-3 sentences concrete recommendation","priority":"high"},...]}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[Anthropic API error]", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    let implications: StrategicImplication[];
    try {
      const parsed = JSON.parse(text);
      implications = parsed.implications;
      if (!Array.isArray(implications) || implications.length === 0) {
        throw new Error("No implications array");
      }
    } catch (parseErr) {
      console.error("[Strategic implications parse error]", parseErr, text);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const strategicImplications = JSON.stringify(implications);
    await prisma.persona.update({
      where: { id },
      data: { strategicImplications },
    });

    return NextResponse.json({ strategicImplications });
  } catch (error) {
    console.error("[POST /api/personas/:id/strategic-implications]", error);
    return NextResponse.json({ error: "Failed to generate strategic implications" }, { status: 500 });
  }
}
