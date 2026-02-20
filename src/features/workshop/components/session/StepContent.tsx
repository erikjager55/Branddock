'use client';

import { Badge } from '@/components/shared';
import { Clock, Video } from 'lucide-react';
import type { WorkshopStep } from '../../types/workshop.types';

interface StepContentProps {
  step: WorkshopStep;
}

export function StepContent({ step }: StepContentProps) {
  return (
    <div data-testid="step-content" className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="success">Step {step.stepNumber}</Badge>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {step.duration}
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>

      {step.instructions && (
        <p className="text-gray-600 text-sm leading-relaxed">
          {step.instructions}
        </p>
      )}

      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
        <Video className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-500">
          Video guide placeholder
        </span>
      </div>
    </div>
  );
}
