"use client";

import { useEffect } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { Card } from "@/components/shared";
import { useAnalysisStatus } from "../hooks/useBrandstyleHooks";

interface ProcessingProgressProps {
  jobId: string;
  onComplete: () => void;
}

export function ProcessingProgress({ jobId, onComplete }: ProcessingProgressProps) {
  const { data } = useAnalysisStatus(jobId);

  useEffect(() => {
    if (data?.status === "COMPLETE") {
      const timer = setTimeout(() => onComplete(), 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.status, onComplete]);

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
          Processing your brand...
        </h3>
        <p className="text-sm text-gray-500">
          This usually takes about 10–15 seconds
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.status === "complete" ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : step.status === "active" ? (
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
            <span
              className={`text-sm ${
                step.status === "complete"
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

      {data?.status === "ERROR" && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">
            Analysis failed. Please try again with a different URL.
          </p>
        </div>
      )}
    </Card>
  );
}
