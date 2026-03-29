"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Palette,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useWizardKnowledge } from "../../hooks";
import {
  elaborateJourneySSE,
  generateHooksSSE,
  refineHookSSE,
} from "../../api/campaigns.api";
import type { PipelineStepStatus } from "../../types/campaign-wizard.types";
import type {
  StrategyLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  AssetPlanLayer,
  HookConcept,
  CampaignBlueprint,
} from "@/lib/campaigns/strategy-blueprint.types";
import { PipelineProgressView } from "./PipelineProgressView";
import type { PipelineStepConfig } from "./PipelineProgressView";
import { HookReviewView } from "./HookReviewView";
import { ProposalReviewView } from "./ProposalReviewView";
import { ConceptReviewView } from "./ConceptReviewView";
import { compileStructuredFeedback } from "../../lib/compile-structured-feedback";

// ─── Pipeline Step Configs per Concept Phase ──────────────

const HOOKS_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Creative Hook Generator",
    label: "Generating creative hooks...",
    description: "AI generates multiple creative hooks based on your strategy foundation, then validates each with personas.",
  },
  {
    step: 2,
    name: "Persona Validator",
    label: "Validating hooks with personas...",
    description: "Each persona evaluates the creative hooks on originality, memorability, and cultural relevance.",
  },
];

const PROPOSAL_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Gathering Context",
    label: "Gathering brand & audience context...",
    description: "Loading brand assets, personas, products, and selected hook data for refinement.",
  },
  {
    step: 2,
    name: "Applying Frameworks",
    label: "Applying marketing frameworks...",
    description: "Enriching with Cialdini persuasion principles, Kahneman framing, Byron Sharp growth laws, and EAST behavioral checklist.",
  },
  {
    step: 3,
    name: "Deep Hook Refinement",
    label: "Refining hook with deep thinking...",
    description: "AI uses extended thinking to elevate the selected hook into a production-ready campaign strategy and architecture.",
  },
  {
    step: 4,
    name: "Finalizing Proposal",
    label: "Packaging proposal...",
    description: "Validating strategy layers, normalizing architecture, and assembling the final campaign proposal.",
  },
];

const ELABORATE_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Channel Planner",
    label: "Planning channel strategy...",
    description: "Designs the media mix and channel deployment plan based on the approved strategy.",
  },
  {
    step: 2,
    name: "Asset Planner",
    label: "Planning campaign assets...",
    description: "Creates a detailed asset plan with deliverables, briefs, and production priorities.",
  },
];

// ─── Component ────────────────────────────────────────────

