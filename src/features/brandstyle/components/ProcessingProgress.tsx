"use client";

import { useEffect } from "react";
import { CheckCircle, Circle, Loader2, AlertCircle, RotateCcw, FileText, Globe } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { useAnalysisStatus } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

/** The refuse-mode message emitted by analysis-engine.ts when the scraper
 *  found nothing usable. Detected as a substring so we can render dedicated
 *  guidance instead of a flat error message. */
const REFUSE_MODE_PREFIX = "Could not extract enough brand colors";

interface ProcessingProgressProps {
  jobId: string;
  onComplete: () => void;
}

/**
 * Shows real-time analysis progress by polling the status endpoint.
 * Steps are updated by the analysis engine, not simulated.
 */
export function ProcessingProgress({ jobId, onComplete }: ProcessingProgressProps) {
  const { data, error: fetchError } = useAnalysisStatus(jobId);
  const { stopAnalysis } = useBrandstyleStore();

  useEffect(() => {
    if (data?.status === "COMPLETE") {
      const timer = setTimeout(() => {
        stopAnalysis();
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.status, onComplete, stopAnalysis]);

  const isError = data?.status === "ERROR" || !!fetchError;

  const steps = data?.steps ?? [
    { name: "Scanning website structure", status: "pending" as const },
    { name: "Extracting color palette", status: "pending" as const },
    { name: "Analyzing typography", status: "pending" as const },
    { name: "Detecting component styles", status: "pending" as const },
    { name: "Generating styleguide", status: "pending" as const },
  ];

  return (
    <Card data-testid="processing-progress">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {isError ? "Analysis failed" : "Processing your brand..."}
        </h3>
        <p className="text-sm text-gray-500">
          {isError
            ? "Something went wrong during analysis."
            : "Our AI is analyzing your brand. This usually takes 15–30 seconds."}
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {isError && step.status === "active" ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : step.status === "complete" ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : step.status === "active" ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
            <span
              className={`text-sm ${
                isError && step.status === "active"
                  ? "text-red-600 font-medium"
                  : step.status === "complete"
                    ? "text-emerald-600 font-medium"
                    : step.status === "active"
                      ? "text-primary font-medium"
                      : "text-gray-400"
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {isError && (
        <ErrorPanel error={data?.error ?? null} onRetry={stopAnalysis} />
      )}
    </Card>
  );
}

/**
 * Error display that recognises the refuse-mode message from the analysis
 * pipeline ("Could not extract enough brand colors…") and renders dedicated
 * guidance + action buttons. Falls back to a plain message for other errors.
 */
function ErrorPanel({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  const isRefuseMode = error?.startsWith(REFUSE_MODE_PREFIX) ?? false;

  if (isRefuseMode) {
    return (
      <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              We couldn&apos;t find brand tokens on this site
            </p>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              The site may render its design with CSS-in-JS, block automated scraping,
              or hide its design tokens behind authentication. We&apos;d rather stop here
              than guess a palette that doesn&apos;t match your brand.
            </p>
          </div>
        </div>

        <div className="ml-8 space-y-2">
          <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
            Try one of these instead:
          </p>
          <div className="space-y-1.5 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>Upload a brand-guide PDF — explicit color values usually work great.</span>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                Try a marketing landing page rather than the homepage — those often
                ship more brand-token CSS.
              </span>
            </div>
          </div>
        </div>

        <div className="ml-8">
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-red-50 rounded-lg space-y-3">
      <p className="text-sm text-red-600">
        {error ||
          "The analysis could not be completed. This can happen if the URL is unreachable or the PDF has insufficient text content."}
      </p>
      <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}
