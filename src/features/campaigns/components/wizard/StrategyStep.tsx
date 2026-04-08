"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Target,
  Check,
  ChevronDown,
  ChevronRight,
  Palette,
  BarChart3,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useWizardKnowledge } from "../../hooks";
import {
  generateVariantsSSE,
  synthesizeStrategySSE,
  validateBriefingSSE,
  buildFoundationSSE,
  mineInsightsSSE,
  generateConceptsSSE,
  creativeDebateSSE,
  buildStrategySSE,
} from "../../api/campaigns.api";
import type { PipelineStepStatus } from "../../types/campaign-wizard.types";
import { PipelineProgressView } from "./PipelineProgressView";
import type { PipelineStepConfig } from "./PipelineProgressView";
import { VariantReviewView } from "./VariantReviewView";
import { SynthesisReviewView } from "./SynthesisReviewView";
import { BriefingReviewView } from "./BriefingReviewView";
import { StrategyFoundationReviewView } from "./StrategyFoundationReviewView";
import { compileStructuredFeedback } from "../../lib/compile-structured-feedback";
import { getGoalTypeStrategicInsights } from "../../lib/goal-types";
import type { GoalTypeStrategicInsights } from "../../lib/goal-types";
import { InsightReviewView } from "./InsightReviewView";
import { ConceptSelectionView } from "./ConceptSelectionView";
import type { HumanInsight, CreativeConcept } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Pipeline Step Configs per Phase ────────────────────

const PHASE_A_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Triple Full Variants",
    label: "Generating strategy variants A, B & C...",
    description: "Three independent AI models each generate a complete strategy + campaign journey variant with deep thinking.",
  },
  {
    step: 2,
    name: "Persona Validator",
    label: "Validating with personas...",
    description: "Each persona evaluates all three variants on relevance, engagement potential, and emotional resonance.",
  },
];

const PHASE_B_STEPS: PipelineStepConfig[] = [
  {
    step: 4,
    name: "Strategy Synthesizer",
    label: "Synthesizing optimal strategy...",
    description: "Merges the strongest elements from all three variants into one optimal campaign strategy.",
  },
];

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

// ─── Creative Quality Pipeline Step Configs ─────────────────

const PHASE_INSIGHT_STEPS: PipelineStepConfig[] = [
  { step: 1, name: "Insight Mining", label: "Mining 3 human insights...", description: "Three AI models each mine a deep human truth from your brand context, personas, and market trends." },
];

const PHASE_CONCEPT_STEPS: PipelineStepConfig[] = [
  { step: 1, name: "Creative Leap", label: "Generating 3 creative concepts...", description: "Each concept uses a different Goldenberg creativity template and connects to a different world via bisociation." },
];

const PHASE_DEBATE_STEPS: PipelineStepConfig[] = [
  { step: 1, name: "Creative Critic", label: "Evaluating creative quality...", description: "A creative auditor evaluates stickiness, bisociation strength, and campaign line quality." },
  { step: 2, name: "Creative Defense", label: "Creative Director improving concept...", description: "The creative director defends or improves the concept based on critique." },
];

const PHASE_BUILD_STRATEGY_STEPS: PipelineStepConfig[] = [
  { step: 1, name: "Strategy Build", label: "Building strategy from approved concept...", description: "Constructing strategic infrastructure and campaign architecture on top of the approved creative concept." },
];

// ─── Are.na Enrichment Indicator ────────────────────────────

function ArenaEnrichmentBadge({ totalBlocks, queriesUsed }: { totalBlocks: number; queriesUsed: string[] }) {
  const [showQueries, setShowQueries] = React.useState(false);

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs text-violet-700">
      <Palette className="w-3.5 h-3.5" />
      <span>{totalBlocks} cultural references from Are.na</span>
      <button
        type="button"
        onClick={() => setShowQueries(!showQueries)}
        className="ml-0.5 text-violet-400 hover:text-violet-600 transition-colors"
        title="Show search queries"
      >
        {showQueries ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {showQueries && (
        <span className="text-violet-500 ml-1">
          {queriesUsed.map(q => `"${q}"`).join(", ")}
        </span>
      )}
    </div>
  );
}

// ─── Goal Insights Preview ──────────────────────────────────

