"use client";

import React from "react";
import { Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface WizardStepperProps {
  currentStep: number;
  totalSteps?: number;
}

// ─── Step Labels ──────────────────────────────────────────

const STEP_LABELS = [
  "Setup",
  "Knowledge",
  "Strategy",
  "Deliverables",
  "Review",
];

// ─── Component ────────────────────────────────────────────

export function WizardStepper({
  currentStep,
  totalSteps = 5,
}: WizardStepperProps) {
  const steps = STEP_LABELS.slice(0, totalSteps);

  return (
    <div className="flex items-center justify-center w-full">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <React.Fragment key={stepNumber}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                      : "bg-white text-gray-400 border-2 border-gray-200"
                }`}
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
                    ? "text-emerald-600"
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
                    ? "bg-emerald-500"
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
