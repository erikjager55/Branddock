'use client';

import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { useClawStore } from '@/stores/useClawStore';
import { WizardStepper } from './WizardStepper';
import { ContactStep } from './ContactStep';
import { ScheduleStep } from './ScheduleStep';
import { QuestionsStep } from './QuestionsStep';
import { AddQuestionModal } from './AddQuestionModal';
import { TemplatePanelSlideout } from './TemplatePanelSlideout';
import { ConductStep } from './ConductStep';
import { ReviewStep } from './ReviewStep';
import type { InterviewTemplate } from '../../types/interview.types';

const INTERVIEW_STEP_LABELS = ['Contact', 'Schedule', 'Questions', 'Conduct', 'Review'];

interface InterviewWizardProps {
  assetId: string;
  interviewId: string;
  onBack: () => void;
}

export function InterviewWizard({ assetId, interviewId, onBack }: InterviewWizardProps) {
  const { t } = useTranslation('interviews');
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

  // ─── Brand Assistant wizard snapshot ─────────────────────
  const setWizardSnapshot = useClawStore((s) => s.setWizardSnapshot);
  useEffect(() => {
    if (!interview) return;

    const stepLabel = INTERVIEW_STEP_LABELS[currentStep - 1] ?? `Step ${currentStep}`;
    const stringField = (value: string | number | null | undefined, max = 200) => {
      if (value === null || value === undefined || value === '') return { value: null as string | null, isEmpty: true };
      const str = String(value);
      return { value: str.length > max ? str.slice(0, max) + '…' : str, isEmpty: false };
    };
    const answered = interview.questions.filter((q) => q.isAnswered).length;

    setWizardSnapshot({
      name: 'Interview Wizard',
      currentStep: `${currentStep} of 5 — ${stepLabel}`,
      fields: [
        { label: 'Interviewee name', key: 'intervieweeName', ...stringField(interview.intervieweeName) },
        { label: 'Interviewee position', key: 'intervieweePosition', ...stringField(interview.intervieweePosition) },
        { label: 'Interviewee email', key: 'intervieweeEmail', ...stringField(interview.intervieweeEmail) },
        { label: 'Interviewee company', key: 'intervieweeCompany', ...stringField(interview.intervieweeCompany) },
        { label: 'Interviewee phone', key: 'intervieweePhone', ...stringField(interview.intervieweePhone) },
        { label: 'Scheduled date', key: 'scheduledDate', ...stringField(interview.scheduledDate) },
        { label: 'Scheduled time', key: 'scheduledTime', ...stringField(interview.scheduledTime) },
        { label: 'Duration (minutes)', key: 'durationMinutes', ...stringField(interview.durationMinutes) },
        { label: 'General notes', key: 'generalNotes', ...stringField(interview.generalNotes) },
        {
          label: 'Questions',
          key: '_questionCount',
          value: `${interview.questions.length} total · ${answered} answered`,
          isEmpty: interview.questions.length === 0,
        },
      ],
      notes: `To modify fields, call update_interview with interviewId="${interviewId}" and assetId="${assetId}". The selected brand assets for this interview: ${interview.selectedAssets.map((a) => a.brandAsset.name).join(', ') || 'none'}.`,
    });

    return () => setWizardSnapshot(null);
  }, [interview, interviewId, assetId, currentStep, setWizardSnapshot]);

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
          {t('wizard.backToInterviews')}
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {interview.title || t('card.defaultTitle', { number: interview.orderNumber })}
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
