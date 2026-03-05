"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/shared";
import { ANALYZE_STEPS } from "../../constants/product-constants";

interface AnalyzingProductModalProps {
  onComplete: () => void;
  onCancel: () => void;
  /** When true, the API call has finished. Animation will fast-forward remaining steps. */
  isApiComplete?: boolean;
}

export function AnalyzingProductModal({
  onComplete,
  onCancel,
  isApiComplete = false,
}: AnalyzingProductModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const completedRef = useRef(false);

  // Animate steps: 500ms per step normally, 100ms when API is already done
  useEffect(() => {
    const interval = isApiComplete && currentStep < ANALYZE_STEPS.length ? 100 : 500;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= ANALYZE_STEPS.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isApiComplete, currentStep]);

  // When all steps complete and API is done, trigger product creation + navigation
  useEffect(() => {
    if (currentStep >= ANALYZE_STEPS.length && !completedRef.current) {
      if (isApiComplete) {
        // API already done — complete immediately
        completedRef.current = true;
        const timeout = setTimeout(() => {
          onComplete();
        }, 300);
        return () => clearTimeout(timeout);
      }
      // Animation done but API not yet — show "Finalizing..." state, wait for isApiComplete
    }
  }, [currentStep, isApiComplete, onComplete]);

  // If API completes after animation already finished
  useEffect(() => {
    if (isApiComplete && currentStep >= ANALYZE_STEPS.length && !completedRef.current) {
      completedRef.current = true;
      const timeout = setTimeout(() => {
        onComplete();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isApiComplete, currentStep, onComplete]);

  const isWaitingForApi = currentStep >= ANALYZE_STEPS.length && !isApiComplete;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[440px] rounded-xl bg-white p-8 text-center">
        {/* Spinner */}
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-green-500" />

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {isWaitingForApi ? "Finalizing analysis..." : "Analyzing your product..."}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isWaitingForApi
            ? "Almost done, processing AI response"
            : "This usually takes about 15 seconds"}
        </p>

        {/* Steps list */}
        <div className="space-y-3 text-left mb-6">
          {ANALYZE_STEPS.map((stepLabel, idx) => {
            let StepIcon;
            let iconClass;

            if (idx < currentStep) {
              StepIcon = CheckCircle;
              iconClass = "h-5 w-5 text-green-500";
            } else if (idx === currentStep) {
              StepIcon = Loader2;
              iconClass = "h-5 w-5 text-green-500 animate-spin";
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
