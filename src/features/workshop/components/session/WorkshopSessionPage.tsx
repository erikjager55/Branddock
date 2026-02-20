'use client';

import { useEffect, useMemo } from 'react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { useWorkshopDetail } from '../../hooks/useWorkshopDetail';
import { useStartWorkshop } from '../../hooks/useStartWorkshop';
import { useUpdateStepResponse } from '../../hooks/useUpdateStepResponse';
import { useCompleteWorkshop } from '../../hooks/useCompleteWorkshop';
import { useWorkshopTimer } from '../../hooks/useWorkshopTimer';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import { WorkshopSessionHeader } from './WorkshopSessionHeader';
import { WorkshopToolbar } from './WorkshopToolbar';
import { StepNavigation } from './StepNavigation';
import { StepContent } from './StepContent';
import { ResponseCapture } from './ResponseCapture';
import { FacilitatorTips } from './FacilitatorTips';

interface WorkshopSessionPageProps {
  workshopId: string;
  onBack: () => void;
  onComplete: (workshopId: string) => void;
}

export function WorkshopSessionPage({
  workshopId,
  onBack,
  onComplete,
}: WorkshopSessionPageProps) {
  const { data, isLoading } = useWorkshopDetail(workshopId);
  const startMutation = useStartWorkshop(workshopId);
  const updateStepMutation = useUpdateStepResponse(workshopId);
  const completeMutation = useCompleteWorkshop(workshopId);
  const timer = useWorkshopTimer(workshopId);

  const {
    currentStepNumber,
    stepResponses,
    setCurrentStep,
    updateStepResponse: updateLocalStepResponse,
    setTimerSeconds,
    resetSession,
  } = useWorkshopStore();

  const workshop = data?.workshop;

  // Initialize session state from server data
  useEffect(() => {
    if (workshop) {
      setCurrentStep(workshop.currentStep || 1);
      setTimerSeconds(workshop.timerSeconds || 0);

      // Pre-fill responses from server
      for (const step of workshop.steps) {
        if (step.response) {
          updateLocalStepResponse(step.stepNumber, step.response);
        }
      }
    }
  }, [workshop?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start workshop if PURCHASED/SCHEDULED
  useEffect(() => {
    if (
      workshop &&
      (workshop.status === 'PURCHASED' || workshop.status === 'SCHEDULED') &&
      !startMutation.isPending
    ) {
      startMutation.mutate();
    }
  }, [workshop?.id, workshop?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = useMemo(() => {
    return workshop?.steps.find((s) => s.stepNumber === currentStepNumber);
  }, [workshop?.steps, currentStepNumber]);

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (workshop) {
      for (const step of workshop.steps) {
        if (step.isCompleted) set.add(step.stepNumber);
      }
    }
    // Also include locally saved steps
    for (const [stepNum] of Object.entries(stepResponses)) {
      if (stepResponses[Number(stepNum)]) {
        set.add(Number(stepNum));
      }
    }
    return set;
  }, [workshop?.steps, stepResponses]);

  const progress = useMemo(() => {
    if (!workshop) return 0;
    return (completedSteps.size / workshop.steps.length) * 100;
  }, [workshop, completedSteps]);

  const handleSaveResponse = (response: string) => {
    updateLocalStepResponse(currentStepNumber, response);
    updateStepMutation.mutate({
      stepNumber: currentStepNumber,
      data: { response, isCompleted: true },
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        timer.toggle(); // Stop timer
        resetSession();
        onComplete(workshopId);
      },
    });
  };

  const handleBookmarkToggle = () => {
    // Bookmark logic handled via API call
    const newBookmark =
      workshop?.bookmarkStep === currentStepNumber ? null : currentStepNumber;
    fetch(`/api/workshops/${workshopId}/bookmark`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmarkStep: newBookmark }),
    });
  };

  if (isLoading) {
    return (
      <PageShell>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      </PageShell>
    );
  }

  if (!workshop || !currentStep) {
    return (
      <PageShell>
      <div className="text-center py-12 text-gray-500">
        Workshop not found.
      </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div data-testid="workshop-session-page">
      <WorkshopSessionHeader
        title={workshop.title}
        assetName={workshop.brandAssetId}
        onBack={onBack}
      />

      <WorkshopToolbar
        formattedTime={timer.formattedTime}
        timerRunning={timer.timerRunning}
        bookmarkStep={workshop.bookmarkStep}
        currentStep={currentStepNumber}
        hasFacilitator={workshop.hasFacilitator}
        facilitatorName={workshop.facilitatorName}
        onTimerToggle={timer.toggle}
        onBookmarkToggle={handleBookmarkToggle}
        onComplete={handleComplete}
        isCompleting={completeMutation.isPending}
      />

      <StepNavigation
        currentStep={currentStepNumber}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Step content */}
        <div>
          <StepContent step={currentStep} />
          <FacilitatorTips currentStep={currentStepNumber} />
        </div>

        {/* Right: Response capture */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <ResponseCapture
            prompt={currentStep.prompt}
            currentStep={currentStepNumber}
            initialResponse={
              stepResponses[currentStepNumber] || currentStep.response || ''
            }
            progress={progress}
            isSaving={updateStepMutation.isPending}
            onSave={handleSaveResponse}
            onPrevious={() =>
              setCurrentStep(Math.max(1, currentStepNumber - 1))
            }
            onNext={() => setCurrentStep(currentStepNumber + 1)}
          />
        </div>
      </div>
    </div>
    </PageShell>
  );
}
