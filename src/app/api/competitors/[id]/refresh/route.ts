import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { scrapeProductUrl } from "@/lib/products/url-scraper";
import { scrapeUrlViaGemini } from "@/lib/products/gemini-url-fallback";
import { createStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  getCompetitorAnalysisSystemPrompt,
  parseOutputLanguage,
  buildCompetitorUrlAnalysisPrompt,
  type CompetitorAnalysisResult,
} from "@/lib/ai/prompts/competitor-analysis";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import type { Prisma } from "@prisma/client";

// POST /api/competitors/[id]/refresh — Re-scrape and re-analyze
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.competitor.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }
    if (existing.isLocked) {
      return NextResponse.json({ error: "Competitor is locked" }, { status: 423 });
    }
    if (!existing.websiteUrl) {
      return NextResponse.json({ error: "No website URL to refresh from" }, { status: 400 });
    }

    // 1. Scrape (direct fetch, fallback to Gemini if blocked)
    let scraped;
    try {
      scraped = await scrapeProductUrl(existing.websiteUrl);
    } catch {
      scraped = await scrapeUrlViaGemini(existing.websiteUrl);
    }
    if (!scraped.bodyText || scraped.bodyText.length < 50) {
      return NextResponse.json(
        { error: "Not enough content found on the website to analyze" },
        { status: 422 },
      );
    }

    // 2. Brand context (optional)
    let brandContextStr: string | undefined;
    try {
      const brandContext = await getBrandContext(workspaceId);
      const formatted = formatBrandContext(brandContext);
      if (formatted.length > 20) {
        brandContextStr = formatted;
      }
    } catch {
      // Optional — continue without
    }

    // 3. AI analysis
    const outputLanguage = parseOutputLanguage(request.headers.get("accept-language"));
    const systemPrompt = getCompetitorAnalysisSystemPrompt(outputLanguage);
    const userPrompt = buildCompetitorUrlAnalysisPrompt({
      url: existing.websiteUrl,
      title: scraped.title,
      description: scraped.description,
      bodyText: scraped.bodyText,
      brandContext: brandContextStr,
    });

    // Resolve configurable model for competitor analysis
    const resolved = await resolveFeatureModel(workspaceId, 'competitor-analysis');

    const result = await createStructuredCompletion<CompetitorAnalysisResult>(
      resolved.provider,
      resolved.model,
      systemPrompt,
      userPrompt,
      { temperature: 0.3 },
    );

    // 4. Update competitor with fresh data
    const updated = await prisma.competitor.update({
      where: { id },
      data: {
        name: result.name || existing.name,
        tagline: result.tagline ?? existing.tagline,
        description: result.description || existing.description,
        foundingYear: result.foundingYear ?? existing.foundingYear,
        headquarters: result.headquarters ?? existing.headquarters,
        employeeRange: result.employeeRange ?? existing.employeeRange,
        valueProposition: result.valueProposition ?? existing.valueProposition,
        targetAudience: result.targetAudience ?? existing.targetAudience,
        differentiators: result.differentiators?.length ? result.differentiators : existing.differentiators,
        mainOfferings: result.mainOfferings?.length ? result.mainOfferings : existing.mainOfferings,
        pricingModel: result.pricingModel ?? existing.pricingModel,
        pricingDetails: result.pricingDetails ?? existing.pricingDetails,
        toneOfVoice: result.toneOfVoice ?? existing.toneOfVoice,
        messagingThemes: result.messagingThemes?.length ? result.messagingThemes : existing.messagingThemes,
        visualStyleNotes: result.visualStyleNotes ?? existing.visualStyleNotes,
        strengths: result.strengths?.length ? result.strengths : existing.strengths,
        weaknesses: result.weaknesses?.length ? result.weaknesses : existing.weaknesses,
        socialLinks: (result.socialLinks ?? existing.socialLinks ?? undefined) as Prisma.InputJsonValue | undefined,
        hasBlog: result.hasBlog ?? existing.hasBlog,
        hasCareersPage: result.hasCareersPage ?? existing.hasCareersPage,
        competitiveScore: result.competitiveScore ?? existing.competitiveScore,
        status: "ANALYZED",
        lastScrapedAt: new Date(),
        analysisData: result as unknown as Prisma.InputJsonValue,
      },
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/competitors/:id/refresh]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
