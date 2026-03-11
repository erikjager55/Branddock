"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/shared";
import { COMPETITOR_ANALYZE_STEPS } from "../../constants/competitor-constants";

interface AnalyzingCompetitorModalProps {
  onComplete: () => void;
  onCancel: () => void;
  /** When true, the API call has finished. Animation will fast-forward remaining steps. */
  isApiComplete?: boolean;
}

/** Multi-step processing animation modal for competitor analysis */
export function AnalyzingCompetitorModal({
  onComplete,
  onCancel,
  isApiComplete = false,
}: AnalyzingCompetitorModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Animate steps: 500ms per step normally, 100ms when API is already done
  useEffect(() => {
    if (currentStep >= COMPETITOR_ANALYZE_STEPS.length) return;

    const delay = isApiComplete ? 100 : 500;
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [isApiComplete, currentStep]);

  // When all steps complete and API is done, trigger competitor creation + navigation
  useEffect(() => {
    if (currentStep >= COMPETITOR_ANALYZE_STEPS.length && isApiComplete && !completedRef.current) {
      completedRef.current = true;
      const timeout = setTimeout(() => {
        onCompleteRef.current();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, isApiComplete]);

  const isWaitingForApi = currentStep >= COMPETITOR_ANALYZE_STEPS.length && !isApiComplete;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[440px] rounded-xl bg-white p-8 text-center">
        {/* Spinner */}
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-red-500" />

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {isWaitingForApi ? "Finalizing analysis..." : "Analyzing competitor..."}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isWaitingForApi
            ? "Almost done, processing AI response"
            : "This usually takes about 15 seconds"}
        </p>

        {/* Steps list */}
        <div className="space-y-3 text-left mb-6">
          {COMPETITOR_ANALYZE_STEPS.map((stepLabel, idx) => {
            let StepIcon;
            let iconClass;

            if (idx < currentStep) {
              StepIcon = CheckCircle;
              iconClass = "h-5 w-5 text-red-500";
            } else if (idx === currentStep) {
              StepIcon = Loader2;
              iconClass = "h-5 w-5 text-red-500 animate-spin";
            } else {
              StepIcon = Circle;
              iconClass = "h-5 w-5 text-gray-300";
            }

            return (
              <div key={idx} className="flex items-center gap-3">
                <StepIcon className={iconClass} />
                <span
                  className={`text-sm ${
                    idx <= currentStep ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {stepLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Cancel button */}
        <Button variant="ghost" onClick={onCancel} fullWidth>
          Cancel
        </Button>
      </div>
    </div>
  );
}
