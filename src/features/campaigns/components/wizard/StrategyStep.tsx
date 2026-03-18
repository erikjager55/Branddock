"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Target,
  Layers,
  Share2,
  FileText,
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
  elaborateJourneySSE,
} from "../../api/campaigns.api";
import type { PipelineStep, PipelineStepStatus } from "../../types/campaign-wizard.types";
import type { StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";
import { PipelineProgressView } from "./PipelineProgressView";
import type { PipelineStepConfig } from "./PipelineProgressView";
import { VariantReviewView } from "./VariantReviewView";
import { SynthesisReviewView } from "./SynthesisReviewView";
import { compileStructuredFeedback } from "../../lib/compile-structured-feedback";
import { getGoalTypeStrategicInsights } from "../../lib/goal-types";
import type { GoalTypeStrategicInsights } from "../../lib/goal-types";

/** Extract display text from a strategic choice (string or object) */
function getChoiceText(choice: string | StrategicChoice): string {
  return typeof choice === "string" ? choice : choice.choice;
}

// ─── Pipeline Step Configs per Phase ────────────────────

const PHASE_A_STEPS: PipelineStepConfig[] = [
  {
    step: 1,
    name: "Dual Full Variants",
    label: "Generating strategy variants A & B...",
    description: "Two independent AI models each generate a complete strategy + campaign journey variant.",
  },
  {
    step: 2,
    name: "Persona Validator",
    label: "Validating with personas...",
    description: "Each persona evaluates both variants on relevance, engagement potential, and emotional resonance.",
  },
];

const PHASE_B_STEPS: PipelineStepConfig[] = [
  {
    step: 4,
    name: "Strategy Synthesizer",
    label: "Synthesizing optimal strategy...",
    description: "Merges the strongest elements from both variants into one optimal campaign strategy.",
  },
];

const PHASE_C_STEPS: PipelineStepConfig[] = [
  {
    step: 5,
    name: "Channel Planner",
    label: "Planning channel strategy...",
    description: "Maps the right channels and media to each journey phase.",
  },
  {
    step: 6,
    name: "Asset Planner",
    label: "Creating asset plan...",
    description: "Creates a concrete deliverable plan with content types and creative briefs.",
  },
];

// ─── Collapsible Preview Section ─────────────────────────

function CollapsiblePreview({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
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
  const variantA = useCampaignWizardStore((s) => s.variantA);
  const variantB = useCampaignWizardStore((s) => s.variantB);
  const personaValidation = useCampaignWizardStore((s) => s.personaValidation);
  const variantAScore = useCampaignWizardStore((s) => s.variantAScore);
  const variantBScore = useCampaignWizardStore((s) => s.variantBScore);
  const synthesizedStrategy = useCampaignWizardStore((s) => s.synthesizedStrategy);
  const synthesizedArchitecture = useCampaignWizardStore((s) => s.synthesizedArchitecture);
  const synthesisFeedback = useCampaignWizardStore((s) => s.synthesisFeedback);
  const blueprintResult = useCampaignWizardStore((s) => s.blueprintResult);
  const arenaEnrichment = useCampaignWizardStore((s) => s.arenaEnrichment);
  const enrichmentStatus = useCampaignWizardStore((s) => s.enrichmentStatus);
  const enrichmentBlockCount = useCampaignWizardStore((s) => s.enrichmentBlockCount);

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

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
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

        // Enrichment events (Are.na creative inspiration)
        if (data.type === "enrichment") {
          useCampaignWizardStore.getState().setEnrichmentStatus(
            data.status as 'running' | 'complete' | 'skipped',
            { totalBlocks: (data.totalBlocks as number) ?? 0, queries: (data.queries as string[]) ?? [] },
          );
          return;
        }

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            strategyLayerA: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            strategyLayerB: import("@/lib/campaigns/strategy-blueprint.types").StrategyLayer;
            variantA: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
            variantB: import("@/lib/campaigns/strategy-blueprint.types").ArchitectureLayer;
            personaValidation: import("@/lib/campaigns/strategy-blueprint.types").PersonaValidationResult[];
            variantAScore: number;
            variantBScore: number;
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
    if (!strategyLayerA || !strategyLayerB || !variantA || !variantB) return;
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
        variantA,
        variantB,
        personaValidation: personaValidation ?? [],
        variantAScore,
        variantBScore,
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
  }, [strategyLayerA, strategyLayerB, variantA, variantB, personaValidation, variantAScore, variantBScore, wizardContext, strategicIntent]);

  // ─── Phase C: Elaborate Journey ──────────────────────

  const handleElaborate = useCallback(() => {
    if (!synthesizedStrategy || !synthesizedArchitecture) return;
    const currentGenId = ++generationIdRef.current;
    setPhaseError(null);

    const store = useCampaignWizardStore.getState();
    store.resetPipeline();
    store.setIsGenerating(true);
    store.setStrategyPhase("generating_journey");

    for (const step of PHASE_C_STEPS) {
      store.updateStepStatus({ step: step.step, name: step.name, status: "pending", label: step.label });
    }

    const { abort } = elaborateJourneySSE(
      {
        synthesisFeedback: synthesisFeedback,
        synthesizedStrategy,
        synthesizedArchitecture,
        personaValidation: personaValidation ?? [],
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

        if (data.type === "complete" && data.result) {
          const result = data.result as {
            channelPlan: import("@/lib/campaigns/strategy-blueprint.types").ChannelPlanLayer;
            assetPlan: import("@/lib/campaigns/strategy-blueprint.types").AssetPlanLayer;
          };

          // Assemble the complete blueprint from all 3 phases
          const s = useCampaignWizardStore.getState();
          if (!s.synthesizedStrategy || !s.synthesizedArchitecture) {
            s.setPipelineError("Strategy data was lost. Please restart generation.");
            s.setIsGenerating(false);
            s.setStrategyPhase("idle");
            return;
          }
          const blueprint: import("@/lib/campaigns/strategy-blueprint.types").CampaignBlueprint = {
            strategy: s.synthesizedStrategy,
            architecture: s.synthesizedArchitecture,
            channelPlan: result.channelPlan,
            assetPlan: result.assetPlan,
            personaValidation: s.personaValidation ?? [],
            confidence: 0, // Calculated server-side on launch
            confidenceBreakdown: {},
            generatedAt: new Date().toISOString(),
            variantAScore: s.variantAScore,
            variantBScore: s.variantBScore,
            pipelineDuration: 0,
            modelsUsed: [],
            contextSelection: {
              personaIds: selectedContextIds.personaIds,
              productIds: selectedContextIds.productIds,
              competitorIds: selectedContextIds.competitorIds,
              trendIds: selectedContextIds.trendIds,
            },
          };

          s.setBlueprintResult(blueprint);
          s.setIsGenerating(false);
          s.setStrategyPhase("complete");
          return;
        }

        if (data.type === "error") {
          const s = useCampaignWizardStore.getState();
          s.setPipelineError(null);
          s.setIsGenerating(false);
          s.setStrategyPhase("review_synthesis");
          setPhaseError("Journey elaboration failed. Please adjust your feedback and try again.");
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
        s.setStrategyPhase("review_synthesis");
        setPhaseError("Journey elaboration failed due to a network error. Please try again.");
      },
    );
    abortRef.current = { abort };
  }, [synthesizedStrategy, synthesizedArchitecture, personaValidation, synthesisFeedback, wizardContext, selectedContextIds, strategicIntent]);

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
          Generate Strategy Variants
        </h3>
        <p className="text-sm text-gray-500 mb-2 max-w-sm mx-auto">
          Our AI will analyze your brand context and generate two independent strategy variants
          for you to review and refine.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          You&apos;ll review the variants, provide feedback, and guide the AI to a final strategy.
        </p>
        <Button variant="cta" size="lg" icon={Sparkles} onClick={handleGenerateVariants}>
          Generate Strategy Variants
        </Button>
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
        />
        {goalInsights && <GoalInsightsPreview insights={goalInsights} />}
      </div>
    );
  }

  // Phase A result: Review variants
  if (strategyPhase === "review_variants" && strategyLayerA && strategyLayerB && variantA && variantB) {
    return (
      <div className="space-y-3">
        {goalInsights && <GoalInsightsPreview insights={goalInsights} />}
        {arenaEnrichment && arenaEnrichment.totalBlocks > 0 && (
          <ArenaEnrichmentBadge totalBlocks={arenaEnrichment.totalBlocks} queriesUsed={arenaEnrichment.queries} />
        )}
        <VariantReviewView
          strategyLayerA={strategyLayerA}
          strategyLayerB={strategyLayerB}
          variantA={variantA}
          variantB={variantB}
          personaValidation={personaValidation ?? []}
          variantAScore={variantAScore}
          variantBScore={variantBScore}
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
        onElaborate={handleElaborate}
        errorMessage={phaseError}
      />
    );
  }

  // Phase C: Generating journey
  if (strategyPhase === "generating_journey" && isGenerating) {
    return (
      <PipelineProgressView
        title="Elaborating Customer Journey"
        steps={PHASE_C_STEPS}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  // Complete: Show full blueprint preview
  if (strategyPhase === "complete" && blueprintResult) {
    const { strategy, architecture, channelPlan, assetPlan } = blueprintResult;

    return (
      <div className="space-y-5">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Sparkles} onClick={handleRestart}>
            Start Over
          </Button>
          {arenaEnrichment && arenaEnrichment.totalBlocks > 0 && (
            <ArenaEnrichmentBadge totalBlocks={arenaEnrichment.totalBlocks} queriesUsed={arenaEnrichment.queries} />
          )}
        </div>

        {/* Blueprint layer previews — 2 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Strategy Summary */}
          <CollapsiblePreview title="Campaign Strategy" icon={Target} defaultOpen>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Theme</p>
                <p className="text-sm font-medium text-gray-900">{strategy.campaignTheme}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Positioning</p>
                <p className="text-sm text-gray-700">{strategy.positioningStatement}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Strategic Intent</p>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Strategic Choices</p>
                  <ul className="space-y-1">
                    {strategy.strategicChoices.slice(0, 3).map((choice, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">&#8226;</span>
                        {getChoiceText(choice)}
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
                <Badge variant="default">{architecture.campaignType}</Badge>
                <span className="text-xs text-muted-foreground">
                  {architecture.journeyPhases.length} journey phase{architecture.journeyPhases.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {architecture.journeyPhases.reduce((sum, p) => sum + p.touchpoints.length, 0)} touchpoints
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {architecture.journeyPhases.map((phase, i) => (
                  <div key={phase.id ?? `phase-${i}`} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
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
                  <div key={channel.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs">
                    <span className="font-medium text-gray-900">{channel.name}</span>
                    <Badge variant={channel.role === "hero" ? "success" : channel.role === "hub" ? "info" : "default"}>
                      {channel.role}
                    </Badge>
                  </div>
                ))}
              </div>
              {channelPlan.timingStrategy && (
                <p className="text-xs text-muted-foreground">{channelPlan.timingStrategy}</p>
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
                    <Badge key={priority} variant={priority === "must-have" ? "success" : priority === "should-have" ? "warning" : "default"}>
                      {count} {priority}
                    </Badge>
                  );
                })}
              </div>
              {assetPlan.prioritySummary && (
                <p className="text-xs text-muted-foreground">{assetPlan.prioritySummary}</p>
              )}
            </div>
          </CollapsiblePreview>
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