function GoalInsightsPreview({ insights }: { insights: GoalTypeStrategicInsights }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { awareness, consideration, conversion, retention } = insights.funnelEmphasis;
  const funnelSegments = [
    { label: 'Awareness', pct: awareness, color: 'bg-blue-400' },
    { label: 'Consideration', pct: consideration, color: 'bg-amber-400' },
    { label: 'Conversion', pct: conversion, color: 'bg-emerald-500' },
    { label: 'Retention', pct: retention, color: 'bg-violet-400' },
  ];

  return (
    <div className="border border-primary-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-primary-50/50 hover:bg-primary-50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-primary-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-primary-500" />
        )}
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary-900">
          Strategic Framework: {insights.label}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-4">
          {/* KPI pills */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Recommended KPIs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {insights.recommendedKPIs.map((kpi) => (
                <span
                  key={kpi.name}
                  className="inline-flex items-center px-2.5 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs text-primary-700"
                  title={`${kpi.description}${kpi.benchmark ? ` — Benchmark: ${kpi.benchmark}` : ''}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1 text-primary-500" />
                  {kpi.name}
                </span>
              ))}
            </div>
          </div>

          {/* Channel emphasis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Primary Channels
              </p>
              <div className="flex flex-wrap gap-1">
                {insights.channelEmphasis.primary.map((ch) => (
                  <span key={ch} className="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                    <Megaphone className="w-3 h-3 mr-1 text-emerald-500" />
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Secondary Channels
              </p>
              <div className="flex flex-wrap gap-1">
                {insights.channelEmphasis.secondary.map((ch) => (
                  <span key={ch} className="inline-flex items-center px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Funnel allocation bar */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Funnel Allocation
            </p>
            <div className="flex h-3 rounded-full overflow-hidden">
              {funnelSegments.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${seg.pct}%` }}
                  title={`${seg.label}: ${seg.pct}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {funnelSegments.map((seg) => (
                <span key={seg.label} className="text-[10px] text-muted-foreground">
                  {seg.label} {seg.pct}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
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
  const pipelineSteps = useCampaignWizardStore((s) => s.pipelineSteps);
  const pipelineError = useCampaignWizardStore((s) => s.pipelineError);
  const selectedKnowledgeIds = useCampaignWizardStore((s) => s.selectedKnowledgeIds);
  const strategyPhase = useCampaignWizardStore((s) => s.strategyPhase);

  // Phase data
  const strategyLayerA = useCampaignWizardStore((s) => s.strategyLayerA);
  const strategyLayerB = useCampaignWizardStore((s) => s.strategyLayerB);
  const strategyLayerC = useCampaignWizardStore((s) => s.strategyLayerC);
  const variantA = useCampaignWizardStore((s) => s.variantA);
  const variantB = useCampaignWizardStore((s) => s.variantB);
  const variantC = useCampaignWizardStore((s) => s.variantC);
  const personaValidation = useCampaignWizardStore((s) => s.personaValidation);
  const variantAScore = useCampaignWizardStore((s) => s.variantAScore);
  const variantBScore = useCampaignWizardStore((s) => s.variantBScore);
  const variantCScore = useCampaignWizardStore((s) => s.variantCScore);
  const synthesizedStrategy = useCampaignWizardStore((s) => s.synthesizedStrategy);
  const synthesizedArchitecture = useCampaignWizardStore((s) => s.synthesizedArchitecture);
  const arenaEnrichment = useCampaignWizardStore((s) => s.arenaEnrichment);
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

  const goalInsights = useMemo(
    () => (campaignGoalType ? getGoalTypeStrategicInsights(campaignGoalType) : null),
    [campaignGoalType],
  );

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

  // ─── Phase A: Generate Variants ──────────────────────

  const handleGenerateVariants = useCallback(() => {
    if (!campaignGoalType) return;
    const currentGenId = ++generationIdRef.current;

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_variants");

    // Initialize steps as pending
    for (const step of PHASE_A_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = generateVariantsSSE(
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

        // Enrichment events (Are.na, Exa, Scholar, BCT context enrichment)
        if (data.type === "enrichment") {
          const status = data.status;
          if (status !== 'running' && status !== 'complete' && status !== 'skipped') return;
          useCampaignWizardStore.getState().setEnrichmentStatus(
            status,
            {
              totalBlocks: typeof data.totalBlocks === 'number' ? data.totalBlocks : 0,
              queries: Array.isArray(data.queries) ? data.queries as string[] : [],
              sources: (data.sources && typeof data.sources === 'object' ? data.sources : {}) as { arena?: number; exa?: number; scholar?: number; bct?: boolean },
            },
          );
          return;
        }

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            strategyLayerA: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            strategyLayerB: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            strategyLayerC: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            variantA: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
            variantB: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
            variantC: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
            personaValidation: import("@/lib/campaigns/strategy-blueprint.types").PersonaValidationResult[];
            variantAScore: number;
            variantBScore: number;
            variantCScore: number;
            arenaEnrichment: import("@/lib/campaigns/strategy-blueprint.types").ArenaEnrichmentTracking | null;
          };
          const s = useCampaignWizardStore.getState();
          s.setVariantResults(result);

          s.setIsGenerating(false);
          s.setStrategyPhase("review_variants");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError((data.error as string) || "An unexpected error occurred");
          s.setIsGenerating(false);
          s.setStrategyPhase("idle");
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
        s.setPipelineError(error);
        s.setIsGenerating(false);
        s.setStrategyPhase("idle");
      },
    );
    abortRef.current = { abort };
  }, [campaignGoalType, strategicIntent, selectedContextIds, wizardContext]);

  // ─── Phase B: Synthesize Strategy ────────────────────

  const handleSynthesize = useCallback(() => {
    if (!strategyLayerA || !strategyLayerB || !strategyLayerC || !variantA || !variantB || !variantC) return;
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_synthesis");

    for (const step of PHASE_B_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { endorsedPersonaIds, strategyRatings, variantFeedback: currentFeedback } = useCampaignWizardStore.getState();
    const compiledFeedback = compileStructuredFeedback({
      freeText: currentFeedback,
      endorsedPersonaIds,
      strategyRatings,
      personaValidation: personaValidation ?? [],
    });

    const { abort } = synthesizeStrategySSE(
      {
        variantFeedback: compiledFeedback,
        strategyLayerA,
        strategyLayerB,
        strategyLayerC,
        variantA,
        variantB,
        variantC,
        personaValidation: personaValidation ?? [],
        variantAScore,
        variantBScore,
        variantCScore,
        wizardContext,
        strategicIntent,
      },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            strategy: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            architecture: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
          };
          const s = useCampaignWizardStore.getState();
          s.setSynthesisResult(result);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_synthesis");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_variants");
          setPhaseError("Synthesis failed. Please adjust your feedback and try again.");
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
        s.setStrategyPhase("review_variants");
        setPhaseError("Synthesis failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [strategyLayerA, strategyLayerB, strategyLayerC, variantA, variantB, variantC, personaValidation, variantAScore, variantBScore, variantCScore, wizardContext, strategicIntent]);

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

  // ─── Creative Pipeline: Mine Insights ─────────────────

  const handleMineInsights = useCallback(() => {
    const currentGenId = ++generationIdRef.current;
    const store = useCampaignWizardStore.getState();
    store.setIsGenerating(true);
    store.setStrategyPhase("mining_insights");
    store.updateStepStatus({ step: 1, name: "Insight Mining", status: "pending", label: "Mining insights..." });

    const { abort } = mineInsightsSSE(
      { workspaceId: "", wizardContext, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent },
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
          s.setStrategyPhase("review_strategy");
          setPhaseError("Insight mining failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        const s = useCampaignWizardStore.getState();
        s.setIsGenerating(false);
        s.setStrategyPhase("review_strategy");
        setPhaseError("Insight mining failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent]);

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

    const { abort } = generateConceptsSSE(
      { workspaceId: "", wizardContext, selectedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent },
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
        const s = useCampaignWizardStore.getState();
        s.setIsGenerating(false);
        s.setStrategyPhase("review_insights");
        setPhaseError("Concept generation failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent]);

  // ─── Creative Pipeline: Creative Debate ────────────────

  const handleCreativeDebate = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    const insightIdx = store.selectedInsightIndex;
    const conceptIdx = store.selectedConceptIndex;
    if (insightIdx === null || conceptIdx === null) return;
    const selectedInsight = store.insights[insightIdx];
    const selectedConcept = store.concepts[conceptIdx];
    if (!selectedInsight || !selectedConcept) return;

    const currentGenId = ++generationIdRef.current;
    store.setIsGenerating(true);
    store.setStrategyPhase("creative_debate");

    for (const step of PHASE_DEBATE_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = creativeDebateSSE(
      { workspaceId: "", wizardContext, selectedConcept, selectedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "complete" && data.result) {
          const result = data.result as { critique: unknown; defense: unknown; improvedConcept: CreativeConcept };
          const s = useCampaignWizardStore.getState();
          s.setCreativeDebateResult(result);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_debate");
          return;
        }
        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          s.setStrategyPhase("review_concepts");
          setPhaseError("Creative debate failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        const s = useCampaignWizardStore.getState();
        s.setIsGenerating(false);
        s.setStrategyPhase("review_concepts");
        setPhaseError("Creative debate failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent]);

  // ─── Creative Pipeline: Build Strategy from Concept ─────

  const handleBuildStrategyFromConcept = useCallback(() => {
    const store = useCampaignWizardStore.getState();
    const insightIdx = store.selectedInsightIndex;
    const conceptIdx = store.selectedConceptIndex;
    if (insightIdx === null || conceptIdx === null) return;

    // Use improved concept from debate if available, otherwise use selected concept
    const debateResult = store.creativeDebateResult;
    const approvedConcept = debateResult?.improvedConcept ?? store.concepts[conceptIdx];
    const approvedInsight = store.insights[insightIdx];
    if (!approvedConcept || !approvedInsight) return;

    const currentGenId = ++generationIdRef.current;
    store.setIsGenerating(true);
    store.setStrategyPhase("building_strategy");
    store.updateStepStatus({ step: 1, name: "Strategy Build", status: "pending", label: "Building strategy..." });

    const { abort } = buildStrategySSE(
      { workspaceId: "", wizardContext, approvedConcept, approvedInsight, personaIds: selectedContextIds.personaIds, productIds: selectedContextIds.productIds, competitorIds: selectedContextIds.competitorIds, trendIds: selectedContextIds.trendIds, strategicIntent },
      (event) => {
        if (generationIdRef.current !== currentGenId) return;
        const data = event as Record<string, unknown>;
        if (data.type === "complete" && data.result) {
          const result = data.result as { strategy: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer; architecture: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer };
          const s = useCampaignWizardStore.getState();
          s.setFinalStrategyResult(result);
          s.setIsGenerating(false);
          s.setStrategyPhase("rationale_complete");
          return;
        }
        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setIsGenerating(false);
          s.setStrategyPhase("review_debate");
          setPhaseError("Strategy build failed. Please try again.");
          return;
        }
        if (data.step && data.name && data.status && data.label) {
          useCampaignWizardStore.getState().updateStepStatus({ step: data.step as number, name: data.name as string, status: data.status as PipelineStepStatus, label: data.label as string });
        }
      },
      () => {
        if (generationIdRef.current !== currentGenId) return;
        const s = useCampaignWizardStore.getState();
        s.setIsGenerating(false);
        s.setStrategyPhase("review_debate");
        setPhaseError("Strategy build failed due to a network error.");
      },
    );
    abortRef.current = { abort };
  }, [wizardContext, selectedContextIds, strategicIntent]);

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

  // Strategy step complete — waiting for user to click Continue to go to Concept step
  if (strategyPhase === "rationale_complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Strategy Foundation Complete</h3>
        <p className="text-sm text-gray-500">Click Continue to develop the creative concept.</p>
      </div>
    );
  }

  // ─── Legacy Pipeline Render Cases (kept for backward compat) ─────────────

  // Mining insights (spinner)
  if (strategyPhase === "mining_insights" && isGenerating) {
    return (
      <PipelineProgressView
        title="Mining Human Insights"
        steps={PHASE_INSIGHT_STEPS}
        pipelineSteps={pipelineSteps}
        enrichmentStatus={enrichmentStatus}
        enrichmentBlockCount={enrichmentBlockCount}
        enrichmentSources={enrichmentSources}
      />
    );
  }

  // Review insights (Vote 1)
  if (strategyPhase === "review_insights") {
    return (
      <InsightReviewView
        onRegenerate={handleMineInsights}
        isRegenerating={isGenerating}
      />
    );
  }

  // Generating concepts (spinner)
  if (strategyPhase === "generating_concepts" && isGenerating) {
    return (
      <PipelineProgressView
        title="Generating Creative Concepts"
        steps={PHASE_CONCEPT_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Review concepts (Vote 2)
  if (strategyPhase === "review_concepts") {
    return (
      <ConceptSelectionView
        onRegenerate={handleGenerateConcepts}
        isRegenerating={isGenerating}
      />
    );
  }

  // Creative debate (spinner)
  if (strategyPhase === "creative_debate" && isGenerating) {
    return (
      <PipelineProgressView
        title="Creative Quality Debate"
        steps={PHASE_DEBATE_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Review debate results (Vote 3)
  if (strategyPhase === "review_debate") {
    const store = useCampaignWizardStore.getState();
    const debateResult = store.creativeDebateResult;
    const originalIdx = store.selectedConceptIndex;
    const original = originalIdx !== null ? store.concepts[originalIdx] : null;
    const improved = debateResult?.improvedConcept;

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Creative Debate Complete</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              A creative critic reviewed your concept and a creative director improved it. Review the changes and proceed.
            </p>
          </div>
        </div>

        {/* Before/After comparison */}
        {original && improved && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <Badge variant="default" className="mb-2">Original</Badge>
              <h4 className="text-lg font-bold text-gray-700">&ldquo;{original.campaignLine}&rdquo;</h4>
              <p className="text-sm text-gray-500 mt-1">{original.memorableDevice}</p>
            </div>
            <div className="border-2 border-teal-400 rounded-lg p-4 bg-teal-50/30">
              <Badge variant="teal" className="mb-2">Improved</Badge>
              <h4 className="text-lg font-bold text-gray-900">&ldquo;{improved.campaignLine}&rdquo;</h4>
              <p className="text-sm text-gray-700 mt-1">{improved.memorableDevice}</p>
            </div>
          </div>
        )}

        {phaseError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{phaseError}</div>
        )}
      </div>
    );
  }

  // Building strategy from concept (spinner)
  if (strategyPhase === "building_strategy" && isGenerating) {
    return (
      <PipelineProgressView
        title="Building Strategy from Concept"
        steps={PHASE_BUILD_STRATEGY_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Phase A: Generating variants (legacy)
  if (strategyPhase === "generating_variants" && isGenerating) {
    return (
      <div className="space-y-4">
        <PipelineProgressView
          title="Generating Strategy Variants"
          steps={PHASE_A_STEPS}
          pipelineSteps={pipelineSteps}
          enrichmentStatus={enrichmentStatus}
          enrichmentBlockCount={enrichmentBlockCount}
          enrichmentSources={enrichmentSources}
        />
        {goalInsights && <GoalInsightsPreview insights={goalInsights} />}
      </div>
    );
  }

  // Phase A result: Review variants
  if (strategyPhase === "review_variants" && strategyLayerA && strategyLayerB && strategyLayerC && variantA && variantB && variantC) {
    return (
      <div className="space-y-3">
        {goalInsights && <GoalInsightsPreview insights={goalInsights} />}
        {arenaEnrichment && arenaEnrichment.totalBlocks > 0 && (
          <ArenaEnrichmentBadge totalBlocks={arenaEnrichment.totalBlocks} queriesUsed={arenaEnrichment.queries} />
        )}
        <VariantReviewView
          strategyLayerA={strategyLayerA}
          strategyLayerB={strategyLayerB}
          strategyLayerC={strategyLayerC}
          variantA={variantA}
          variantB={variantB}
          variantC={variantC}
          personaValidation={personaValidation ?? []}
          variantAScore={variantAScore}
          variantBScore={variantBScore}
          variantCScore={variantCScore}
          onSynthesize={handleSynthesize}
          errorMessage={phaseError}
        />
      </div>
    );
  }

  // Phase B: Generating synthesis
  if (strategyPhase === "generating_synthesis" && isGenerating) {
    return (
      <PipelineProgressView
        title="Synthesizing Definitive Strategy"
        steps={PHASE_B_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Phase B result: Review synthesis
  if (strategyPhase === "review_synthesis" && synthesizedStrategy && synthesizedArchitecture) {
    return (
      <SynthesisReviewView
        synthesizedStrategy={synthesizedStrategy}
        synthesizedArchitecture={synthesizedArchitecture}
        onElaborate={() => {
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
