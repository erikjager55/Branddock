import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContextTier } from "@/lib/ai/prompt-templates";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { getPromptVersion } from "@/lib/ai/prompt-version-registry";
import { timeoutForTokens } from "@/lib/ai/call-budget";
import { createVersion } from "@/lib/versioning";
import { buildPersonaSnapshot } from "@/lib/snapshot-builders";

// 1024 truncated 5 descriptions in verbose locales; timeout stays coupled
// to the budget via timeoutForTokens (gotcha 2026-05-24).
const IMPLICATIONS_MAX_TOKENS = 2048;

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

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const session = await getServerSession();
    const { id } = await params;

    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const personaProfile = buildPrompt(persona as unknown as Record<string, unknown>);

    // Implications must be about the REAL brand (audit 2026-06-11 HIGH:
    // persona-only prompt produced generic consultant output). Medium tier
    // injects name/positioning/products and — F4 — puts the workspace
    // content-language instruction first, so locale enforcement is preserved.
    const brandContext = await getBrandContext(workspaceId);
    const brandContextBlock = formatBrandContextTier(brandContext, "medium");

    const systemPrompt = `You are a strategic brand consultant. You analyze a customer persona and derive strategic implications for the specific brand described below — ground every implication in this brand's positioning, products and audience instead of giving generic advice.

${brandContextBlock}`;

    const userPrompt = `Analyze the following persona and generate exactly 5 strategic implications for this brand.

${personaProfile}

Generate exactly 5 strategic implications in these categories:
1. Messaging — How should this brand communicate with this persona?
2. Channel Strategy — Which channels reach this persona?
3. Content — What content from this brand resonates?
4. Product — What adjustments to this brand's products/services are needed?
5. Brand — How does this brand build trust with this persona?

Respond ONLY with valid JSON, no markdown, no backticks. JSON keys and the "priority" values ("high", "medium", "low") must stay in English exactly as shown:
{"implications":[{"category":"Messaging","title":"short title max 8 words","description":"2-3 sentences concrete recommendation","priority":"high"},...]}`;

    let implications: StrategicImplication[];
    try {
      // Central client (T7): retry, streaming, truncation detection,
      // temperature-guard, JSON parse path and learning-loop tracking.
      const result = await createClaudeStructuredCompletion<{ implications: StrategicImplication[] }>(
        systemPrompt,
        userPrompt,
        {
          maxTokens: IMPLICATIONS_MAX_TOKENS,
          timeoutMs: timeoutForTokens(IMPLICATIONS_MAX_TOKENS),
        },
        {
          workspaceId,
          parentEntityType: "Persona",
          parentEntityId: id,
          sourceIdentifier: "src/app/api/personas/[id]/strategic-implications/route.ts:POST",
          brandContext,
          promptVersion: getPromptVersion("strategic-implications"),
        },
      );
      implications = result.implications;
      if (!Array.isArray(implications) || implications.length === 0) {
        throw new Error("No implications array in AI response");
      }
    } catch (aiErr) {
      console.error("[Strategic implications generation error]", aiErr);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const strategicImplications = JSON.stringify(implications);
    await prisma.persona.update({
      where: { id },
      data: { strategicImplications },
    });

    // Create AI generation version snapshot
    try {
      const fullPersona = await prisma.persona.findUniqueOrThrow({ where: { id } });
      await createVersion({
        resourceType: 'PERSONA',
        resourceId: id,
        snapshot: buildPersonaSnapshot(fullPersona),
        changeType: 'AI_GENERATED',
        changeNote: 'Strategic implications generated by AI',
        userId: session?.user?.id ?? 'unknown',
        workspaceId,
      });
    } catch (versionError) {
      console.error('[AI generation snapshot failed]', versionError);
    }

    return NextResponse.json({ strategicImplications });
  } catch (error) {
    console.error("[POST /api/personas/:id/strategic-implications]", error);
    return NextResponse.json({ error: "Failed to generate strategic implications" }, { status: 500 });
  }
}
