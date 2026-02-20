'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TOTAL_WORKSHOP_STEPS } from '../../constants/workshop-steps';
import { WorkshopProgressBar } from './WorkshopProgressBar';

interface ResponseCaptureProps {
  prompt: string | null;
  currentStep: number;
  initialResponse: string;
  progress: number;
  isSaving: boolean;
  onSave: (response: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function ResponseCapture({
  prompt,
  currentStep,
  initialResponse,
  progress,
  isSaving,
  onSave,
  onPrevious,
  onNext,
}: ResponseCaptureProps) {
  const [response, setResponse] = useState(initialResponse);

  useEffect(() => {
    setResponse(initialResponse);
  }, [initialResponse]);

  const handleSaveAndNext = () => {
    onSave(response);
    if (currentStep < TOTAL_WORKSHOP_STEPS) {
      onNext();
    }
  };

  return (
    <div data-testid="response-capture" className="flex flex-col h-full">
      {prompt && (
        <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-sm font-medium text-emerald-800">{prompt}</p>
        </div>
      )}

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Capture the team's response here..."
        className="flex-1 w-full min-h-[120px] p-4 border border-gray-200 rounded-lg text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />

      <WorkshopProgressBar progress={progress} className="mt-4" />

      <div className="flex items-center justify-between mt-4">
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          onClick={onPrevious}
          disabled={currentStep <= 1}
        >
          Previous
        </Button>

        <Button
          variant="cta"
          size="sm"
          icon={ChevronRight}
          iconPosition="right"
          onClick={handleSaveAndNext}
          isLoading={isSaving}
          disabled={!response.trim()}
        >
          {currentStep < TOTAL_WORKSHOP_STEPS ? 'Save & Next' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
