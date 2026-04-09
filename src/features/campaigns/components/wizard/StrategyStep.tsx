"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useWizardKnowledge } from "../../hooks";
import {
  validateBriefingSSE,
  buildFoundationSSE,
} from "../../api/campaigns.api";
import type { PipelineStepStatus } from "../../types/campaign-wizard.types";
import { PipelineProgressView } from "./PipelineProgressView";
import type { PipelineStepConfig } from "./PipelineProgressView";
import { BriefingReviewView } from "./BriefingReviewView";
import { StrategyFoundationReviewView } from "./StrategyFoundationReviewView";

// ─── 9-Phase Pipeline Step Configs ──────────────────────

const PHASE_VALIDATE_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Gathering Context",
    label: "Gathering brand context...",
    description: "Loading brand assets, personas, and product data for briefing evaluation.",
  },
  {
    step: 2,
    name: "Analyzing Briefing",
    label: "Analyzing briefing completeness...",
    description: "AI evaluates briefing completeness, strategic clarity, and identifies gaps.",
  },
  {
    step: 3,
    name: "Scoring Results",
    label: "Scoring results...",
    description: "Calculating validation score and identifying improvement areas.",
  },
];

const PHASE_FOUNDATION_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Gathering Context",
    label: "Gathering brand & audience context...",
    description: "Loading brand assets, personas, products, competitors, trends, and styleguide data.",
  },
  {
    step: 2,
    name: "Enriching Strategy",
    label: "Enriching with marketing frameworks...",
    description: "Applying behavioral science, persuasion principles, and external research sources.",
  },
  {
    step: 3,
    name: "Deep Analysis",
    label: "Building behavioral analysis...",
    description: "AI constructs behavioral science-driven strategy foundation with deep thinking.",
  },
  {
    step: 4,
    name: "Finalizing Foundation",
    label: "Synthesizing foundation insights...",
    description: "Validating results and packaging enrichment context for creative phases.",
  },
];


// ─── Component ────────────────────────────────────────────

