import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { ANALYZE_STEPS } from "@/features/products/constants/product-constants";

// POST /api/products/analyze/pdf — stub: mock product from PDF upload
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

    const filename = file.name.replace(/\.[^.]+$/, "");

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
        name: `Product from ${filename}`,
        slug: filename
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        description: `Automatically analyzed product from uploaded PDF: ${file.name}`,
        category: "software",
        pricingModel: null,
        source: "PDF_UPLOAD",
        status: "ANALYZED",
        features: ["Feature 1", "Feature 2"],
        categoryIcon: "FileText",
        linkedPersonaCount: 0,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/products/analyze/pdf]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
