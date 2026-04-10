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
  mineInsightsSSE,
  generateConceptsSSE,
  buildStrategySSE,
  creativeDebateSSE,
  elaborateJourneySSE,
} from "../../api/campaigns.api";
import type { PipelineStepStatus } from "../../types/campaign-wizard.types";
import type {
  StrategyLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  AssetPlanLayer,
  CampaignBlueprint,
  HumanInsight,
  CreativeConcept,
} from "@/lib/campaigns/strategy-blueprint.types";
import { PipelineProgressView } from "./PipelineProgressView";
import type { PipelineStepConfig } from "./PipelineProgressView";
import { InsightReviewView } from "./InsightReviewView";
import ConceptComparisonView from "./ConceptComparisonView";
import { ConceptReviewView } from "./ConceptReviewView";
import { compileStructuredFeedback } from "../../lib/compile-structured-feedback";

// ─── Pipeline Step Configs per Concept Phase ──────────────

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
  const concepts = useCampaignWizardStore((s) => s.concepts);
  const selectedConceptIndex = useCampaignWizardStore((s) => s.selectedConceptIndex);
  const setSelectedConcept = useCampaignWizardStore((s) => s.setSelectedConcept);

  // Strategy data (used by both pipelines after convergence)
  const synthesizedStrategy = useCampaignWizardStore((s) => s.synthesizedStrategy);
  const synthesizedArchitecture = useCampaignWizardStore((s) => s.synthesizedArchitecture);
  const personaValidation = useCampaignWizardStore((s) => s.personaValidation);

  // Enrichment indicators
  const enrichmentStatus = useCampaignWizardStore((s) => s.enrichmentStatus);
  const enrichmentBlockCount = useCampaignWizardStore((s) => s.enrichmentBlockCount);
  const enrichmentSources = useCampaignWizardStore((s) => s.enrichmentSources);
  const useExternalEnrichment = useCampaignWizardStore((s) => s.useExternalEnrichment);
  const pipelineConfig = useCampaignWizardStore((s) => s.pipelineConfig);



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

  // Cleanup SSE on unmount — deferred abort to survive React 19 dev double-invoke
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      autoStartedRef.current = false;
      setTimeout(() => {
        if (!isMountedRef.current) {
          abortRef.current?.abort();
        }
      }, 50);
    };
  }, []);

  // ─── Creative Pipeline: Mine Insights ─────────────────

  const handleMineInsights = useCallback(() => {
    const currentGenId = ++generationIdRef.current;
    const store = useCampaignWizardStore.getState();
    store.setIsGenerating(true);
    store.setStrategyPhase("mining_insights");
    store.updateStepStatus({ step: 1, name: "Insight Mining", status: "pending", label: "Mining insights..." });

    const { abort } = mineInsightsSSE(
      { workspaceId: "", wizardContext, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent, pipelineConfig },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "enrichment") {
          const status = data.status as "running" | "complete" | "skipped";
          useCampaignWizardStore.getState().setEnrichmentStatus(status, { totalBlocks: 0, queries: [], sources: {} });
          return;
        }
        if (data.type === "complete" && data.result) {
          const result = data.result as { insights: HumanInsight[] };
          const s = useCampaignWizardStore.getState();
          s.setInsightResults(result.insights);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_insights");
          return;
        }
        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          s.setStrategyPhase("rationale_complete");
          setPhaseError("Insight mining failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        useCampaignWizardStore.getState().setIsGenerating(false);
        useCampaignWizardStore.getState().setStrategyPhase("rationale_complete");
        setPhaseError("Insight mining failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent, pipelineConfig]);

  // ─── Creative Pipeline: Generate Concepts ─────────────

  const handleGenerateConcepts = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    const idx = store.selectedInsightIndex;
    if (idx === null) return;
    const selectedInsight = store.insights[idx];
    if (!selectedInsight) return;

    const currentGenId = ++generationIdRef.current;
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_concepts");
    store.updateStepStatus({ step: 1, name: "Creative Leap", status: "pending", label: "Generating concepts..." });

    // Include regeneration context if concepts were previously rejected
    const { failedConcepts: fc, regenerationBrief: rb } = useCampaignWizardStore.getState();
    const regenCtx = fc.length > 0 ? { feedback: rb, failedConcepts: fc } : undefined;

    const { abort } = generateConceptsSSE(
      { workspaceId: "", wizardContext, selectedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent, regenerationContext: regenCtx, pipelineConfig },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "complete" && data.result) {
          const result = data.result as { concepts: CreativeConcept[] };
          const s = useCampaignWizardStore.getState();
          s.setConceptResults(result.concepts);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_concepts");
          return;
        }
        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          s.setStrategyPhase("review_insights");
          setPhaseError("Concept generation failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        useCampaignWizardStore.getState().setIsGenerating(false);
        useCampaignWizardStore.getState().setStrategyPhase("review_insights");
        setPhaseError("Concept generation failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent, pipelineConfig]);

  // ─── Creative Pipeline: Build Strategy from Concept ─────

  const handleBuildStrategyFromConcept = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    const insightIdx = store.selectedInsightIndex;
    const conceptIdx = store.selectedConceptIndex;
    if (insightIdx === null || conceptIdx === null) return;
    const approvedConcept = store.creativeDebateResult?.improvedConcept ?? store.concepts[conceptIdx];
    const approvedInsight = store.insights[insightIdx];
    if (!approvedConcept || !approvedInsight) return;

    const currentGenId = ++generationIdRef.current;
    store.setIsGenerating(true);
    store.setStrategyPhase("building_strategy");
    store.updateStepStatus({ step: 1, name: "Strategy Build", status: "pending", label: "Building strategy..." });

    const { abort } = buildStrategySSE(
      { workspaceId: "", wizardContext, approvedConcept, approvedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent, pipelineConfig },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "complete" && data.result) {
          const result = data.result as { strategy: StrategyLayer; architecture: ArchitectureLayer };
          const s = useCampaignWizardStore.getState();
          s.setFinalStrategyResult(result);
          s.setIsGenerating(false);
          // After building strategy from concept, go to strategy review
          s.setStrategyPhase("review_final_strategy");
          return;
        }
        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          s.setStrategyPhase("review_concepts");
          setPhaseError("Strategy build failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        useCampaignWizardStore.getState().setIsGenerating(false);
        useCampaignWizardStore.getState().setStrategyPhase("review_concepts");
        setPhaseError("Strategy build failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent, pipelineConfig]);

  // ─── Creative Pipeline: Debate (critiqued mode only) ────
  //
  // When creativeRange === 'critiqued', the review_concepts Continue flow
  // runs a multi-round creative debate BEFORE building the final strategy.
  // On completion, the debate result is stored and handleBuildStrategyFromConcept
  // picks it up via store.creativeDebateResult?.improvedConcept.
  //
  // buildStrategyRef is used to avoid a circular useCallback dep between
  // debate and build-strategy. It always points to the latest version.

  const buildStrategyRef = useRef(handleBuildStrategyFromConcept);
  useEffect(() => {
    buildStrategyRef.current = handleBuildStrategyFromConcept;
  }, [handleBuildStrategyFromConcept]);

  const handleCreativeDebate = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    const insightIdx = store.selectedInsightIndex;
    const conceptIdx = store.selectedConceptIndex;
    if (insightIdx === null || conceptIdx === null) return;
    const selectedConcept = store.concepts[conceptIdx];
    const selectedInsight = store.insights[insightIdx];
    if (!selectedConcept || !selectedInsight) return;

    const currentGenId = ++generationIdRef.current;
    store.setIsGenerating(true);
    store.setStrategyPhase("creative_debate");
    store.updateStepStatus({ step: 1, name: "Creative Debate", status: "pending", label: "AI critic and defender refining concept..." });

    const { abort } = creativeDebateSSE(
      { workspaceId: "", wizardContext, selectedConcept, selectedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent, pipelineConfig },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "complete" && data.result) {
          const s = useCampaignWizardStore.getState();
          s.setCreativeDebateResult(data.result as Parameters<typeof s.setCreativeDebateResult>[0]);
          // Chain into build-strategy which will pick up improvedConcept
          buildStrategyRef.current();
          return;
        }
        if (data.type === "error") {
          // Fall back to building strategy without debate refinement
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          buildStrategyRef.current();
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        // Network error — fall through to build-strategy without debate
        useCampaignWizardStore.getState().setIsGenerating(false);
        buildStrategyRef.current();
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent, pipelineConfig]);

  // Dispatch handler for the review_concepts Continue button:
  // - critiqued mode runs the debate first (then chains to build-strategy)
  // - all other modes go straight to build-strategy
  const handleConceptProceed = useCallback(() => {
    if (pipelineConfig.creativeRange === 'critiqued') {
      const hasDebate = useCampaignWizardStore.getState().creativeDebateResult !== null;
      if (!hasDebate) {
        handleCreativeDebate();
        return;
      }
    }
    handleBuildStrategyFromConcept();
  }, [pipelineConfig.creativeRange, handleCreativeDebate, handleBuildStrategyFromConcept]);

  // ─── Elaborate Journey ──────────────────────────────────

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
        pipelineConfig,
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
          s.setStrategyPhase("review_final_strategy");
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
        s.setStrategyPhase("review_final_strategy");
        setPhaseError("Journey elaboration failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategicIntent, selectedContextIds, wizardContext, pipelineConfig]);

  // ─── Auto-start creative pipeline when entering step 4 ──
  useEffect(() => {
    if (strategyPhase === "rationale_complete" && !isGenerating && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // creativeRange 'single' skips insight mining and goes directly to a
      // lightweight single concept. 'multi-variant' and 'critiqued' both
      // start with insight mining; 'critiqued' additionally runs the debate
      // rounds after concept selection (handled by handleBuildStrategy).
      if (pipelineConfig.creativeRange === 'single') {
        handleGenerateConcepts();
      } else {
        handleMineInsights();
      }
    }
  }, [strategyPhase, isGenerating, handleMineInsights, handleGenerateConcepts, pipelineConfig.creativeRange]);

  // ─── Regenerate Concepts with Feedback ──────────────────
  const handleRegenerateConcepts = useCallback(async () => {
    const st = useCampaignWizardStore.getState();
    const { concepts: curConcepts, pipelineAttempt } = st;
    if (pipelineAttempt >= 2) return; // Max 2 attempts
    const feedback = curConcepts.map((c) =>
      `Concept "${c.campaignLine}" (${c.goldenbergTemplate}): stickiness ${c.stickinessScore?.total ?? 'N/A'}/10`
    ).join('\n');
    st.setPipelineAttempt(pipelineAttempt + 1);
    st.setRegenerationBrief(feedback);
    curConcepts.forEach(c => {
      st.addFailedConcept(c.campaignLine, 'Low stickiness score, not selected by user');
    });
    handleGenerateConcepts();
  }, [handleGenerateConcepts]);

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
      variantAScore: 0,
      variantBScore: 0,
      variantCScore: 0,
      pipelineDuration: 0,
      modelsUsed: [],
    };

    const store = useCampaignWizardStore.getState();
    store.setBlueprintResult(blueprint);
    store.setStrategyPhase("complete");
  }, [elaborateResult]);

  // ─── Wire wizard Continue button for concept step phases ─────
  useEffect(() => {
    const store = useCampaignWizardStore.getState();
    if (strategyPhase === "review_insights") {
      store.setStepProceedOverride(handleGenerateConcepts);
    } else if (strategyPhase === "review_concepts") {
      // Dispatch handler routes to creative debate first when critiqued,
      // or straight to build-strategy otherwise.
      store.setStepProceedOverride(handleConceptProceed);
    } else if (strategyPhase === "review_final_strategy" && elaborateResult) {
      // Blueprint assembly, not re-elaboration
      store.setStepProceedOverride(handleApprove);
    } else if (strategyPhase === "review_final_strategy") {
      store.setStepProceedOverride(handleElaborate);
    } else {
      store.setStepProceedOverride(null);
    }
    return () => { store.setStepProceedOverride(null); };
  }, [strategyPhase, handleGenerateConcepts, handleConceptProceed, handleElaborate, handleApprove, elaborateResult]);

  // ─── Render based on phase ─────────────────────────────

  // Entry: rationale_complete — auto-starts insight mining via useEffect above.
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
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-sm mx-auto">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{phaseError}</p>
            </div>
            <Button variant="cta" size="lg" icon={Sparkles} onClick={() => { autoStartedRef.current = false; setPhaseError(null); handleMineInsights(); }}>
              Try Again
            </Button>
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-2">Starting insight mining...</p>
        )}
      </div>
    );
  }

  // ─── Creative Quality Pipeline Phases (moved from StrategyStep) ─────

  // Mining insights (spinner)
  if (strategyPhase === "mining_insights" && isGenerating) {
    return (
      <PipelineProgressView
        title="Mining Human Insights"
        steps={[{ step: 1, name: "Insight Mining", label: "Mining insights from 3 AI perspectives...", description: "Three AI models analyze your brand, audience, and market from empathy, tension, and behavioral lenses." }]}
        pipelineSteps={pipelineSteps}
        enrichmentStatus={enrichmentStatus}
        enrichmentBlockCount={enrichmentBlockCount}
        enrichmentSources={enrichmentSources}
      />
    );
  }

  // Review insights (VOTE 1)
  if (strategyPhase === "review_insights") {
    return <InsightReviewView />;
  }

  // Generating concepts (spinner)
  if (strategyPhase === "generating_concepts" && isGenerating) {
    return (
      <PipelineProgressView
        title="Generating Creative Concepts"
        steps={[{ step: 1, name: "Creative Leap", label: "Generating creative concepts...", description: "Creating 3 distinctive campaign concepts using Goldenberg creativity templates and cross-domain bisociation." }]}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Review concepts (VOTE 2)
  if (strategyPhase === "review_concepts") {
    return (
      <>
        <ConceptComparisonView
          concepts={concepts}
          selectedIndex={selectedConceptIndex}
          onSelect={(index) => setSelectedConcept(index)}
          onRegenerate={handleRegenerateConcepts}
          isRegenerating={isGenerating}
        />
      </>
    );
  }

  // Building strategy from concept (spinner)
  if (strategyPhase === "building_strategy" && isGenerating) {
    return (
      <PipelineProgressView
        title="Building Concept-Driven Strategy"
        steps={[{ step: 1, name: "Strategy Build", label: "Building strategy around your concept...", description: "Applying marketing frameworks to make your creative concept strategically robust." }]}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Review final strategy (leads to elaborate)
  if (strategyPhase === "review_final_strategy") {
    const store = useCampaignWizardStore.getState();
    const fs = store.finalStrategy;
    const fa = store.finalArchitecture;
    if (fs && fa) {
      return (
        <ConceptReviewView
          strategy={fs}
          architecture={fa}
          onApprove={() => handleElaborate()}
          errorMessage={phaseError}
        />
      );
    }
  }

  // Generating journey (elaborate)
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

  // Concept review (elaborate complete, not yet approved)
  if (elaborateResult && !isGenerating && synthesizedStrategy && synthesizedArchitecture && strategyPhase !== "complete") {
    return (
      <ConceptReviewView
        strategy={synthesizedStrategy}
        architecture={synthesizedArchitecture}
        onApprove={handleApprove}
        onRefine={() => {
          // Re-elaborate with current feedback to refine the concept
          setPhaseError(null);
          handleElaborate();
        }}
        errorMessage={phaseError}
      />
    );
  }

  // Complete — concept approved, show brief confirmation
  if (strategyPhase === "complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Creative concept approved</span>
        </div>
        <p className="text-xs text-gray-500">Click Continue to select deliverables for your campaign.</p>
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
