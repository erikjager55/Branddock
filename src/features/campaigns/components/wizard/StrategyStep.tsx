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
  elaborateJourneySSE,
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


// ─── Elapsed Timer ───────────────────────────────────────

function ElapsedTimer({ isComplete }: { isComplete: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isComplete]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <>{m}:{String(s).padStart(2, '0')}</>;
}

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
  const pipelineConfig = useCampaignWizardStore((s) => s.pipelineConfig);
  // 9-Phase state
  const briefingValidation = useCampaignWizardStore((s) => s.briefingValidation);
  const strategyFoundation = useCampaignWizardStore((s) => s.strategyFoundation);

  // Briefing fields
  const briefingOccasion = useCampaignWizardStore((s) => s.briefingOccasion);
  const briefingAudienceObjective = useCampaignWizardStore((s) => s.briefingAudienceObjective);
  const briefingCoreMessage = useCampaignWizardStore((s) => s.briefingCoreMessage);
  const briefingTonePreference = useCampaignWizardStore((s) => s.briefingTonePreference);
  const briefingConstraints = useCampaignWizardStore((s) => s.briefingConstraints);
  const briefingSources = useCampaignWizardStore((s) => s.briefingSources);

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

  // Recover from stale in-flight phases. When the user navigated away while
  // SSE was running, the abort handler in createPhaseSSE silently returns
  // (doesn't call onError), leaving isGenerating=true and strategyPhase stuck.
  // This must run before the auto-start effect so the recovered phase can
  // trigger the correct auto-start logic.
  useEffect(() => {
    useCampaignWizardStore.getState().recoverStalePhase();
  }, []);

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
      // Include only sources that have been successfully parsed.
      sources: briefingSources
        .filter((s) => s.status === 'ready' && s.extractedText)
        .map((s) => ({
          type: s.type,
          url: s.url,
          fileName: s.fileName,
          title: s.title,
          extractedText: s.extractedText,
        })),
    },
  }), [campaignName, campaignDescription, campaignGoalType, campaignType, wizardMode, selectedContentType, useExternalEnrichment, briefingOccasion, briefingAudienceObjective, briefingCoreMessage, briefingTonePreference, briefingConstraints, briefingSources]);

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
        pipelineConfig,
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
  }, [strategicIntent, selectedContextIds, wizardContext, pipelineConfig]);

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
        pipelineConfig,
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
  }, [strategicIntent, selectedContextIds, wizardContext, pipelineConfig]);

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

  // In Basic strategy mode we skip straight from briefing review to
  // rationale_complete — no foundation building, no strategy review.
  // This is the 'Quick' preset's fast path through the Strategy step.
  const handleSkipFoundation = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    store.setStrategyPhase("rationale_complete");
  }, []);

  // ─── Set wizard Continue override for strategy step phases ────
  const handleApproveFoundation = useCallback(() => {
    useCampaignWizardStore.getState().setStrategyPhase("rationale_complete");
  }, []);

  React.useEffect(() => {
    const store = useCampaignWizardStore.getState();
    if (strategyPhase === "review_briefing") {
      // Basic strategy depth skips the foundation phase entirely
      if (pipelineConfig.strategyDepth === 'basic') {
        store.setStepProceedOverride(handleSkipFoundation);
      } else {
        store.setStepProceedOverride(handleBuildFoundation);
      }
    } else if (strategyPhase === "review_strategy") {
      // Continue button approves the strategy foundation
      store.setStepProceedOverride(handleApproveFoundation);
    } else {
      store.setStepProceedOverride(null);
    }
    return () => { store.setStepProceedOverride(null); };
  }, [strategyPhase, handleBuildFoundation, handleSkipFoundation, handleApproveFoundation, pipelineConfig.strategyDepth]);

  // Strategy step complete — auto-advance to next step
  // When concept is skipped: trigger elaborate journey to build blueprint, then advance.
  // When concept is NOT skipped: advance immediately to Concept step.
  // NOTE: This useEffect MUST be before any conditional returns (React hooks rule)
  const skipConceptStep = useCampaignWizardStore((s) => s.skipConceptStep);
  const elaborateStartedRef = useRef(false);
  const [directBuildSteps, setDirectBuildSteps] = useState<Array<{ name: string; status: 'pending' | 'running' | 'complete'; label: string; description: string; preview?: string }>>([
    { name: 'Journey Phases', status: 'pending', label: 'Generating journey phases...', description: 'Designing the customer journey from awareness to action, with persona-specific touchpoints per phase.' },
    { name: 'Channel Planner', status: 'pending', label: 'Planning channels...', description: 'Selecting the optimal media mix, channel roles (hero/hub/hygiene), and timing strategy.' },
    { name: 'Asset Planner', status: 'pending', label: 'Creating deliverable plan...', description: 'Planning campaign deliverables with briefs, production priorities, and flow connections.' },
  ]);

  useEffect(() => {
    if (strategyPhase !== "rationale_complete") return;

    if (!skipConceptStep || wizardMode === 'content') {
      useCampaignWizardStore.getState().nextStep();
      return;
    }

    // Skip concept: build channel plan + asset plan directly from strategy foundation
    if (elaborateStartedRef.current) return;
    elaborateStartedRef.current = true;

    // Reset progress indicators for retry after failure
    setDirectBuildSteps([
      { name: 'Journey Phases', status: 'pending', label: 'Generating journey phases...', description: 'Designing the customer journey from awareness to action, with persona-specific touchpoints per phase.' },
      { name: 'Channel Planner', status: 'pending', label: 'Planning channels...', description: 'Selecting the optimal media mix, channel roles (hero/hub/hygiene), and timing strategy.' },
      { name: 'Asset Planner', status: 'pending', label: 'Creating deliverable plan...', description: 'Planning campaign deliverables with briefs, production priorities, and flow connections.' },
    ]);

    const store = useCampaignWizardStore.getState();
    store.setIsGenerating(true);
    store.setStrategyPhase("elaborating_direct");

    const { abort } = elaborateJourneySSE(
      {
        synthesisFeedback: '',
        synthesizedStrategy: (store.synthesizedStrategy ?? store.strategyFoundation ?? {}) as import('@/lib/campaigns/strategy-blueprint.types').StrategyLayer,
        synthesizedArchitecture: (store.synthesizedArchitecture ?? { journeyPhases: [] }) as import('@/lib/campaigns/strategy-blueprint.types').ArchitectureLayer,
        personaValidation: store.personaValidation ?? [],
        wizardContext,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        strategicIntent,
        pipelineConfig,
      },
      (event: unknown) => {
        const evt = event as { type?: string; step?: number; name?: string; status?: string; label?: string; preview?: string; result?: { channelPlan: unknown; assetPlan: unknown } };

        // Update step progress indicators
        if (evt.step && evt.name && evt.status) {
          setDirectBuildSteps((prev) =>
            prev.map((s) =>
              s.name === evt.name
                ? { ...s, status: evt.status as 'running' | 'complete', label: evt.label ?? s.label, preview: evt.preview }
                : s
            ),
          );
        }

        if (evt.type === 'complete' && evt.result) {
          const s = useCampaignWizardStore.getState();
          const channelPlan = evt.result.channelPlan;
          const assetPlan = evt.result.assetPlan;
          const resultArch = (evt.result as { architecture?: import('@/lib/campaigns/strategy-blueprint.types').ArchitectureLayer }).architecture;
          s.setElaborateResult({ channelPlan, assetPlan } as Parameters<typeof s.setElaborateResult>[0]);

          // When journey phases were auto-generated (Step 4.5), update the store
          if (resultArch) {
            s.setSynthesisResult({
              strategy: (s.synthesizedStrategy ?? s.strategyFoundation ?? {}) as import('@/lib/campaigns/strategy-blueprint.types').StrategyLayer,
              architecture: resultArch,
            });
          }

          // Build a messaging framework from strategy foundation + briefing
          // so all deliverables share consistent direction via extractConceptContext()
          const foundation = s.strategyFoundation;
          const briefing = s.briefingOccasion || s.briefingCoreMessage || s.briefingAudienceObjective;
          // Build key messages from core message + proof points + briefing
          const keyMessages: string[] = [];
          if (foundation?.coreMessage) keyMessages.push(foundation.coreMessage);
          else if (s.briefingCoreMessage) keyMessages.push(s.briefingCoreMessage);
          if (foundation?.proofPoints) keyMessages.push(...foundation.proofPoints.slice(0, 3));
          if (foundation?.targetBehaviors && keyMessages.length < 5) keyMessages.push(...foundation.targetBehaviors.slice(0, 2));

          const strategyWithMessaging = {
            ...(s.synthesizedStrategy ?? s.strategyFoundation ?? {}),
            // Fields that extractConceptContext() reads for consistent messaging:
            campaignTheme: foundation?.strategicDirection ?? s.name ?? 'Campaign',
            positioningStatement: foundation?.suggestedApproach ?? null,
            strategicApproach: foundation?.strategicDirection ?? null,
            keyMessages,
            targetAudienceInsights: foundation?.audienceInsights?.[0]?.insight ?? (briefing ? s.briefingAudienceObjective : null),
            humanInsight: foundation?.coreMessage ?? foundation?.keyInsights?.[0]?.insight ?? null,
            // Pass through the new foundation fields for richer context
            reasonToAct: foundation?.reasonToAct ?? null,
          };

          // Use the (possibly updated) architecture from the store
          const finalArch = resultArch ?? s.synthesizedArchitecture ?? { journeyPhases: [] };

          s.setBlueprintResult({
            strategy: strategyWithMessaging,
            architecture: finalArch,
            channelPlan,
            assetPlan,
            personaValidation: s.personaValidation ?? [],
            confidence: 0,
            confidenceBreakdown: {},
            generatedAt: new Date().toISOString(),
            variantAScore: 0,
            variantBScore: 0,
            variantCScore: 0,
            pipelineDuration: 0,
            modelsUsed: [],
          } as unknown as import('@/lib/campaigns/strategy-blueprint.types').CampaignBlueprint);
          s.setStrategyPhase("complete");
          s.setIsGenerating(false);
          s.nextStep();
        }
      },
      (error: string) => {
        setPhaseError(error);
        const s = useCampaignWizardStore.getState();
        s.setIsGenerating(false);
        // Roll back to rationale_complete so the user can retry the elaborate
        // (or so recoverStalePhase picks it up on re-mount after navigation).
        s.setStrategyPhase("rationale_complete");
        elaborateStartedRef.current = false;
      },
    );

    abortRef.current = { abort };

    // Cleanup: deferred abort to avoid React 19 double-invoke
    return () => {
      setTimeout(() => {
        if (!elaborateStartedRef.current) abort();
      }, 50);
    };
  }, [strategyPhase, skipConceptStep, wizardContext, selectedContextIds, strategicIntent, pipelineConfig]);

  // ─── Render based on phase ───────────────────────────

  // Elaborating direct (skip concept — building deployment plan)
  if (strategyPhase === "elaborating_direct") {
    const completedCount = directBuildSteps.filter(s => s.status === 'complete').length;
    const allDone = completedCount === directBuildSteps.length;
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-teal-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Building Deployment Plan
            {!allDone && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                <ElapsedTimer isComplete={allDone} />
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500">Translating strategy into channel plan and deliverables...</p>
          <p className="text-xs text-gray-400 mt-1">This typically takes 1–2 minutes</p>
        </div>

        {/* Process status */}
        <div className="space-y-3">
          {directBuildSteps.map((step) => (
            <div key={step.name} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-white">
              <div className="mt-0.5">
                {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
                {step.status === 'running' && (
                  <div className="w-5 h-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                )}
                {step.status === 'complete' && (
                  <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.status === 'complete' ? 'text-teal-700' : step.status === 'running' ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.label}</p>
                {step.status === 'running' && (
                  <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
              {step.preview && (
                <span className="text-xs text-teal-600 font-medium mt-0.5">{step.preview}</span>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{completedCount} of {directBuildSteps.length} steps</span>
            <span>{Math.round((completedCount / directBuildSteps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / directBuildSteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

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
        estimatedDuration="15–30 seconds"
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
        estimatedDuration="2–4 minutes"
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
