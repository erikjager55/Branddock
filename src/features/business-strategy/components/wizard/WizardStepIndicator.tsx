'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Type & Name' },
  { number: 2, label: 'Timeline' },
  { number: 3, label: 'Objectives' },
];

interface WizardStepIndicatorProps {
  currentStep: number;
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;

        return (
          <div key={step.number} className="flex items-center gap-2">
            {/* Step dot */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.number}
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent ? 'text-emerald-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  currentStep > step.number ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
