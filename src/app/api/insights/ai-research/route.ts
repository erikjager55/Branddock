import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import {
  buildMarketResearchSystemPrompt,
  buildMarketResearchUserPrompt,
} from "@/lib/ai/prompts/market-research";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const VALID_CATEGORIES = ["TECHNOLOGY", "ENVIRONMENTAL", "SOCIAL", "CONSUMER", "BUSINESS"] as const;
const VALID_SCOPES = ["MICRO", "MESO", "MACRO"] as const;
const VALID_IMPACTS = ["HIGH", "MEDIUM", "LOW"] as const;
const VALID_TIMEFRAMES = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"] as const;

const aiResearchSchema = z.object({
  prompt: z.string().min(1).max(500),
  focusAreas: z.array(z.string()).max(6).optional(),
  industries: z.array(z.string().max(100)).max(10).optional(),
  timeframeFocus: z.enum(["short-term", "all", "long-term"]).optional(),
  numberOfInsights: z.number().int().min(1).max(10).optional().default(5),
  useBrandContext: z.boolean().optional(),
});

/** Type for a single AI-generated insight from Gemini. */
interface GeneratedInsight {
  title: string;
  description: string;
  category: string;
  scope: string;
  impactLevel: string;
  timeframe: string;
  relevanceScore: number;
  industries: string[];
  tags: string[];
  howToUse: string[];
}

/** Validated insight with proper enum types for Prisma. */
interface SanitizedInsight {
  title: string;
  description: string;
  category: typeof VALID_CATEGORIES[number];
  scope: typeof VALID_SCOPES[number];
  impactLevel: typeof VALID_IMPACTS[number];
  timeframe: typeof VALID_TIMEFRAMES[number];
  relevanceScore: number;
  industries: string[];
  tags: string[];
  howToUse: string[];
}

/** Validate and clamp AI-generated enum values to known values. */
function sanitizeInsight(raw: GeneratedInsight): SanitizedInsight {
  // Deduplicate tags
  const uniqueTags = [...new Set(
    Array.isArray(raw.tags) ? raw.tags.slice(0, 5).map(String) : [],
  )];

  return {
    title: (raw.title ?? "Untitled Insight").slice(0, 200),
    description: (raw.description ?? "").slice(0, 2000),
    category: VALID_CATEGORIES.includes(raw.category as typeof VALID_CATEGORIES[number])
      ? (raw.category as typeof VALID_CATEGORIES[number])
      : "BUSINESS",
    scope: VALID_SCOPES.includes(raw.scope as typeof VALID_SCOPES[number])
      ? (raw.scope as typeof VALID_SCOPES[number])
      : "MESO",
    impactLevel: VALID_IMPACTS.includes(raw.impactLevel as typeof VALID_IMPACTS[number])
      ? (raw.impactLevel as typeof VALID_IMPACTS[number])
      : "MEDIUM",
    timeframe: VALID_TIMEFRAMES.includes(raw.timeframe as typeof VALID_TIMEFRAMES[number])
      ? (raw.timeframe as typeof VALID_TIMEFRAMES[number])
      : "MEDIUM_TERM",
    relevanceScore: Math.max(50, Math.min(100, Math.round(raw.relevanceScore ?? 75))),
    industries: Array.isArray(raw.industries) ? raw.industries.slice(0, 10).map(String) : [],
    tags: uniqueTags,
    howToUse: Array.isArray(raw.howToUse) ? raw.howToUse.slice(0, 5).map(String) : [],
  };
}

/** Generate a unique slug, checking both DB and already-used slugs in this batch. */
async function generateUniqueSlug(title: string, usedSlugs: Set<string>): Promise<string> {
  let slug = slugify(title);

  // Check both the batch set and the database
  let attempts = 0;
  while (usedSlugs.has(slug) || (await prisma.marketInsight.findUnique({ where: { slug } }))) {
    attempts++;
    slug = `${slugify(title)}-${Date.now()}-${attempts}`;
  }

  usedSlugs.add(slug);
  return slug;
}

// =============================================================
// POST /api/insights/ai-research
// Generate market insights via Gemini 3.1 Pro AI
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
        { status: 400 },
      );
    }

    const { prompt, focusAreas, industries, numberOfInsights, timeframeFocus, useBrandContext } =
      parsed.data;
    const count = numberOfInsights ?? 5;

    // Build AI prompts — optionally inject brand context
    const brandContext = useBrandContext ? await getBrandContext(workspaceId) : undefined;
    const systemPrompt = buildMarketResearchSystemPrompt(brandContext);
    const userPrompt = buildMarketResearchUserPrompt({
      prompt,
      focusAreas,
      industries,
      timeframeFocus,
      numberOfInsights: count,
    });

    // Call Gemini 3.1 Pro for structured insight generation
    const aiResponse = await createGeminiStructuredCompletion<{ insights: GeneratedInsight[] }>(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxOutputTokens: 6000 },
    );

    if (!aiResponse.insights || !Array.isArray(aiResponse.insights)) {
      throw new Error("AI response missing insights array");
    }

    // Persist all insights in a transaction (all-or-nothing)
    const usedSlugs = new Set<string>();
    const sanitizedInsights = aiResponse.insights.slice(0, count).map(sanitizeInsight);

    // Pre-generate unique slugs before the transaction
    const slugs: string[] = [];
    for (const insight of sanitizedInsights) {
      slugs.push(await generateUniqueSlug(insight.title, usedSlugs));
    }

    const createdInsights = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < sanitizedInsights.length; i++) {
        const insight = sanitizedInsights[i];
        const created = await tx.marketInsight.create({
          data: {
            title: insight.title,
            slug: slugs[i],
            description: insight.description,
            category: insight.category,
            scope: insight.scope,
            impactLevel: insight.impactLevel,
            timeframe: insight.timeframe,
            relevanceScore: insight.relevanceScore,
            source: "AI_RESEARCH",
            industries: insight.industries,
            tags: insight.tags,
            howToUse: insight.howToUse,
            aiResearchPrompt: prompt,
            useBrandContext: useBrandContext ?? false,
            workspaceId,
          },
          include: { sourceUrls: true },
        });
        results.push(created);
      }
      return results;
    });

    // Invalidate server-side cache
    invalidateCache(cacheKeys.prefixes.insights(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    const responseInsights = createdInsights.map((created) => ({
      id: created.id,
      title: created.title,
      slug: created.slug,
      description: created.description,
      category: created.category,
      scope: created.scope,
      impactLevel: created.impactLevel,
      timeframe: created.timeframe,
      relevanceScore: created.relevanceScore,
      source: created.source,
      industries: created.industries,
      tags: created.tags,
      howToUse: created.howToUse,
      sourceUrls: [],
      useBrandContext: created.useBrandContext,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      status: "complete",
      insights: responseInsights,
    });
  } catch (error) {
    console.error("[POST /api/insights/ai-research]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
