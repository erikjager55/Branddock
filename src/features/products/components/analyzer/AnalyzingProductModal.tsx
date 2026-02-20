"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/shared";
import { ANALYZE_STEPS } from "../../constants/product-constants";

interface AnalyzingProductModalProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function AnalyzingProductModal({
  onComplete,
  onCancel,
}: AnalyzingProductModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const completedRef = useRef(false);

  // Client-side simulation: increment step every 500ms from 0 to ANALYZE_STEPS.length
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= ANALYZE_STEPS.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // When all steps complete, trigger product creation + navigation
  useEffect(() => {
    if (currentStep >= ANALYZE_STEPS.length && !completedRef.current) {
      completedRef.current = true;
      const timeout = setTimeout(() => {
        onComplete();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[440px] rounded-xl bg-white p-8 text-center">
        {/* Spinner */}
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-green-500" />

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Analyzing your product...
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This usually takes about 30 seconds
        </p>

        {/* Steps list */}
        <div className="space-y-3 text-left mb-6">
          {ANALYZE_STEPS.map((stepLabel, idx) => {
            let StepIcon;
            let iconClass;

            if (idx < currentStep) {
              // Complete
              StepIcon = CheckCircle;
              iconClass = "h-5 w-5 text-green-500";
            } else if (idx === currentStep) {
              // In progress
              StepIcon = Loader2;
              iconClass = "h-5 w-5 text-green-500 animate-spin";
            } else {
              // Pending
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
