import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SCAN_STEPS } from '@/lib/alignment/scan-steps';

interface ScanStepChecklistProps {
  currentStep: number;
  completedSteps: string[];
  isDone: boolean;
  isFailed: boolean;
}

export function ScanStepChecklist({
  currentStep,
  completedSteps,
  isDone,
  isFailed,
}: ScanStepChecklistProps) {
  return (
    <ul data-testid="scan-step-checklist" className="space-y-2 list-none m-0 p-0">
      {SCAN_STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step) || (isDone && !isFailed);
        const isCurrent = i === currentStep && !isDone;

        return (
          <li
            key={i}
            className={`flex items-center gap-2.5 text-sm ${
              isCompleted
                ? 'text-gray-700'
                : isCurrent
                ? 'text-gray-700 font-medium'
                : 'text-gray-400'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : isCurrent ? (
              <Loader2 className="w-4 h-4 text-green-500 animate-spin flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
            )}
            {step}
          </li>
        );
      })}
    </ul>
  );
}
