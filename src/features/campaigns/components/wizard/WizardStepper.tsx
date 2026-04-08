"use client";

import React from "react";
import { Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface WizardStepperProps {
  currentStep: number;
  stepLabels?: string[];
}

// ─── Step Labels ──────────────────────────────────────────

const DEFAULT_STEP_LABELS = [
  "Setup",
  "Knowledge",
  "Strategy",
  "Concept",
  "Deliverables",
  "Review",
];

// ─── Component ────────────────────────────────────────────

export function WizardStepper({
  currentStep,
  stepLabels = DEFAULT_STEP_LABELS,
}: WizardStepperProps) {
  const steps = stepLabels;

  return (
    <div className="flex items-center justify-center w-full">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <React.Fragment key={stepNumber}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
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
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
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

export default WizardStepper;
