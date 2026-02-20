'use client';

import { cn } from '@/components/ui/utils';
import { Check } from 'lucide-react';
import { TOTAL_WORKSHOP_STEPS } from '../../constants/workshop-steps';

interface StepNavigationProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function StepNavigation({
  currentStep,
  completedSteps,
  onStepClick,
}: StepNavigationProps) {
  return (
    <div data-testid="step-navigation" className="flex items-center gap-2">
      {Array.from({ length: TOTAL_WORKSHOP_STEPS }, (_, i) => i + 1).map(
        (step) => {
          const isActive = step === currentStep;
          const isCompleted = completedSteps.has(step);

          return (
            <button
              key={step}
              onClick={() => onStepClick(step)}
              className={cn(
                'w-9 h-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center',
                isActive &&
                  'bg-emerald-500 text-white shadow-sm',
                !isActive &&
                  isCompleted &&
                  'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                !isActive &&
                  !isCompleted &&
                  'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              {isCompleted && !isActive ? (
                <Check className="w-4 h-4" />
              ) : (
                step
              )}
            </button>
          );
        },
      )}
    </div>
  );
}