export function ConceptStep() {
  const campaignName = useCampaignWizardStore((s) => s.name);
  const campaignDescription = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const strategicIntent = useCampaignWizardStore((s) => s.strategicIntent);
  const isGenerating = useCampaignWizardStore((s) => s.isGenerating);
  const pipelineSteps = useCampaignWizardStore((s) => s.pipelineSteps);
  const selectedKnowledgeIds = useCampaignWizardStore((s) => s.selectedKnowledgeIds);
  const strategyPhase = useCampaignWizardStore((s) => s.strategyPhase);

  // Strategy data (used by both pipelines after convergence)
  const synthesizedStrategy = useCampaignWizardStore((s) => s.synthesizedStrategy);
  const synthesizedArchitecture = useCampaignWizardStore((s) => s.synthesizedArchitecture);
  const personaValidation = useCampaignWizardStore((s) => s.personaValidation);

  // 9-Phase data
  const strategyFoundation = useCampaignWizardStore((s) => s.strategyFoundation);
  const enrichmentContext = useCampaignWizardStore((s) => s.enrichmentContext);
  const hooks = useCampaignWizardStore((s) => s.hooks);
  const hookScores = useCampaignWizardStore((s) => s.hookScores);
  const selectedHookIndex = useCampaignWizardStore((s) => s.selectedHookIndex);
  const refinedHookConcept = useCampaignWizardStore((s) => s.refinedHookConcept);

  // Enrichment indicators
  const enrichmentStatus = useCampaignWizardStore((s) => s.enrichmentStatus);
  const enrichmentBlockCount = useCampaignWizardStore((s) => s.enrichmentBlockCount);
  const enrichmentSources = useCampaignWizardStore((s) => s.enrichmentSources);
  const useExternalEnrichment = useCampaignWizardStore((s) => s.useExternalEnrichment);

  // Legacy variant scores (for blueprint assembly)
  const variantAScore = useCampaignWizardStore((s) => s.variantAScore);
  const variantBScore = useCampaignWizardStore((s) => s.variantBScore);
  const variantCScore = useCampaignWizardStore((s) => s.variantCScore);

  // Briefing fields
  const briefingOccasion = useCampaignWizardStore((s) => s.briefingOccasion);
  const briefingAudienceObjective = useCampaignWizardStore((s) => s.briefingAudienceObjective);
  const briefingCoreMessage = useCampaignWizardStore((s) => s.briefingCoreMessage);
  const briefingTonePreference = useCampaignWizardStore((s) => s.briefingTonePreference);
  const briefingConstraints = useCampaignWizardStore((s) => s.briefingConstraints);

  // Elaborate result from Zustand store (survives unmount/remount)
  const elaborateResult = useCampaignWizardStore((s) => s.elaborateResult);
  const setElaborateResult = useCampaignWizardStore((s) => s.setElaborateResult);
  const [phaseError, setPhaseError] = useState<string | null>(null);

  const { data: knowledgeData } = useWizardKnowledge();

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

  const wizardContext = useMemo(() => ({
    campaignName: campaignName || "Untitled Campaign",
    campaignDescription,
    campaignGoalType: campaignGoalType ?? undefined,
    useExternalEnrichment,
    briefing: {
      occasion: briefingOccasion || undefined,
      audienceObjective: briefingAudienceObjective || undefined,
      coreMessage: briefingCoreMessage || undefined,
      tonePreference: briefingTonePreference || undefined,
      constraints: briefingConstraints || undefined,
    },
  }), [campaignName, campaignDescription, campaignGoalType, useExternalEnrichment, briefingOccasion, briefingAudienceObjective, briefingCoreMessage, briefingTonePreference, briefingConstraints]);

  const abortRef = useRef<{ abort: () => void } | null>(null);
  const generationIdRef = useRef(0);
  const autoStartedRef = useRef(false);

  // Cleanup SSE on unmount — reset autoStartedRef so strict mode remount can restart
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      autoStartedRef.current = false;
    };
  }, []);

  // Detect which pipeline to use
  const is9Phase = strategyFoundation !== null && enrichmentContext !== null;


  // ─── 9-Phase: Generate Hooks ──────────────────────────

  const handleGenerateHooks = useCallback(() => {
    if (!strategyFoundation || !enrichmentContext) return;
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_hooks");

    for (const step of HOOKS_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { strategyFeedback } = useCampaignWizardStore.getState();

    const { abort } = generateHooksSSE(
      {
        strategicIntent,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        wizardContext,
        foundation: strategyFoundation,
        enrichmentContext,
        strategyFeedback: strategyFeedback || undefined,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        // Enrichment events
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
            hooks: import("@/lib/campaigns/strategy-blueprint.types").CreativeHook[];
            curatorSelection: import("@/lib/campaigns/strategy-blueprint.types").CuratorSelection;
            personaValidation: import("@/lib/campaigns/strategy-blueprint.types").PersonaValidationResult[];
            hookScores: number[];
          };
          const s = useCampaignWizardStore.getState();
          s.setHookResults(result);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_hooks");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          s.setStrategyPhase("rationale_complete");
          setPhaseError("Hook generation failed. Please try again.");
          return;
        }

        // Step progress
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
        s.setStrategyPhase("rationale_complete");
        setPhaseError("Hook generation failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategyFoundation, enrichmentContext, strategicIntent, selectedContextIds, wizardContext]);

  // ─── 9-Phase: Refine Selected Hook ─────────────────────

  const handleRefineHook = useCallback(() => {
    const { selectedHookIndex: hookIdx, hooks: allHooks, personaValidation: pv, hookFeedback } = useCampaignWizardStore.getState();
    if (hookIdx === null || !allHooks[hookIdx] || !strategyFoundation || !pv) return;
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_proposal");

    for (const step of PROPOSAL_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = refineHookSSE(
      {
        strategicIntent,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        wizardContext,
        selectedHook: allHooks[hookIdx],
        foundation: strategyFoundation,
        personaValidation: pv,
        hookFeedback: hookFeedback[hookIdx] || undefined,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            strategy: StrategyLayer;
            architecture: ArchitectureLayer;
            hookConcept: HookConcept;
          };
          const s = useCampaignWizardStore.getState();
          // Converge: store strategy+architecture so both pipelines share the same data before elaborate
          s.setSynthesisResult({ strategy: result.strategy, architecture: result.architecture });
          s.setRefinedHookConcept(result.hookConcept);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_proposal");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_hooks");
          setPhaseError("Hook refinement failed. Please select a different hook or try again.");
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
        s.setStrategyPhase("review_hooks");
        setPhaseError("Hook refinement failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategyFoundation, strategicIntent, selectedContextIds, wizardContext]);

  // ─── Both Pipelines: Elaborate Journey ──────────────────

  const handleElaborate = useCallback(() => {
    const { synthesizedStrategy: strat, synthesizedArchitecture: arch, personaValidation: pv } = useCampaignWizardStore.getState();
    if (!strat || !arch) return;
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_journey");

    for (const step of ELABORATE_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { conceptFeedback, endorsedPersonaIds, strategyRatings } = useCampaignWizardStore.getState();
    const compiledFeedback = compileStructuredFeedback({
      freeText: conceptFeedback,
      endorsedPersonaIds,
      strategyRatings,
      personaValidation: pv ?? [],
    });

    const { abort } = elaborateJourneySSE(
      {
        synthesisFeedback: compiledFeedback,
        synthesizedStrategy: strat,
        synthesizedArchitecture: arch,
        personaValidation: pv ?? [],
        wizardContext,
        personaIds: selectedContextIds.personaIds,
        productIds: selectedContextIds.productIds,
        competitorIds: selectedContextIds.competitorIds,
        trendIds: selectedContextIds.trendIds,
        strategicIntent,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        // Enrichment events
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
            channelPlan: ChannelPlanLayer;
            assetPlan: AssetPlanLayer;
          };
          // Atomic update: set result + stop generating in one call to prevent
          // a one-frame flash where neither the progress nor review view renders.
          useCampaignWizardStore.setState({
            elaborateResult: result,
            isGenerating: false,
          });
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          // Fall back to the appropriate review phase
          if (is9Phase) {
            s.setStrategyPhase("review_proposal");
          } else {
            s.setStrategyPhase("rationale_complete");
          }
          setPhaseError("Journey elaboration failed. Please try again.");
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
        if (is9Phase) {
          s.setStrategyPhase("review_proposal");
        } else {
          s.setStrategyPhase("rationale_complete");
        }
        setPhaseError("Journey elaboration failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategicIntent, selectedContextIds, wizardContext, is9Phase]);

  // ─── Auto-start concept generation when entering step 4 ──
  useEffect(() => {
    if (strategyPhase === "rationale_complete" && !isGenerating && !autoStartedRef.current) {
      autoStartedRef.current = true;
      if (is9Phase) {
        handleGenerateHooks();
      } else {
        handleElaborate();
      }
    }
  }, [strategyPhase, isGenerating, is9Phase, handleGenerateHooks, handleElaborate]);

  // ─── Approve Concept → Assemble Blueprint ──────────────

  const handleApprove = useCallback(() => {
    const {
      synthesizedStrategy: strat,
      synthesizedArchitecture: arch,
      personaValidation: pv,
    } = useCampaignWizardStore.getState();

    if (!strat || !arch || !elaborateResult) return;

    const blueprint: CampaignBlueprint = {
      strategy: strat,
      architecture: arch,
      channelPlan: elaborateResult.channelPlan,
      assetPlan: elaborateResult.assetPlan,
      personaValidation: pv ?? [],
      confidence: 0,
      confidenceBreakdown: {},
      generatedAt: new Date().toISOString(),
      variantAScore,
      variantBScore,
      variantCScore,
      pipelineDuration: 0,
      modelsUsed: [],
    };

    const store = useCampaignWizardStore.getState();
    store.setBlueprintResult(blueprint);
    store.setStrategyPhase("complete");
  }, [elaborateResult, variantAScore, variantBScore, variantCScore]);

  // ─── Wire wizard Continue button to elaborate when in review_proposal ─────
  useEffect(() => {
    const store = useCampaignWizardStore.getState();
    if (strategyPhase === "review_proposal") {
      store.setStepProceedOverride(handleElaborate);
    } else {
      store.setStepProceedOverride(null);
    }
    return () => { store.setStepProceedOverride(null); };
  }, [strategyPhase, handleElaborate]);

  // ─── Render based on phase ─────────────────────────────

  // Entry: rationale_complete — auto-starts generation via useEffect above.
  // This screen is briefly visible before generation begins, or shown as retry on error.
  if (strategyPhase === "rationale_complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mb-4">
          <Palette className="w-8 h-8 text-violet-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Develop Creative Concept
        </h3>

        {phaseError ? (
          <>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {is9Phase
                ? "Generate creative hooks based on your behavioral science foundation, then refine the best one into a production-ready concept."
                : "Elaborate the approved strategy into a full channel plan and asset plan for your campaign."}
            </p>
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-sm mx-auto">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{phaseError}</p>
            </div>
            <Button
              variant="cta"
              size="lg"
              icon={Sparkles}
              onClick={() => {
                autoStartedRef.current = false;
                setPhaseError(null);
                if (is9Phase) {
                  handleGenerateHooks();
                } else {
                  handleElaborate();
                }
              }}
            >
              Try Again
            </Button>
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            Starting concept generation...
          </p>
        )}
      </div>
    );
  }

  // 9-Phase: Generating hooks
  if (strategyPhase === "generating_hooks" && isGenerating) {
    return (
      <PipelineProgressView
        title="Generating Creative Hooks"
        steps={HOOKS_STEPS}
        pipelineSteps={pipelineSteps}
        enrichmentStatus={enrichmentStatus}
        enrichmentBlockCount={enrichmentBlockCount}
        enrichmentSources={enrichmentSources}
      />
    );
  }

  // 9-Phase: Review hooks
  if (strategyPhase === "review_hooks" && hooks.length > 0) {
    return (
      <HookReviewView
        hooks={hooks}
        hookScores={hookScores}
        personaValidation={personaValidation ?? []}
        onSelectAndRefine={handleRefineHook}
        errorMessage={phaseError}
      />
    );
  }

  // 9-Phase: Generating proposal
  if (strategyPhase === "generating_proposal" && isGenerating) {
    return (
      <PipelineProgressView
        title="Refining Hook into Campaign Proposal"
        steps={PROPOSAL_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // 9-Phase: Review proposal
  if (strategyPhase === "review_proposal" && synthesizedStrategy && synthesizedArchitecture && refinedHookConcept) {
    return (
      <ProposalReviewView
        strategy={synthesizedStrategy}
        architecture={synthesizedArchitecture}
        hookConcept={refinedHookConcept}
        onElaborate={handleElaborate}
        errorMessage={phaseError}
      />
    );
  }

  // Both pipelines: Generating journey (elaborate)
  if (strategyPhase === "generating_journey" && isGenerating) {
    return (
      <PipelineProgressView
        title="Elaborating Campaign Journey"
        steps={ELABORATE_STEPS}
        pipelineSteps={pipelineSteps}
        enrichmentStatus={enrichmentStatus}
        enrichmentBlockCount={enrichmentBlockCount}
        enrichmentSources={enrichmentSources}
      />
    );
  }

  // Both pipelines: Concept review (elaborate complete, not yet approved)
  if (elaborateResult && !isGenerating && synthesizedStrategy && synthesizedArchitecture && strategyPhase !== "complete") {
    return (
      <ConceptReviewView
        strategy={synthesizedStrategy}
        architecture={synthesizedArchitecture}
        onApprove={handleApprove}
        errorMessage={phaseError}
      />
    );
  }

  // Complete — concept approved
  if (strategyPhase === "complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-primary-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Creative Concept Approved
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Your creative concept has been finalized. Continue to select deliverables for your campaign.
        </p>
      </div>
    );
  }

  // Fallback
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        The concept step encountered an unexpected state. Please go back to the Strategy step and try again.
      </p>
    </div>
  );
}

export default ConceptStep;
