import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CATEGORIES = ["TECHNOLOGY", "ENVIRONMENTAL", "SOCIAL", "CONSUMER", "BUSINESS"] as const;
const SCOPES = ["MICRO", "MESO", "MACRO"] as const;
const IMPACTS = ["HIGH", "MEDIUM", "LOW"] as const;
const TIMEFRAMES = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"] as const;

const aiResearchSchema = z.object({
  prompt: z.string().min(1).max(500),
  focusAreas: z.array(z.string()).max(6).optional(),
  industries: z.array(z.string().max(100)).max(10).optional(),
  timeframeFocus: z.enum(["short-term", "all", "long-term"]).optional(),
  numberOfInsights: z.number().int().min(1).max(10).optional().default(5),
  useBrandContext: z.boolean().optional(),
});

// =============================================================
// POST /api/insights/ai-research
// Stub: generate mock insights based on prompt + focusAreas
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiResearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { prompt, focusAreas, industries, numberOfInsights } = parsed.data;
    const count = numberOfInsights ?? 5;

    // Generate mock insights based on prompt keywords
    const promptWords = prompt.split(/\s+/).filter((w) => w.length > 3);
    const titlePrefix = promptWords.slice(0, 3).join(" ") || "Research";

    const createdInsights = [];

    for (let i = 0; i < count; i++) {
      const category = CATEGORIES[i % CATEGORIES.length];
      const scope = SCOPES[i % SCOPES.length];
      const impact = IMPACTS[i % IMPACTS.length];
      const timeframe = TIMEFRAMES[i % TIMEFRAMES.length];
      const relevanceScore = Math.round(70 + Math.random() * 25);

      const title = `${titlePrefix} — Insight ${i + 1}: ${category.charAt(0) + category.slice(1).toLowerCase()} Trend`;
      let slug = slugify(title);

      // Ensure unique slug
      const existing = await prisma.marketInsight.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now()}-${i}`;
      }

      const tags = [
        ...(focusAreas?.slice(0, 2) ?? []),
        category.charAt(0) + category.slice(1).toLowerCase(),
        "AI Research",
      ];

      const insight = await prisma.marketInsight.create({
        data: {
          title,
          slug,
          description: `AI-generated insight based on research prompt: "${prompt}". This ${category.toLowerCase()} trend has ${impact.toLowerCase()} impact potential within a ${timeframe.replace("_", "-").toLowerCase()} timeframe.`,
          category,
          scope,
          impactLevel: impact,
          timeframe,
          relevanceScore,
          source: "AI_RESEARCH",
          industries: industries ?? [],
          tags,
          howToUse: [
            `Evaluate how this ${category.toLowerCase()} trend affects your brand positioning`,
            `Consider integrating findings into your next campaign strategy`,
            `Share with stakeholders for strategic alignment discussions`,
          ],
          aiResearchPrompt: prompt,
          useBrandContext: parsed.data.useBrandContext ?? false,
          workspaceId,
        },
        include: { sourceUrls: true },
      });

      createdInsights.push({
        id: insight.id,
        title: insight.title,
        slug: insight.slug,
        description: insight.description,
        category: insight.category,
        scope: insight.scope,
        impactLevel: insight.impactLevel,
        timeframe: insight.timeframe,
        relevanceScore: insight.relevanceScore,
        source: insight.source,
        industries: insight.industries,
        tags: insight.tags,
        howToUse: insight.howToUse,
        sourceUrls: [],
        useBrandContext: insight.useBrandContext,
        createdAt: insight.createdAt.toISOString(),
        updatedAt: insight.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({
      status: "complete",
      insights: createdInsights,
    });
  } catch (error) {
    console.error("[POST /api/insights/ai-research]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
