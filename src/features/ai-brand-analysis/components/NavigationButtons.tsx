'use client';

import React from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/shared';
import { GenerateReportButton } from './GenerateReportButton';

type NavigationState = 'during_questions' | 'at_100_percent' | 'after_completion';

interface NavigationButtonsProps {
  state: NavigationState;
  onBack: () => void;
  onComplete: () => void;
  onGenerateReport: () => void;
  isCompleting?: boolean;
  isGenerating?: boolean;
}

export function NavigationButtons({
  state,
  onBack,
  onComplete,
  onGenerateReport,
  isCompleting = false,
  isGenerating = false,
}: NavigationButtonsProps) {
  return (
    <div className="px-4 pb-4 space-y-3">
      {state === 'at_100_percent' && (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onComplete}
            isLoading={isCompleting}
            icon={CheckCircle}
          >
            Complete & Generate Report
          </Button>
        </div>
      )}

      {state === 'after_completion' && (
        <GenerateReportButton
          onClick={onGenerateReport}
          isLoading={isGenerating}
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        onClick={onBack}
        className="w-full"
      >
        Back to Asset
      </Button>
    </div>
  );
}
