"use client";

import { useEffect } from "react";
import { CheckCircle, Circle, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { useAnalysisStatus } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

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
      const timer = setTimeout(() => onComplete(), 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.status, onComplete]);

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
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
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
                      ? "text-teal-600 font-medium"
                      : "text-gray-400"
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {isError && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg space-y-3">
          <p className="text-sm text-red-600">
            {data?.error || "The analysis could not be completed. This can happen if the URL is unreachable or the PDF has insufficient text content."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={stopAnalysis}
          >
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
}
