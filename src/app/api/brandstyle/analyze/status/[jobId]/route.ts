import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const ANALYSIS_STEPS = [
  "Scanning website structure",
  "Extracting color palette",
  "Analyzing typography",
  "Detecting component styles",
  "Generating styleguide",
];

const STATUS_TO_STEP: Record<string, number> = {
  PENDING: 0,
  SCANNING_STRUCTURE: 1,
  EXTRACTING_COLORS: 2,
  ANALYZING_TYPOGRAPHY: 3,
  DETECTING_COMPONENTS: 4,
  GENERATING_STYLEGUIDE: 5,
  COMPLETE: 5,
  ERROR: -1,
};

// =============================================================
// GET /api/brandstyle/analyze/status/[jobId] — polling status
// =============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { jobId } = await params;

    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { analysisJobId: jobId, workspaceId },
      select: { id: true, analysisStatus: true, status: true },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const currentStepIndex = STATUS_TO_STEP[styleguide.analysisStatus] ?? 0;
    const isComplete = styleguide.analysisStatus === "COMPLETE";
    const isError = styleguide.analysisStatus === "ERROR";

    // Simulate progressive step advancement in demo mode
    // Each poll advances the step if not yet complete
    if (!isComplete && !isError) {
      const nextStatus = Object.entries(STATUS_TO_STEP).find(
        ([, step]) => step === currentStepIndex + 1
      );
      if (nextStatus) {
        await prisma.brandStyleguide.update({
          where: { id: styleguide.id },
          data: { analysisStatus: nextStatus[0] as never },
        });
      }
    }

    const steps = ANALYSIS_STEPS.map((name, i) => {
      const stepNum = i + 1;
      let status: "pending" | "active" | "complete" = "pending";
      if (isComplete || stepNum < currentStepIndex) {
        status = "complete";
      } else if (stepNum === currentStepIndex) {
        status = "active";
      }
      return { name, status };
    });

    return NextResponse.json({
      jobId,
      status: styleguide.analysisStatus,
      currentStep: currentStepIndex,
      totalSteps: 5,
      steps,
      ...(isError && { error: "Analysis failed" }),
    });
  } catch (error) {
    console.error("[GET /api/brandstyle/analyze/status]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
