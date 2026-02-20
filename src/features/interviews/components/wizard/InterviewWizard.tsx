'use client';

import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SkeletonCard, SkeletonText } from '@/components/shared';
import {
  useInterviewDetail,
  useUpdateInterview,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCompleteInterview,
  useApproveInterview,
} from '../../hooks/useInterviews';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { WizardStepper } from './WizardStepper';
import { ContactStep } from './ContactStep';
import { ScheduleStep } from './ScheduleStep';
import { QuestionsStep } from './QuestionsStep';
import { AddQuestionModal } from './AddQuestionModal';
import { TemplatePanelSlideout } from './TemplatePanelSlideout';
import { ConductStep } from './ConductStep';
import { ReviewStep } from './ReviewStep';
import type { InterviewTemplate } from '../../types/interview.types';

interface InterviewWizardProps {
  assetId: string;
  interviewId: string;
  onBack: () => void;
}

export function InterviewWizard({ assetId, interviewId, onBack }: InterviewWizardProps) {
  const { data, isLoading } = useInterviewDetail(assetId, interviewId);
  const updateInterview = useUpdateInterview(assetId, interviewId);
  const addQuestion = useAddQuestion(assetId, interviewId);
  const updateQuestion = useUpdateQuestion(assetId, interviewId);
  const deleteQuestion = useDeleteQuestion(assetId, interviewId);
  const completeInterview = useCompleteInterview(assetId, interviewId);
  const approveInterview = useApproveInterview(assetId, interviewId);

  const currentStep = useInterviewStore((s) => s.currentWizardStep);
  const setWizardStep = useInterviewStore((s) => s.setWizardStep);
  const questionModalOpen = useInterviewStore((s) => s.questionModalOpen);
  const openQuestionModal = useInterviewStore((s) => s.openQuestionModal);
  const closeQuestionModal = useInterviewStore((s) => s.closeQuestionModal);
  const templatePanelOpen = useInterviewStore((s) => s.templatePanelOpen);
  const toggleTemplatePanel = useInterviewStore((s) => s.toggleTemplatePanel);

  const interview = data?.interview;

  // Sync wizard step with server state on load
  useEffect(() => {
    if (interview?.currentStep) {
      setWizardStep(interview.currentStep);
    }
  }, [interview?.currentStep, setWizardStep]);

  const handleSave = (stepData: Record<string, unknown>) => {
    updateInterview.mutate(stepData);
  };

  const handleStepClick = (step: number) => {
    setWizardStep(step);
  };

  const handleAddQuestion = (questionData: {
    questionType: string;
    questionText: string;
    answerOptions: string[];
  }) => {
    addQuestion.mutate(questionData, {
      onSuccess: () => closeQuestionModal(),
    });
  };

  const handleAddFromTemplate = (template: InterviewTemplate) => {
    addQuestion.mutate({
      questionType: template.questionType,
      questionText: template.questionText,
      answerOptions: template.options,
    });
  };

  const handleUpdateQuestion = (questionId: string, data: Record<string, unknown>) => {
    updateQuestion.mutate({ questionId, data });
  };

  const handleDeleteQuestion = (questionId: string) => {
    deleteQuestion.mutate(questionId);
  };

  const handleComplete = () => {
    completeInterview.mutate(undefined, {
      onSuccess: () => setWizardStep(5),
    });
  };

  const handleApprove = () => {
    approveInterview.mutate(undefined, {
      onSuccess: () => onBack(),
    });
  };

  if (isLoading || !interview) {
    return (
      <div className="space-y-4">
        <SkeletonText />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Determine completed steps based on interview data
  const completedSteps: number[] = [];
  if (interview.intervieweeName) completedSteps.push(1);
  if (interview.scheduledDate) completedSteps.push(2);
  if (interview.questions.length > 0) completedSteps.push(3);
  if (interview.status === 'COMPLETED' || interview.status === 'APPROVED' || interview.status === 'IN_REVIEW') {
    completedSteps.push(4);
  }
  if (interview.status === 'APPROVED') completedSteps.push(5);

  return (
    <div>
      {/* Back button + title */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Interviews
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {interview.title || `Interview #${interview.orderNumber}`}
        </h1>
      </div>

      {/* Stepper */}
      <WizardStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step content */}
      <div className="mt-6">
        {currentStep === 1 && (
          <ContactStep
            interview={interview}
            onSave={handleSave}
            isSaving={updateInterview.isPending}
          />
        )}
        {currentStep === 2 && (
          <ScheduleStep
            interview={interview}
            onSave={handleSave}
            isSaving={updateInterview.isPending}
          />
        )}
        {currentStep === 3 && (
          <QuestionsStep
            interview={interview}
            onAddQuestion={openQuestionModal}
            onOpenTemplates={toggleTemplatePanel}
            onDeleteQuestion={handleDeleteQuestion}
          />
        )}
        {currentStep === 4 && (
          <ConductStep
            interview={interview}
            onUpdateQuestion={handleUpdateQuestion}
            onSaveNotes={handleSave}
            onComplete={handleComplete}
            isUpdating={updateQuestion.isPending || updateInterview.isPending}
            isCompleting={completeInterview.isPending}
          />
        )}
        {currentStep === 5 && (
          <ReviewStep
            interview={interview}
            onApprove={handleApprove}
            onEditResponses={() => setWizardStep(4)}
            isApproving={approveInterview.isPending}
          />
        )}
      </div>

      {/* Question modal */}
      <AddQuestionModal
        isOpen={questionModalOpen}
        onClose={closeQuestionModal}
        onSubmit={handleAddQuestion}
        isSubmitting={addQuestion.isPending}
      />

      {/* Template panel */}
      <TemplatePanelSlideout
        isOpen={templatePanelOpen}
        onClose={toggleTemplatePanel}
        assetId={assetId}
        onAddTemplate={handleAddFromTemplate}
      />
    </div>
  );
}
