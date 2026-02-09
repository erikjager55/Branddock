"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  isCompleted &&
                    "bg-emerald-500 border-emerald-500 text-white",
                  isActive &&
                    "bg-primary border-primary text-white",
                  isUpcoming &&
                    "bg-transparent border-border-dark text-text-dark/40"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap hidden sm:block",
                  isCompleted && "text-emerald-400",
                  isActive && "text-primary",
                  isUpcoming && "text-text-dark/40"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-3 rounded-full transition-colors",
                  index < currentStep ? "bg-emerald-500" : "bg-border-dark"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
