"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/shared";
import { PageShell } from '@/components/ui/layout';
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useEnsureWizardWorkspace } from "../../hooks/useEnsureWizardWorkspace";
import { useDraftAutoSave } from "../../hooks/useDraftAutoSave";
import { useLaunchCampaign } from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { getStepsForMode } from "../../lib/wizard-steps";
import { WizardStepper } from "./WizardStepper";
import { SetupStep } from "./SetupStep";
import { KnowledgeStep } from "./KnowledgeStep";
import { StrategyStep } from "./StrategyStep";
import { ConceptStep } from "./ConceptStep";
import { ContentGenerateStep } from "./ContentGenerateStep";
import { DeliverablesStep } from "./DeliverablesStep";
import { ReviewStep } from "./ReviewStep";
import { CampaignSuccessModal } from "./CampaignSuccessModal";
import { DraftSaveIndicator } from "./DraftSaveIndicator";

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  setup: SetupStep,
  knowledge: KnowledgeStep,
  strategy: StrategyStep,
  concept: ConceptStep,
  'content-generate': ContentGenerateStep,
  deliverables: DeliverablesStep,
  review: ReviewStep,
};

// ─── Types ────────────────────────────────────────────────

interface CampaignWizardPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

export function CampaignWizardPage({ onNavigate }: CampaignWizardPageProps) {
  // Reset wizard state if persisted localStorage belongs to a different workspace
  // (defense-in-depth alongside clearAllStorage on workspace switch).
  useEnsureWizardWorkspace();

  // Auto-save wizard state to the DB via /api/campaigns/wizard/drafts.
  // Debounced 1500ms per change, POSTs on first save (step 2+), PATCHes thereafter.
  // DraftSaveIndicator (below) reflects status from the store.
  useDraftAutoSave();

  const wizardMode = useCampaignWizardStore((s) => s.wizardMode);
  const currentStep = useCampaignWizardStore((s) => s.currentStep);
  const nextStep = useCampaignWizardStore((s) => s.nextStep);
  const prevStep = useCampaignWizardStore((s) => s.prevStep);
  const canProceedResult = useCampaignWizardStore((s) => s.canProceed());
  const resetWizard = useCampaignWizardStore((s) => s.resetWizard);
  const strategyPhase = useCampaignWizardStore((s) => s.strategyPhase);
  const isContentMode = wizardMode === 'content';

  // Launch state
  const name = useCampaignWizardStore((s) => s.name);
  const description = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const blueprintResult = useCampaignWizardStore((s) => s.blueprintResult);
  const selectedDeliverables = useCampaignWizardStore(
    (s) => s.selectedDeliverables,
  );
  const saveAsTemplate = useCampaignWizardStore((s) => s.saveAsTemplate);
  const templateName = useCampaignWizardStore((s) => s.templateName);

  const launchCampaign = useLaunchCampaign();

  const [showSuccess, setShowSuccess] = useState(false);
  const [launchResult, setLaunchResult] = useState<{
    campaignId: string;
    deliverableCount: number;
  } | null>(null);

  // Do NOT reset on unmount — the user may navigate away and come back.
  // Reset happens only on explicit actions: successful launch or "Back to Campaigns" click.

  const steps = getStepsForMode(wizardMode);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;

  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);

  const handleLaunch = () => {
    if (!campaignGoalType || !blueprintResult) return;

    // If a DB-backed draft exists, promote it in place (update the existing
    // Campaign row) instead of creating a new one. resetWizard() below clears
    // draftCampaignId locally so the store and DB stay in sync.
    const draftCampaignId = useCampaignWizardStore.getState().draftCampaignId ?? undefined;

    launchCampaign.mutate(
      {
        name,
        description,
        goalType: campaignGoalType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        knowledgeIds: selectedKnowledgeIds,
        strategy: blueprintResult,
        deliverables: selectedDeliverables,
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName : undefined,
        draftCampaignId,
      },
      {
        onSuccess: (result) => {
          setLaunchResult({
            campaignId: result.campaignId,
            deliverableCount: result.deliverableCount,
          });
          setShowSuccess(true);
          resetWizard();
        },
      },
    );
  };

  const generatedCampaignId = useCampaignWizardStore((s) => s.generatedCampaignId);
  const generatedDeliverableId = useCampaignWizardStore((s) => s.generatedDeliverableId);

  const handleContentFinish = () => {
    if (!generatedCampaignId || !generatedDeliverableId) return;

    const campaignStore = useCampaignStore.getState();
    campaignStore.setSelectedCampaignId(generatedCampaignId);
    campaignStore.setSelectedDeliverableId(generatedDeliverableId);
    resetWizard();
    onNavigate('content-canvas');
  };

  const stepProceedOverride = useCampaignWizardStore((s) => s.stepProceedOverride);

  const handleContinue = () => {
    if (isLastStep) {
      isContentMode ? handleContentFinish() : handleLaunch();
    } else if (stepProceedOverride) {
      stepProceedOverride();
    } else {
      nextStep();
    }
  };

  // Render step content from registry
  const CurrentStepComponent = STEP_COMPONENTS[steps[currentStep - 1]?.key] ?? SetupStep;

  return (
    <PageShell>
    <div data-testid="campaign-wizard" className="space-y-6">
      {/* Breadcrumb */}
      <button
        data-testid="wizard-back-link"
        type="button"
        onClick={() => onNavigate("active-campaigns")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isContentMode ? 'Create Content' : 'Create Strategic Campaign'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isContentMode
            ? 'Generate a single content piece with AI-powered strategy'
            : 'Build a comprehensive campaign with AI-powered strategy'}
        </p>
      </div>

      {/* Stepper + save indicator */}
      <div data-testid="wizard-stepper" className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <WizardStepper
              currentStep={currentStep}
              stepLabels={steps.map(s => s.label)}
            />
          </div>
          <div className="flex-shrink-0">
            <DraftSaveIndicator />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div data-testid="wizard-step-content" className="bg-white border border-gray-200 rounded-lg p-6 min-h-[400px]">
        <CurrentStepComponent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button data-testid="wizard-back-button" variant="ghost" icon={ArrowLeft} onClick={prevStep}>
              Back
            </Button>
          )}
        </div>
        <Button
          data-testid="wizard-continue-button"
          variant="cta"
          icon={isLastStep ? Rocket : ArrowRight}
          iconPosition={isLastStep ? "left" : "right"}
          onClick={handleContinue}
          disabled={!canProceedResult || launchCampaign.isPending}
          isLoading={launchCampaign.isPending}
        >
          {isLastStep
            ? (isContentMode ? "Open in Canvas" : "Launch Campaign")
            : "Continue"}
        </Button>
      </div>

      {/* Success modal */}
      {launchResult && (
        <CampaignSuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          campaignId={launchResult.campaignId}
          deliverableCount={launchResult.deliverableCount}
          onNavigate={onNavigate}
        />
      )}
    </div>
    </PageShell>
  );
}

export default CampaignWizardPage;
