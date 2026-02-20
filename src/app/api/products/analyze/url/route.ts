import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { ANALYZE_STEPS } from "@/features/products/constants/product-constants";

const analyzeUrlSchema = z.object({
  url: z.string().url(),
});

// POST /api/products/analyze/url — stub: mock product from URL
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

    // Extract domain name for mock data
    let domain = "unknown";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace("www.", "");
    } catch {
      // keep default
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Return completed mock result immediately
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
        name: `Product from ${domain}`,
        slug: domain.replace(/\./g, "-"),
        description: `Automatically analyzed product from ${url}`,
        category: "software",
        pricingModel: "subscription",
        source: "WEBSITE_URL",
        status: "ANALYZED",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        categoryIcon: "Globe",
        linkedPersonaCount: 0,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/products/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
