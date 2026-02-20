'use client';

import { CheckCircle, User, Calendar, HelpCircle, Mic, FileCheck } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Contact', icon: User },
  { number: 2, label: 'Schedule', icon: Calendar },
  { number: 3, label: 'Questions', icon: HelpCircle },
  { number: 4, label: 'Conduct', icon: Mic },
  { number: 5, label: 'Review', icon: FileCheck },
];

interface WizardStepperProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function WizardStepper({ currentStep, completedSteps, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(step.number);
        const isActive = currentStep === step.number;
        const Icon = step.icon;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(step.number)}
              className="flex items-center gap-2 group"
            >
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              ) : (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.number}
                </div>
              )}
              <span
                className={`text-sm whitespace-nowrap ${
                  isActive
                    ? 'font-semibold text-gray-900'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 ${
                  isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
