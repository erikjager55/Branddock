"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Rocket, Map } from "lucide-react";
import { Button } from "@/components/shared";
import { PageShell } from '@/components/ui/layout';
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useLaunchCampaign } from "../../hooks";
import { WizardStepper } from "./WizardStepper";
import { SetupStep } from "./SetupStep";
import { KnowledgeStep } from "./KnowledgeStep";
import { StrategyStep } from "./StrategyStep";
import { ConceptStep } from "./ConceptStep";
import { DeliverablesStep } from "./DeliverablesStep";
import { ReviewStep } from "./ReviewStep";
import { CampaignSuccessModal } from "./CampaignSuccessModal";

// ─── Types ────────────────────────────────────────────────

interface CampaignWizardPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

const CONTENT_STEP_LABELS = ['Setup', 'Knowledge', 'Strategy', 'Concept'];

export function CampaignWizardPage({ onNavigate }: CampaignWizardPageProps) {
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

  const totalSteps = isContentMode ? 4 : 6;
  const isLastStep = currentStep === totalSteps;

  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);

  const handleLaunch = () => {
    if (!campaignGoalType || !blueprintResult) return;

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

  const handleContentLaunch = () => {
    if (!selectedContentType || !blueprintResult) return;

    // In content mode: launch with the single selected content type as the only deliverable
    launchCampaign.mutate(
      {
        name,
        description,
        goalType: campaignGoalType ?? 'CONTENT_MARKETING',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        knowledgeIds: selectedKnowledgeIds,
        strategy: blueprintResult,
        deliverables: [{ type: selectedContentType, quantity: 1 }],
        saveAsTemplate: false,
      },
      {
        onSuccess: (result) => {
          resetWizard();
          // Navigate to content canvas with the new campaign
          const { useCampaignStore } = require('../../stores/useCampaignStore');
          useCampaignStore.getState().setSelectedCampaignId(result.campaignId);
          onNavigate('campaign-detail');
        },
      },
    );
  };

  const stepProceedOverride = useCampaignWizardStore((s) => s.stepProceedOverride);

  const handleContinue = () => {
    if (isLastStep && isContentMode) {
      handleContentLaunch();
    } else if (isLastStep) {
      handleLaunch();
    } else if (stepProceedOverride) {
      stepProceedOverride();
    } else {
      nextStep();
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <SetupStep />;
      case 2:
        return <KnowledgeStep />;
      case 3:
        return <StrategyStep />;
      case 4:
        return <ConceptStep />;
      case 5:
        return <DeliverablesStep />;
      case 6:
        return <ReviewStep />;
      default:
        return <SetupStep />;
    }
  };

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

      {/* Stepper */}
      <div data-testid="wizard-stepper" className="bg-white border border-gray-200 rounded-lg p-6">
        <WizardStepper
          currentStep={currentStep}
          stepLabels={isContentMode ? CONTENT_STEP_LABELS : undefined}
        />
      </div>

      {/* Step content */}
      <div data-testid="wizard-step-content" className="bg-white border border-gray-200 rounded-lg p-6 min-h-[400px]">
        {renderStep()}
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
          icon={isLastStep ? Rocket : (currentStep === 4 && strategyPhase === "review_proposal") ? Map : ArrowRight}
          iconPosition={isLastStep ? "left" : "right"}
          onClick={handleContinue}
          disabled={!canProceedResult || launchCampaign.isPending}
          isLoading={launchCampaign.isPending}
        >
          {isLastStep
            ? "Launch Campaign"
            : currentStep === 4 && strategyPhase === "review_proposal"
              ? "Elaborate Customer Journey"
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
