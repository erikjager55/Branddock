import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import type { AiReviewResponse } from "@/features/business-strategy/types/business-strategy.types";

type RouteParams = { params: Promise<{ id: string }> };

const aiReviewSchema = z.object({
  overallScore: z.number().min(0).max(10),
  summary: z.string(),
  findings: z.array(z.object({
    area: z.string(),
    score: z.number().min(0).max(10),
    assessment: z.string(),
    recommendation: z.string(),
  })),
  topPriorities: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are a senior brand strategist reviewing a business strategy.
Analyze the strategy across these dimensions: Strategic Clarity, Goal Alignment, SWOT Completeness, Milestone Planning, and Focus Area Coverage.

For each dimension, provide:
- area: the dimension name
- score: a score from 1-10
- assessment: a brief (1-2 sentence) assessment
- recommendation: a specific, actionable recommendation

Also provide:
- overallScore: weighted average of dimension scores (1-10)
- summary: a 2-3 sentence executive summary
- topPriorities: top 3 action items the team should focus on

Be constructive but honest. If data is missing, note it and score accordingly.`;

// =============================================================
// POST /api/strategies/[id]/ai-review — generate AI review
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
        objectives: {
          include: { keyResults: true, focusArea: true },
          orderBy: { sortOrder: "asc" },
        },
        focusAreas: { include: { _count: { select: { objectives: true } } } },
        milestones: { orderBy: { date: "asc" } },
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    // Build context for AI
    const objectives = strategy.objectives.map((o) => ({
      title: o.title,
      status: o.status,
      priority: o.priority,
      progress: `${o.currentValue}/${o.targetValue}`,
      keyResults: o.keyResults.map((kr) => `${kr.description} (${kr.status})`),
      focusArea: o.focusArea?.name ?? null,
    }));

    const assumptions = Array.isArray(strategy.keyAssumptions)
      ? (strategy.keyAssumptions as string[]).join(", ")
      : "None defined";

    const userPrompt = `Review this business strategy:

Name: ${strategy.name}
Type: ${strategy.type}
Status: ${strategy.status}
Progress: ${strategy.progressPercentage}%

Description: ${strategy.description}
Vision: ${strategy.vision ?? "Not defined"}
Rationale: ${strategy.rationale ?? "Not defined"}
Key Assumptions: ${assumptions}

SWOT Analysis:
- Strengths (${strategy.strengths.length}): ${strategy.strengths.join("; ") || "None"}
- Weaknesses (${strategy.weaknesses.length}): ${strategy.weaknesses.join("; ") || "None"}
- Opportunities (${strategy.opportunities.length}): ${strategy.opportunities.join("; ") || "None"}
- Threats (${strategy.threats.length}): ${strategy.threats.join("; ") || "None"}

Objectives (${objectives.length}):
${objectives.map((o) => `- ${o.title} [${o.status}, ${o.priority}] Progress: ${o.progress}. KRs: ${o.keyResults.join("; ") || "None"}`).join("\n")}

Focus Areas (${strategy.focusAreas.length}):
${strategy.focusAreas.map((fa) => `- ${fa.name} (${fa._count.objectives} objectives)`).join("\n") || "None"}

Milestones (${strategy.milestones.length}):
${strategy.milestones.map((m) => `- ${m.title} [${m.status}] ${m.date.toISOString().split("T")[0]}`).join("\n") || "None"}

Start Date: ${strategy.startDate?.toISOString().split("T")[0] ?? "Not set"}
End Date: ${strategy.endDate?.toISOString().split("T")[0] ?? "Not set"}`;

    const rawReview = await createClaudeStructuredCompletion<AiReviewResponse>(
      SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.3, maxTokens: 4000 },
    );

    const parsed = aiReviewSchema.safeParse(rawReview);
    if (!parsed.success) {
      console.error("[AI Review] Invalid AI response shape:", parsed.error.flatten());
      return NextResponse.json({ error: "AI returned invalid review format" }, { status: 502 });
    }

    return NextResponse.json({ review: parsed.data });
  } catch (error) {
    console.error("[POST /api/strategies/[id]/ai-review]", error);
    return NextResponse.json({ error: "Failed to generate AI review" }, { status: 500 });
  }
}
