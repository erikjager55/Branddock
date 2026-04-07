import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

/** Sanitize error messages to avoid leaking internal details to the frontend. */
function sanitizeErrorMessage(raw: string | null): string {
  if (!raw) return "Analysis failed. Please try again.";

  // Scrape/parse errors — the suffix after the prefix may contain useful user context
  // (e.g., "Failed to fetch URL: Server returned 403") but could also leak internal details.
  // Safe approach: return the prefix only, with a generic suffix.
  const scrapePrefixes: Array<{ prefix: string; userMessage: string }> = [
    { prefix: "Failed to fetch URL", userMessage: "Failed to fetch URL. The website may be unavailable or blocking automated access." },
    { prefix: "Failed to parse PDF", userMessage: "Failed to parse the PDF. The file may be corrupted or password-protected." },
  ];

  for (const { prefix, userMessage } of scrapePrefixes) {
    if (raw.startsWith(prefix)) return userMessage;
  }

  // Messages that are fully user-safe as-is (no appended err.message)
  const safePrefixes = [
    "PDF contains too little text",
    "AI response missing colors",
  ];

  for (const prefix of safePrefixes) {
    if (raw.startsWith(prefix)) return raw;
  }

  // AI analysis errors — strip internal details (could contain API keys, org IDs, rate limit info)
  const aiPrefixes = [
    "Visual identity analysis failed",
    "Voice & imagery analysis failed",
    "AI analysis failed",
  ];

  for (const prefix of aiPrefixes) {
    if (raw.startsWith(prefix)) return "AI analysis encountered an error. Please try again.";
  }

  // Generic unexpected errors — don't leak internals
  return "Analysis failed. Please try again.";
}

const ANALYSIS_STEPS = [
  "Scanning website structure",
  "Extracting color palette",
  "Analyzing typography",
  "Detecting component styles",
  "Analyzing visual language",
  "Generating styleguide",
];

const STATUS_TO_STEP: Record<string, number> = {
  PENDING: 0,
  SCANNING_STRUCTURE: 1,
  EXTRACTING_COLORS: 2,
  ANALYZING_TYPOGRAPHY: 3,
  DETECTING_COMPONENTS: 4,
  ANALYZING_VISUAL_LANGUAGE: 5,
  GENERATING_STYLEGUIDE: 6,
  COMPLETE: 6,
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
      select: { id: true, analysisStatus: true, status: true, errorMessage: true },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const currentStepIndex = STATUS_TO_STEP[styleguide.analysisStatus] ?? 0;
    const isComplete = styleguide.analysisStatus === "COMPLETE";
    const isError = styleguide.analysisStatus === "ERROR";

    // Read-only: status is updated by the analysis engine, not by polling
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
      totalSteps: 6,
      steps,
      ...(isError && { error: sanitizeErrorMessage(styleguide.errorMessage) }),
    });
  } catch (error) {
    console.error("[GET /api/brandstyle/analyze/status]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