export function StrategyStep() {
  const campaignName = useCampaignWizardStore((s) => s.name);
  const campaignDescription = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const strategicIntent = useCampaignWizardStore((s) => s.strategicIntent);
  const isGenerating = useCampaignWizardStore((s) => s.isGenerating);
  const pipelineSteps = useCampaignWizardStore((s) => s.pipelineSteps);
  const pipelineError = useCampaignWizardStore((s) => s.pipelineError);
  const selectedKnowledgeIds = useCampaignWizardStore((s) => s.selectedKnowledgeIds);
  const strategyPhase = useCampaignWizardStore((s) => s.strategyPhase);

  // Enrichment state (used by foundation builder)
  const enrichmentStatus = useCampaignWizardStore((s) => s.enrichmentStatus);
  const enrichmentBlockCount = useCampaignWizardStore((s) => s.enrichmentBlockCount);
  const enrichmentSources = useCampaignWizardStore((s) => s.enrichmentSources);
  const useExternalEnrichment = useCampaignWizardStore((s) => s.useExternalEnrichment);
  // 9-Phase state
  const briefingValidation = useCampaignWizardStore((s) => s.briefingValidation);
  const strategyFoundation = useCampaignWizardStore((s) => s.strategyFoundation);

  // Briefing fields
  const briefingOccasion = useCampaignWizardStore((s) => s.briefingOccasion);
  const briefingAudienceObjective = useCampaignWizardStore((s) => s.briefingAudienceObjective);
  const briefingCoreMessage = useCampaignWizardStore((s) => s.briefingCoreMessage);
  const briefingTonePreference = useCampaignWizardStore((s) => s.briefingTonePreference);
  const briefingConstraints = useCampaignWizardStore((s) => s.briefingConstraints);

  const [phaseError, setPhaseError] = useState<string | null>(null);

  const { data: knowledgeData } = useWizardKnowledge();

  // Extract IDs per source type from the selected knowledge items
  const selectedContextIds = useMemo(() => {
    if (!knowledgeData?.groups) return { personaIds: [], productIds: [], competitorIds: [], trendIds: [] };
    const allItems = knowledgeData.groups.flatMap((g) => g.items);
    const selectedItems = allItems.filter((item) => selectedKnowledgeIds.includes(item.sourceId));
    return {
      personaIds: selectedItems.filter((i) => i.sourceType === "persona").map((i) => i.sourceId),
      productIds: selectedItems.filter((i) => i.sourceType === "product").map((i) => i.sourceId),
      competitorIds: selectedItems.filter((i) => i.sourceType === "competitor").map((i) => i.sourceId),
      trendIds: selectedItems.filter((i) => i.sourceType === "detected_trend").map((i) => i.sourceId),
    };
  }, [knowledgeData, selectedKnowledgeIds]);

  const abortRef = useRef<{ abort: () => void } | null>(null);
  const generationIdRef = useRef(0);
  const strategyAutoStartedRef = useRef(false);

  // Cleanup on unmount — only abort if component is truly unmounting, not during
  // React 19 dev-mode double-invoke (mount→unmount→mount).  We use a flag to
  // distinguish the two: the flag is set on every mount and cleared in the
  // cleanup.  React's double-invoke calls cleanup synchronously before the
  // second mount, so by the time the second mount runs the flag is false.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Defer the abort so the second mount (dev double-invoke) can claim the ref
      setTimeout(() => {
        if (!isMountedRef.current) {
          abortRef.current?.abort();
        }
      }, 50);
    };
  }, []);


  const campaignType = useCampaignWizardStore((s) => s.campaignType);
  const wizardMode = useCampaignWizardStore((s) => s.wizardMode);
  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);

  const wizardContext = useMemo(() => ({
    campaignName: campaignName || "Untitled Campaign",
    campaignDescription,
    campaignGoalType: campaignGoalType ?? undefined,
    campaignType: wizardMode === 'content' ? 'content' as const : (campaignType ?? undefined),
    selectedContentType: selectedContentType ?? undefined,
    useExternalEnrichment,
    briefing: {
      occasion: briefingOccasion || undefined,
      audienceObjective: briefingAudienceObjective || undefined,
      coreMessage: briefingCoreMessage || undefined,
      tonePreference: briefingTonePreference || undefined,
      constraints: briefingConstraints || undefined,
    },
  }), [campaignName, campaignDescription, campaignGoalType, campaignType, wizardMode, selectedContentType, useExternalEnrichment, briefingOccasion, briefingAudienceObjective, briefingCoreMessage, briefingTonePreference, briefingConstraints]);

  // ─── 9-Phase: Validate Briefing ─────────────────────

  const handleValidateBriefing = useCallback(() => {
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("validating_briefing");

    for (const step of PHASE_VALIDATE_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = validateBriefingSSE(
      {
        strategicIntent,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        wizardContext,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        if (data.type === "complete" && data.result) {
          const result = data.result as import("@/lib/campaigns/strategy-blueprint.types").BriefingValidation;
          const s = useCampaignWizardStore.getState();
          s.setBriefingValidation(result);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_briefing");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError((data.error as string) || "Briefing validation failed");
          s.setIsGenerating(false);
          s.setStrategyPhase("idle");
          return;
        }

        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({
            step: data.step as number,
            name: data.name as string,
            status: data.status as PipelineStepStatus,
            label: data.label as string,
            preview: data.preview as string | undefined,
            error: data.error as string | undefined,
          });
        }
      },
      (error) => {
        if (generationIdRef.current !== currentGenId) return;
        const s = useCampaignWizardStore.getState();
        s.setPipelineError(error);
        s.setIsGenerating(false);
        s.setStrategyPhase("idle");
      },
    );
    abortRef.current = { abort };
  }, [strategicIntent, selectedContextIds, wizardContext]);

  // Auto-start strategy generation when step 3 is reached
  // In content mode, selectedContentType replaces campaignGoalType as the trigger
  const canAutoStart = wizardMode === 'content' ? !!selectedContentType : !!campaignGoalType;
  useEffect(() => {
    if (strategyPhase === 'idle' && !isGenerating && !pipelineError && !strategyAutoStartedRef.current && canAutoStart) {
      strategyAutoStartedRef.current = true;
      handleValidateBriefing();
    }
  }, [strategyPhase, isGenerating, pipelineError, canAutoStart, handleValidateBriefing]);

  // ─── 9-Phase: Build Foundation ─────────────────────

  const handleBuildFoundation = useCallback(() => {
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("building_foundation");

    for (const step of PHASE_FOUNDATION_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = buildFoundationSSE(
      {
        strategicIntent,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        wizardContext,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        if (data.type === "enrichment") {
          const status = data.status;
          if (status !== "running" && status !== "complete" && status !== "skipped") return;
          useCampaignWizardStore.getState().setEnrichmentStatus(
            status,
            {
              totalBlocks: typeof data.totalBlocks === "number" ? data.totalBlocks : 0,
              queries: Array.isArray(data.queries) ? (data.queries as string[]) : [],
              sources: (data.sources && typeof data.sources === "object" ? data.sources : {}) as { arena?: number; exa?: number; scholar?: number; bct?: boolean },
            },
          );
          return;
        }

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            foundation: import("@/lib/campaigns/strategy-blueprint.types").StrategyFoundation;
            enrichmentContext: import("@/lib/campaigns/strategy-blueprint.types").EnrichmentContext;
          };
          const s = useCampaignWizardStore.getState();
          s.setStrategyFoundation(result.foundation);
          s.setEnrichmentContext(result.enrichmentContext);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_strategy");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_briefing");
          setPhaseError("Foundation building failed. Please try again.");
          return;
        }

        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({
            step: data.step as number,
            name: data.name as string,
            status: data.status as PipelineStepStatus,
            label: data.label as string,
            preview: data.preview as string | undefined,
            error: data.error as string | undefined,
          });
        }
      },
      (error) => {
        if (generationIdRef.current !== currentGenId) return;
        const s = useCampaignWizardStore.getState();
        s.setPipelineError(null);
        s.setIsGenerating(false);
        s.setStrategyPhase("review_briefing");
        setPhaseError("Foundation building failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategicIntent, selectedContextIds, wizardContext]);

  // ─── Edit Briefing Manually ─────────────────────────

  const handleEditBriefing = useCallback(() => {
    // Abort any running SSE stream before navigating away
    abortRef.current?.abort();
    abortRef.current = null;
    setPhaseError(null);
    const store = useCampaignWizardStore.getState();
    store.setStrategyPhase("idle");
    store.setIsGenerating(false);
    store.setCurrentStep(1);
  }, []);

  // ─── Restart ─────────────────────────────────────────

  const handleRestart = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationIdRef.current++;
    strategyAutoStartedRef.current = false;
    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setStrategyPhase("idle");
    store.setBlueprintResult(null);
    store.clearPhaseData();
  }, []);

  // ─── Set wizard Continue override for strategy step phases ────
  React.useEffect(() => {
    const store = useCampaignWizardStore.getState();
    if (strategyPhase === "review_briefing") {
      store.setStepProceedOverride(handleBuildFoundation);
    } else {
      store.setStepProceedOverride(null);
    }
    return () => { store.setStepProceedOverride(null); };
  }, [strategyPhase, handleBuildFoundation]);

  // Strategy step complete — auto-advance to Concept step
  // NOTE: This useEffect MUST be before any conditional returns (React hooks rule)
  useEffect(() => {
    if (strategyPhase === "rationale_complete") {
      useCampaignWizardStore.getState().nextStep();
    }
  }, [strategyPhase]);

  // ─── Render based on phase ───────────────────────────

  // Pre-generation CTA
  if (strategyPhase === "idle" && !isGenerating && !pipelineError) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-gray-400 animate-pulse" />
        </div>
        <p className="text-sm text-gray-500">Starting strategy generation...</p>
      </div>
    );
  }

  // Error state with retry
  if (pipelineError && !isGenerating) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
        <p className="text-sm text-red-600 mb-6 max-w-sm mx-auto">{pipelineError}</p>
        <Button variant="cta" size="lg" icon={Sparkles} onClick={handleRestart}>
          Try Again
        </Button>
      </div>
    );
  }

  // ─── 9-Phase: Validating Briefing ─────────────────────
  if (strategyPhase === "validating_briefing" && isGenerating) {
    return (
      <PipelineProgressView
        title="Validating Campaign Briefing"
        steps={PHASE_VALIDATE_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // 9-Phase: Review Briefing
  if (strategyPhase === "review_briefing" && briefingValidation) {
    return (
      <BriefingReviewView
        validation={briefingValidation}
        onRevise={handleEditBriefing}
        error={phaseError}
        briefing={{
          occasion: briefingOccasion,
          audienceObjective: briefingAudienceObjective,
          coreMessage: briefingCoreMessage,
          tonePreference: briefingTonePreference,
          constraints: briefingConstraints,
        }}
        onBriefingChange={(field, value) => {
          const store = useCampaignWizardStore.getState();
          const setters: Record<string, (v: string) => void> = {
            occasion: store.setBriefingOccasion,
            audienceObjective: store.setBriefingAudienceObjective,
            coreMessage: store.setBriefingCoreMessage,
            tonePreference: store.setBriefingTonePreference,
            constraints: store.setBriefingConstraints,
          };
          setters[field]?.(value);
        }}
        onRevalidate={handleValidateBriefing}
      />
    );
  }

  // 9-Phase: Building Foundation
  if (strategyPhase === "building_foundation" && isGenerating) {
    return (
      <PipelineProgressView
        title="Building Strategy Foundation"
        steps={PHASE_FOUNDATION_STEPS}
        pipelineSteps={pipelineSteps}
        enrichmentStatus={enrichmentStatus}
        enrichmentBlockCount={enrichmentBlockCount}
        enrichmentSources={enrichmentSources}
      />
    );
  }

  // 9-Phase: Review Strategy Foundation → proceed to concept step
  if (strategyPhase === "review_strategy" && strategyFoundation) {
    return (
      <StrategyFoundationReviewView
        foundation={strategyFoundation}
        onProceed={() => {
          useCampaignWizardStore.getState().setStrategyPhase("rationale_complete");
        }}
        errorMessage={phaseError}
      />
    );
  }

  // Fallback — redirect to idle state to prevent blank screen
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        The strategy step encountered an unexpected state. Please restart the generation.
      </p>
      <Button variant="cta" size="lg" icon={Sparkles} onClick={handleRestart}>
        Start Over
      </Button>
    </div>
  );
}

export default StrategyStep;
