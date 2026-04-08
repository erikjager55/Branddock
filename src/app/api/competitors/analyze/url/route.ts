import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { scrapeProductUrl } from "@/lib/products/url-scraper";
import { scrapeUrlViaGemini } from "@/lib/products/gemini-url-fallback";
import { createStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  getCompetitorAnalysisSystemPrompt,
  parseOutputLanguage,
  buildCompetitorUrlAnalysisPrompt,
  type CompetitorAnalysisResult,
} from "@/lib/ai/prompts/competitor-analysis";
import { COMPETITOR_ANALYZE_STEPS } from "@/features/competitors/constants/competitor-constants";

const analyzeUrlSchema = z.object({
  url: z.string().url(),
});

// POST /api/competitors/analyze/url — AI-powered competitor extraction from URL (Gemini 3.1)
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = analyzeUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url } = parsed.data;

    // 1. Scrape the URL (direct fetch, fallback to Gemini if blocked)
    let scraped;
    try {
      scraped = await scrapeProductUrl(url);
    } catch (scrapeError) {
      console.warn("[competitors/analyze/url] Direct scrape failed, trying Gemini fallback:", scrapeError);
      try {
        scraped = await scrapeUrlViaGemini(url);
      } catch (fallbackError) {
        console.error("[competitors/analyze/url] Gemini fallback also failed:", fallbackError);
        const message = scrapeError instanceof Error ? scrapeError.message : "Failed to fetch URL";
        return NextResponse.json(
          { error: `Could not access the URL: ${message}` },
          { status: 422 },
        );
      }
    }

    if (!scraped.bodyText || scraped.bodyText.length < 50) {
      return NextResponse.json(
        { error: "Not enough content found on this page to analyze" },
        { status: 422 },
      );
    }

    // 2. Get brand context (optional enrichment for relative scoring)
    let brandContextStr: string | undefined;
    try {
      const brandContext = await getBrandContext(workspaceId);
      const formatted = formatBrandContext(brandContext);
      if (formatted.length > 20) {
        brandContextStr = formatted;
      }
    } catch {
      // Brand context is optional — continue without it
    }

    // 3. Build prompts and call Gemini 3.1
    const outputLanguage = parseOutputLanguage(request.headers.get("accept-language"));
    const systemPrompt = getCompetitorAnalysisSystemPrompt(outputLanguage);

    const userPrompt = buildCompetitorUrlAnalysisPrompt({
      url,
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

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      jobId,
      status: "complete",
      currentStep: COMPETITOR_ANALYZE_STEPS.length,
      totalSteps: COMPETITOR_ANALYZE_STEPS.length,
      steps: COMPETITOR_ANALYZE_STEPS.map((name) => ({
        name,
        status: "complete" as const,
      })),
      result: {
        id: "",
        name: result.name || `Competitor from ${new URL(url).hostname}`,
        slug: "",
        websiteUrl: url,
        description: result.description || null,
        tagline: result.tagline || null,
        logoUrl: null,
        tier: "DIRECT",
        status: "ANALYZED",
        competitiveScore: result.competitiveScore ?? null,
        differentiators: (result.differentiators || []).slice(0, 6),
        isLocked: false,
        linkedProductCount: 0,
        updatedAt: new Date().toISOString(),
        source: "WEBSITE_URL",
        sourceUrl: url,
        // Full AI result for creating the competitor
        foundingYear: result.foundingYear ?? null,
        headquarters: result.headquarters ?? null,
        employeeRange: result.employeeRange ?? null,
        valueProposition: result.valueProposition ?? null,
        targetAudience: result.targetAudience ?? null,
        mainOfferings: (result.mainOfferings || []).slice(0, 8),
        pricingModel: result.pricingModel ?? null,
        pricingDetails: result.pricingDetails ?? null,
        toneOfVoice: result.toneOfVoice ?? null,
        messagingThemes: (result.messagingThemes || []).slice(0, 5),
        visualStyleNotes: result.visualStyleNotes ?? null,
        strengths: (result.strengths || []).slice(0, 6),
        weaknesses: (result.weaknesses || []).slice(0, 6),
        socialLinks: result.socialLinks ?? null,
        hasBlog: result.hasBlog ?? null,
        hasCareersPage: result.hasCareersPage ?? null,
      },
    });
  } catch (error) {
    console.error("[POST /api/competitors/analyze/url]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
