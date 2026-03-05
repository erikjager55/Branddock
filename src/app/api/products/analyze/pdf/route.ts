import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { parsePdf } from "@/lib/brandstyle/pdf-parser";
import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
  buildPdfAnalysisPrompt,
  type ProductAnalysisResult,
} from "@/lib/ai/prompts/product-analysis";
import { ANALYZE_STEPS } from "@/features/products/constants/product-constants";

// POST /api/products/analyze/pdf — AI-powered product extraction from PDF (Gemini 3.1)
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 413 },
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 400 },
      );
    }

    // 1. Parse the PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let pdfData;
    try {
      pdfData = await parsePdf(buffer, file.name);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Failed to parse PDF";
      return NextResponse.json(
        { error: `Could not parse PDF: ${message}` },
        { status: 422 },
      );
    }

    if (!pdfData.text || pdfData.text.trim().length < 50) {
      return NextResponse.json(
        { error: "Not enough text content found in this PDF to analyze. The file may be image-based or too short." },
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
    const userPrompt = buildPdfAnalysisPrompt({
      fileName: file.name,
      text: pdfData.text,
      metadata: pdfData.metadata,
      brandContext: brandContextStr,
    });

    const result = await createGeminiStructuredCompletion<ProductAnalysisResult>(
      PRODUCT_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.3 },
    );

    // 4. Validate and normalize result
    const validCategories = ["software", "consulting", "mobile", "hardware", "service"];
    const category = validCategories.includes(result.category) ? result.category : "software";

    const filename = file.name.replace(/\.[^.]+$/, "");
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        name: result.name || `Product from ${filename}`,
        slug: "",
        description: result.description || null,
        category,
        pricingModel: result.pricingModel || null,
        pricingDetails: result.pricingDetails || null,
        source: "PDF_UPLOAD",
        sourceUrl: null,
        status: "ANALYZED",
        features: (result.features || []).slice(0, 15),
        benefits: (result.benefits || []).slice(0, 10),
        useCases: (result.useCases || []).slice(0, 8),
        categoryIcon: "FileText",
        linkedPersonaCount: 0,
        isLocked: false,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/products/analyze/pdf]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
