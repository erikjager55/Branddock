"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Target,
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
  improveBriefingApi,
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
    name: "Briefing Validator",
    label: "Validating campaign briefing...",
    description: "AI evaluates briefing completeness, strategic clarity, and identifies gaps.",
  },
];

const PHASE_FOUNDATION_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Context Enrichment",
    label: "Enriching with behavioral science context...",
    description: "Fetches BCT, CASI, MINDSPACE, and external research data to build a behavioral foundation.",
  },
  {
    step: 2,
    name: "Strategy Foundation Builder",
    label: "Building strategy foundation...",
    description: "Constructs a behavioral science-driven strategy foundation with ELM routing and audience insights.",
  },
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
    <div className="border border-teal-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-teal-50/50 hover:bg-teal-50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-teal-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-teal-500" />
        )}
        <BarChart3 className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-medium text-teal-900">
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
                  className="inline-flex items-center px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs text-teal-700"
                  title={`${kpi.description}${kpi.benchmark ? ` — Benchmark: ${kpi.benchmark}` : ''}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1 text-teal-500" />
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
  const [isImprovingBriefing, setIsImprovingBriefing] = useState(false);
  const isImprovingRef = useRef(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      isImprovingRef.current = false;
    };
  }, []);

  const wizardContext = useMemo(() => ({
    campaignName: campaignName || "Untitled Campaign",
    campaignDescription,
    campaignGoalType: campaignGoalType ?? undefined,
    briefing: {
      occasion: briefingOccasion || undefined,
      audienceObjective: briefingAudienceObjective || undefined,
      coreMessage: briefingCoreMessage || undefined,
      tonePreference: briefingTonePreference || undefined,
      constraints: briefingConstraints || undefined,
    },
  }), [campaignName, campaignDescription, campaignGoalType, briefingOccasion, briefingAudienceObjective, briefingCoreMessage, briefingTonePreference, briefingConstraints]);

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
    // Reset improving state in case improve is in-flight
    isImprovingRef.current = false;
    setIsImprovingBriefing(false);
    setPhaseError(null);
    const store = useCampaignWizardStore.getState();
    store.setStrategyPhase("idle");
    store.setIsGenerating(false);
    store.setCurrentStep(1);
  }, []);

  // ─── Improve Briefing with AI ─────────────────────

  const handleImproveBriefing = useCallback(async () => {
    // Double-click guard using ref (state would be stale in the closure)
    if (isImprovingRef.current) return;
    const store = useCampaignWizardStore.getState();
    const currentValidation = store.briefingValidation;
    if (!currentValidation) return;

    isImprovingRef.current = true;
    setIsImprovingBriefing(true);
    setPhaseError(null);
    try {
      const improved = await improveBriefingApi({
        validation: currentValidation,
        strategicIntent,
        wizardContext,
      });

      // If user navigated away (e.g. clicked Edit Manually) while API was
      // in-flight, isImprovingRef was reset — bail out to avoid orphaned mutations
      if (!isImprovingRef.current) return;

      // Update store briefing fields with AI-improved values
      const s = useCampaignWizardStore.getState();
      s.setBriefingOccasion(improved.occasion);
      s.setBriefingAudienceObjective(improved.audienceObjective);
      s.setBriefingCoreMessage(improved.coreMessage);
      s.setBriefingTonePreference(improved.tonePreference);
      s.setBriefingConstraints(improved.constraints);

      // Abort any existing SSE stream before starting re-validation
      abortRef.current?.abort();
      abortRef.current = null;

      // Clear old validation and transition directly to validating phase
      // (skip idle to avoid visual flash)
      s.setBriefingValidation(null);
      setIsImprovingBriefing(false);

      // Re-validate with fresh briefing values by reading directly from store
      // (avoids stale closure on wizardContext/handleValidateBriefing)
      const fresh = useCampaignWizardStore.getState();
      const freshWizardContext = {
        campaignName: fresh.name || "Untitled Campaign",
        campaignDescription: fresh.description,
        campaignGoalType: fresh.campaignGoalType ?? undefined,
        briefing: {
          occasion: fresh.briefingOccasion || undefined,
          audienceObjective: fresh.briefingAudienceObjective || undefined,
          coreMessage: fresh.briefingCoreMessage || undefined,
          tonePreference: fresh.briefingTonePreference || undefined,
          constraints: fresh.briefingConstraints || undefined,
        },
      };

      const currentGenId = ++generationIdRef.current;
      fresh.resetPipeline();
      fresh.setIsGenerating(true);
      fresh.setStrategyPhase("validating_briefing");

      for (const step of PHASE_VALIDATE_STEPS) {
        fresh.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
      }

      // Read strategicIntent fresh from store (same pattern as freshWizardContext)
      const freshIntent = fresh.strategicIntent;

      const { abort } = validateBriefingSSE(
        {
          strategicIntent: freshIntent,
          personaIds: selectedContextIds.personaIds,
          productIds: selectedContextIds.productIds,
          competitorIds: selectedContextIds.competitorIds,
          trendIds: selectedContextIds.trendIds,
          wizardContext: freshWizardContext,
        },
        (event) => {
          if (generationIdRef.current !== currentGenId) return;
          const data = event as Record<string, unknown>;
          if (data.type === "complete" && data.result) {
            isImprovingRef.current = false;
            const result = data.result as import("@/lib/campaigns/strategy-blueprint.types").BriefingValidation;
            const st = useCampaignWizardStore.getState();
            st.setBriefingValidation(result);
            st.setIsGenerating(false);
            st.setStrategyPhase("review_briefing");
            return;
          }
          if (data.type === "error") {
            isImprovingRef.current = false;
            const st = useCampaignWizardStore.getState();
            st.setPipelineError((data.error as string) || "Briefing validation failed");
            st.setIsGenerating(false);
            st.setStrategyPhase("idle");
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
          isImprovingRef.current = false;
          const st = useCampaignWizardStore.getState();
          st.setPipelineError(error);
          st.setIsGenerating(false);
          st.setStrategyPhase("idle");
        },
      );
      abortRef.current = { abort };
    } catch (error) {
      isImprovingRef.current = false;
      setIsImprovingBriefing(false);
      const message = error instanceof Error ? error.message : "Failed to improve briefing";
      setPhaseError(message);
    }
  }, [strategicIntent, wizardContext, selectedContextIds]);

  // ─── Restart ─────────────────────────────────────────

  const handleRestart = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationIdRef.current++;
    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setStrategyPhase("idle");
    store.setBlueprintResult(null);
    store.clearPhaseData();
  }, []);

  // ─── Render based on phase ───────────────────────────

  // Pre-generation CTA
  if (strategyPhase === "idle" && !isGenerating && !pipelineError) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generate Campaign Strategy
        </h3>
        <p className="text-sm text-gray-500 mb-2 max-w-sm mx-auto">
          Our AI will validate your briefing, build a behavioral science foundation,
          generate creative hooks, and refine the best one into a production-ready strategy.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          You&apos;ll review each phase and guide the AI towards an Effie-worthy campaign concept.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button variant="cta" size="lg" icon={Sparkles} onClick={handleValidateBriefing}>
            Start Strategy Generation
          </Button>
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
            onClick={handleGenerateVariants}
          >
            Use legacy 3-variant flow
          </button>
        </div>
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
        onProceed={handleBuildFoundation}
        onRevise={handleEditBriefing}
        onImproveWithAI={handleImproveBriefing}
        isImproving={isImprovingBriefing}
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

  // 9-Phase: Review Strategy Foundation
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

  // Phase A: Generating variants
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

  // Rationale approved — confirmation screen
  if (strategyPhase === "rationale_complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Strategic Rationale Approved
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Your strategic rationale has been reviewed and approved. Continue to the Concept step to develop the creative concept.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button variant="ghost" size="sm" icon={Sparkles} onClick={handleRestart}>
            Start Over
          </Button>
        </div>
      </div>
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
