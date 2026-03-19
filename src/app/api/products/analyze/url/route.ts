import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { scrapeProductUrl } from "@/lib/products/url-scraper";
import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { resolveFeatureModel, assertProvider } from "@/lib/ai/feature-models.server";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  getProductAnalysisSystemPrompt,
  parseOutputLanguage,
  buildUrlAnalysisPrompt,
  type ProductAnalysisResult,
} from "@/lib/ai/prompts/product-analysis";
import { ANALYZE_STEPS, VALID_CATEGORIES } from "@/features/products/constants/product-constants";

const analyzeUrlSchema = z.object({
  url: z.string().url(),
});

// POST /api/products/analyze/url — AI-powered product extraction from URL (Gemini 3.1)
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
    console.log("[analyze/url] Starting analysis for:", url);

    // 1. Scrape the URL
    let scraped;
    try {
      scraped = await scrapeProductUrl(url);
      console.log("[analyze/url] Scraped OK, body length:", scraped.bodyText.length, "images:", scraped.images.length);
    } catch (scrapeError) {
      console.error("[analyze/url] Scrape failed:", scrapeError);
      const message = scrapeError instanceof Error ? scrapeError.message : "Failed to fetch URL";
      return NextResponse.json(
        { error: `Could not access the URL: ${message}` },
        { status: 422 },
      );
    }

    if (!scraped.bodyText || scraped.bodyText.length < 50) {
      return NextResponse.json(
        { error: "Not enough content found on this page to analyze" },
        { status: 422 },
      );
    }

    // 2. Get brand context (optional enrichment)
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
    const systemPrompt = getProductAnalysisSystemPrompt(outputLanguage);

    const userPrompt = buildUrlAnalysisPrompt({
      url,
      title: scraped.title,
      description: scraped.description,
      bodyText: scraped.bodyText,
      brandContext: brandContextStr,
    });

    // Resolve configurable model for product analysis
    const resolved = await resolveFeatureModel(workspaceId, 'product-analysis');
    assertProvider(resolved, 'google', 'product-analysis');
    const productModel = resolved.model;

    console.log("[analyze/url] Calling Gemini, output language:", outputLanguage);
    const result = await createGeminiStructuredCompletion<ProductAnalysisResult>(
      systemPrompt,
      userPrompt,
      { model: productModel, temperature: 0.3 },
    );
    console.log("[analyze/url] Gemini returned, product name:", result?.name);

    // 4. Validate and normalize result
    const category = VALID_CATEGORIES.includes(result.category) ? result.category : "other";

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 5. Map scraped images for response
    const scrapedImages = (scraped.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt,
      context: img.context,
    }));

    return NextResponse.json({
      jobId,
      status: "complete",
      currentStep: ANALYZE_STEPS.length,
      totalSteps: ANALYZE_STEPS.length,
      steps: ANALYZE_STEPS.map((name) => ({
        name,
        status: "complete" as const,
      })),
      result: {
        id: "",
        name: result.name || `Product from ${new URL(url).hostname}`,
        slug: "",
        description: result.description || null,
        category,
        pricingModel: result.pricingModel || null,
        pricingDetails: result.pricingDetails || null,
        source: "WEBSITE_URL",
        sourceUrl: url,
        status: "ANALYZED",
        features: (result.features || []).slice(0, 15),
        benefits: (result.benefits || []).slice(0, 10),
        useCases: (result.useCases || []).slice(0, 8),
        categoryIcon: "Globe",
        heroImageUrl: null,
        linkedPersonaCount: 0,
        isLocked: false,
        updatedAt: new Date().toISOString(),
      },
      scrapedImages,
    });
  } catch (error) {
    console.error("[POST /api/products/analyze/url]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
