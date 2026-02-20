"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/shared";
import { PageShell } from '@/components/ui/layout';
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useLaunchCampaign } from "../../hooks";
import { WizardStepper } from "./WizardStepper";
import { SetupStep } from "./SetupStep";
import { KnowledgeStep } from "./KnowledgeStep";
import { StrategyStep } from "./StrategyStep";
import { DeliverablesStep } from "./DeliverablesStep";
import { ReviewStep } from "./ReviewStep";
import { CampaignSuccessModal } from "./CampaignSuccessModal";

// ─── Types ────────────────────────────────────────────────

interface CampaignWizardPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

export function CampaignWizardPage({ onNavigate }: CampaignWizardPageProps) {
  const currentStep = useCampaignWizardStore((s) => s.currentStep);
  const nextStep = useCampaignWizardStore((s) => s.nextStep);
  const prevStep = useCampaignWizardStore((s) => s.prevStep);
  const canProceed = useCampaignWizardStore((s) => s.canProceed);
  const resetWizard = useCampaignWizardStore((s) => s.resetWizard);

  // Launch state
  const name = useCampaignWizardStore((s) => s.name);
  const description = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const strategyResult = useCampaignWizardStore((s) => s.strategyResult);
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

  // Reset wizard on mount and unmount
  useEffect(() => {
    resetWizard();
    return () => {
      resetWizard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLastStep = currentStep === 5;

  const handleLaunch = () => {
    if (!campaignGoalType || !strategyResult) return;

    launchCampaign.mutate(
      {
        name,
        description,
        goalType: campaignGoalType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        knowledgeIds: selectedKnowledgeIds,
        strategy: strategyResult,
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
        },
      },
    );
  };

  const handleContinue = () => {
    if (isLastStep) {
      handleLaunch();
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
        return <DeliverablesStep />;
      case 5:
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
          Create Strategic Campaign
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Build a comprehensive campaign with AI-powered strategy
        </p>
      </div>

      {/* Stepper */}
      <div data-testid="wizard-stepper" className="bg-white border border-gray-200 rounded-lg p-6">
        <WizardStepper currentStep={currentStep} />
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
          icon={isLastStep ? Rocket : ArrowRight}
          iconPosition={isLastStep ? "left" : "right"}
          onClick={handleContinue}
          disabled={!canProceed() || launchCampaign.isPending}
          isLoading={launchCampaign.isPending}
        >
          {isLastStep ? "Launch Campaign" : "Continue"}
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
