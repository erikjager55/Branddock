"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Target,
  Layers,
  Share2,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, ProgressBar } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { generateBlueprintSSE } from "../../api/campaigns.api";
import type { PipelineStep, PipelineStepStatus } from "../../types/campaign-wizard.types";

// ─── Pipeline Step Config ────────────────────────────────

const PIPELINE_STEPS = [
  { step: 1, name: "Strategy Architect", label: "Formulating campaign strategy..." },
  { step: 2, name: "Campaign Architecture (Dual)", label: "Generating strategy variants A & B..." },
  { step: 3, name: "Persona Validator", label: "Validating with personas..." },
  { step: 4, name: "Strategy Synthesizer", label: "Synthesizing optimal strategy..." },
  { step: 5, name: "Channel Planner", label: "Planning channel strategy..." },
  { step: 6, name: "Asset Planner", label: "Creating asset plan..." },
] as const;

// ─── Step Status Icon ────────────────────────────────────

function StepStatusIcon({ status }: { status: PipelineStepStatus }) {
  switch (status) {
    case "complete":
      return (
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      );
    case "running":
      return (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </div>
      );
    case "error":
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
      );
  }
}

// ─── Collapsible Preview Section ─────────────────────────

function CollapsiblePreview({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </button>
      {isOpen && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function StrategyStep() {
  const campaignName = useCampaignWizardStore((s) => s.name);
  const campaignDescription = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const strategicIntent = useCampaignWizardStore((s) => s.strategicIntent);
  const isGenerating = useCampaignWizardStore((s) => s.isGenerating);
  const blueprintResult = useCampaignWizardStore((s) => s.blueprintResult);
  const pipelineSteps = useCampaignWizardStore((s) => s.pipelineSteps);
  const pipelineError = useCampaignWizardStore((s) => s.pipelineError);

  const abortRef = useRef<{ abort: () => void } | null>(null);
  const generationIdRef = useRef(0);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleGenerate = useCallback(() => {
    if (!campaignGoalType) return;

    // Increment generation ID to invalidate stale callbacks from previous SSE connections
    const currentGenId = ++generationIdRef.current;

    // Reset previous state
    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);

    // Initialize pipeline steps as pending
    for (const step of PIPELINE_STEPS) {
      store.updateStepStatus({
        step: step.step,
        name: step.name,
        status: "pending",
        label: step.label,
      });
    }

    // Use the wizard endpoint which doesn't require an existing campaign in the DB.
    // The /api/campaigns/wizard/strategy/generate route handles this case.
    const { abort } = generateBlueprintSSE(
      "wizard",
      {
        strategicIntent,
        personaIds: [], // Wizard uses all available personas
        wizardContext: {
          campaignName: campaignName || "Untitled Campaign",
          campaignDescription: campaignDescription,
          campaignGoalType,
        },
      },
      (event) => {
        // Ignore events from a stale generation (e.g. after regenerate)
        if (generationIdRef.current !== currentGenId) return;

        const data = event as {
          step?: number;
          name?: string;
          status?: PipelineStepStatus;
          label?: string;
          preview?: string;
          error?: string;
          type?: string;
          blueprint?: unknown;
        };

        if (data.type === "complete" && data.blueprint) {
          // Pipeline finished successfully
          const store = useCampaignWizardStore.getState();
          store.setBlueprintResult(
            data.blueprint as import("@/lib/campaigns/strategy-blueprint.types").CampaignBlueprint,
          );
          store.setIsGenerating(false);
          return;
        }

        if (data.type === "error") {
          const store = useCampaignWizardStore.getState();
          store.setPipelineError(data.error || "An unexpected error occurred");
          store.setIsGenerating(false);
          return;
        }

        // Step progress update
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({
            step: data.step,
            name: data.name,
            status: data.status,
            label: data.label,
            preview: data.preview,
            error: data.error,
          });
        }
      },
      (error) => {
        // Ignore errors from a stale generation
        if (generationIdRef.current !== currentGenId) return;
        const store = useCampaignWizardStore.getState();
        store.setPipelineError(error);
        store.setIsGenerating(false);
      },
    );

    abortRef.current = { abort };
  }, [campaignName, campaignDescription, campaignGoalType, strategicIntent]);

  const handleRegenerate = useCallback(() => {
    abortRef.current?.abort();
    handleGenerate();
  }, [handleGenerate]);

  // ── Compute overall progress ──
  const completedSteps = pipelineSteps.filter((s) => s.status === "complete").length;
  const totalSteps = PIPELINE_STEPS.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // ── Pre-generation state ──
  if (!blueprintResult && !isGenerating && !pipelineError) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generate Campaign Blueprint
        </h3>
        <p className="text-sm text-gray-500 mb-2 max-w-sm mx-auto">
          Our AI will analyze your brand context, personas, and campaign goals
          to create a comprehensive 4-layer campaign blueprint.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Uses multiple AI models for diverse perspectives and persona validation.
          Takes approximately 80-120 seconds.
        </p>
        <Button variant="cta" size="lg" icon={Sparkles} onClick={handleGenerate}>
          Generate Blueprint
        </Button>
      </div>
    );
  }

  // ── Error state with retry ──
  if (pipelineError && !isGenerating) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generation Failed
        </h3>
        <p className="text-sm text-red-600 mb-6 max-w-sm mx-auto">
          {pipelineError}
        </p>
        <Button variant="cta" size="lg" icon={Sparkles} onClick={handleRegenerate}>
          Try Again
        </Button>
      </div>
    );
  }

  // ── Generating state: pipeline progress ──
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Generating Campaign Blueprint
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedSteps} of {totalSteps} steps completed
          </p>
        </div>

        {/* Overall progress bar */}
        <ProgressBar
          value={progressPercent}
          color="emerald"
          size="md"
          showLabel
        />

        {/* Step list */}
        <div className="space-y-2">
          {PIPELINE_STEPS.map((config) => {
            const stepData = pipelineSteps.find((s) => s.step === config.step);
            const status = stepData?.status || "pending";
            const preview = stepData?.preview;

            return (
              <div
                key={config.step}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  status === "running"
                    ? "border-primary/30 bg-primary/5"
                    : status === "complete"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : status === "error"
                        ? "border-red-200 bg-red-50/50"
                        : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <StepStatusIcon status={status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {config.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status === "running" ? config.label : status === "complete" ? "Completed" : status === "error" ? (stepData?.error || "Failed") : "Waiting..."}
                  </p>
                  {preview && status === "complete" && (
                    <p className="text-xs text-emerald-700 mt-1 line-clamp-1">
                      {preview}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Post-generation: show blueprint results ──
  if (!blueprintResult) return null;

  const { strategy, architecture, channelPlan, assetPlan, confidence, personaValidation } = blueprintResult;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Confidence bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Blueprint Confidence
          </span>
          <span className={`text-lg font-bold ${
            confidence >= 80 ? "text-emerald-600" : confidence >= 60 ? "text-amber-500" : "text-red-500"
          }`}>
            {Math.round(confidence)}%
          </span>
        </div>
        <ProgressBar
          value={confidence}
          color={confidence >= 80 ? "emerald" : confidence >= 60 ? "amber" : "red"}
          size="md"
        />
        {personaValidation.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              Validated by {personaValidation.length} persona{personaValidation.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              (avg score: {(personaValidation.reduce((sum, pv) => sum + pv.overallScore, 0) / Math.max(personaValidation.length, 1)).toFixed(1)}/10)
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={Sparkles}
          onClick={handleRegenerate}
        >
          Regenerate
        </Button>
      </div>

      {/* Blueprint layer previews */}
      <div className="space-y-3">
        {/* Strategy Summary */}
        <CollapsiblePreview title="Campaign Strategy" icon={Target} defaultOpen>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Theme
              </p>
              <p className="text-sm font-medium text-gray-900">
                {strategy.campaignTheme}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Positioning
              </p>
              <p className="text-sm text-gray-700">
                {strategy.positioningStatement}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Strategic Intent
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="teal">
                  {strategy.strategicIntent === "brand_building" ? "Brand Building" : strategy.strategicIntent === "sales_activation" ? "Sales Activation" : "Hybrid"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {strategy.intentRatio.brand}/{strategy.intentRatio.activation} brand/activation
                </span>
              </div>
            </div>
            {strategy.strategicChoices.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Strategic Choices
                </p>
                <ul className="space-y-1">
                  {strategy.strategicChoices.slice(0, 3).map((choice, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">&#8226;</span>
                      {choice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsiblePreview>

        {/* Architecture Overview */}
        <CollapsiblePreview title="Campaign Architecture" icon={Layers}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default">
                {architecture.campaignType}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {architecture.journeyPhases.length} journey phase{architecture.journeyPhases.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {architecture.journeyPhases.reduce((sum, p) => sum + p.touchpoints.length, 0)} touchpoints
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {architecture.journeyPhases.map((phase) => (
                <div
                  key={phase.id}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <p className="font-medium text-gray-900">{phase.name}</p>
                  <p className="text-muted-foreground">{phase.touchpoints.length} touchpoints</p>
                </div>
              ))}
            </div>
          </div>
        </CollapsiblePreview>

        {/* Channel Plan */}
        <CollapsiblePreview title="Channel & Media Plan" icon={Share2}>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {channelPlan.channels.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs"
                >
                  <span className="font-medium text-gray-900">{channel.name}</span>
                  <Badge variant={channel.role === "hero" ? "success" : channel.role === "hub" ? "info" : "default"}>
                    {channel.role}
                  </Badge>
                </div>
              ))}
            </div>
            {channelPlan.timingStrategy && (
              <p className="text-xs text-muted-foreground">
                {channelPlan.timingStrategy}
              </p>
            )}
          </div>
        </CollapsiblePreview>

        {/* Asset Plan */}
        <CollapsiblePreview title="Asset Plan" icon={FileText}>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              {assetPlan.totalDeliverables} deliverable{assetPlan.totalDeliverables !== 1 ? "s" : ""} recommended
            </p>
            <div className="flex gap-2 flex-wrap">
              {["must-have", "should-have", "nice-to-have"].map((priority) => {
                const count = assetPlan.deliverables.filter((d) => d.productionPriority === priority).length;
                if (count === 0) return null;
                return (
                  <Badge
                    key={priority}
                    variant={priority === "must-have" ? "success" : priority === "should-have" ? "warning" : "default"}
                  >
                    {count} {priority}
                  </Badge>
                );
              })}
            </div>
            {assetPlan.prioritySummary && (
              <p className="text-xs text-muted-foreground">
                {assetPlan.prioritySummary}
              </p>
            )}
          </div>
        </CollapsiblePreview>
      </div>
    </div>
  );
}

export default StrategyStep;
