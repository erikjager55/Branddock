"use client";

import React from "react";
import { Check } from "lucide-react";

interface ModelWizardStepperProps {
  labels: readonly string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  optionalSteps?: number[];
}

/** Horizontal numbered stepper with connecting lines — matches the campaign wizard stepper styling */
export function ModelWizardStepper({
  labels,
  currentStep,
  onStepClick,
  optionalSteps = [],
}: ModelWizardStepperProps) {
  return (
    <div className="flex items-center justify-center w-full">
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <React.Fragment key={stepNumber}>
            {/* Step circle + label */}
            <div
              className="flex flex-col items-center gap-1.5 cursor-pointer"
              onClick={() => onStepClick?.(stepNumber)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "bg-primary text-white"
                      : "bg-white text-gray-400 border-2 border-gray-200"
                }`}
                style={isCurrent ? { boxShadow: '0 0 0 4px hsl(var(--primary) / 0.15)' } : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
                {optionalSteps.includes(stepNumber) && (
                  <span className="text-[10px] text-gray-400">(optional)</span>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {index < labels.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-colors ${
                  stepNumber < currentStep
                    ? "bg-primary"
                    : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
