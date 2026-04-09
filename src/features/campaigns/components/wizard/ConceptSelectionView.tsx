"use client";

import React, { useState } from "react";
import {
  Wand2,
  Check,
  Quote,
  Eye,
  Repeat2,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Puzzle,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { CreativeConcept, StickinessScore } from "@/lib/campaigns/strategy-blueprint.types";

/** Safely extract pass value from both boolean and evidence-based test result formats */
function tp(val: boolean | { pass: boolean; evidence?: string }): boolean {
  return typeof val === 'object' && val !== null ? val.pass : Boolean(val);
}

// ─── Stickiness Score Display ──────────────────────────────

const STICKINESS_LABELS: Array<{ key: keyof Omit<StickinessScore, 'total'>; label: string; shortLabel: string }> = [
  { key: "simple", label: "Simple", shortLabel: "S" },
  { key: "unexpected", label: "Unexpected", shortLabel: "U" },
  { key: "concrete", label: "Concrete", shortLabel: "C" },
  { key: "credible", label: "Credible", shortLabel: "C" },
  { key: "emotional", label: "Emotional", shortLabel: "E" },
  { key: "story", label: "Story", shortLabel: "S" },
];

function StickinessBar({ score }: { score: StickinessScore }) {
  return (
    <div className="flex items-center gap-1">
      {STICKINESS_LABELS.map(({ key, label }) => {
        const value = score[key] ?? 0;
        const color = value >= 8 ? "bg-emerald-500" : value >= 6 ? "bg-amber-400" : "bg-red-400";
        return (
          <div key={key} className="flex flex-col items-center gap-0.5" title={`${label}: ${value}/10`}>
            <div className="w-6 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{label.charAt(0)}</span>
          </div>
        );
      })}
      <span className="ml-2 text-sm font-semibold text-gray-700">{score.total?.toFixed(1) ?? "–"}</span>
    </div>
  );
}

// ─── Campaign Line Tests ────────────────────────────────────

function CampaignLineTestBadges({ tests }: { tests: CreativeConcept["campaignLineTests"] }) {
  if (!tests) return null;
  const items = [
    { key: "barTest", label: "Bar", passes: tp(tests.barTest) },
    { key: "tShirtTest", label: "T-Shirt", passes: tp(tests.tShirtTest) },
    { key: "parodyTest", label: "Parody", passes: tp(tests.parodyTest) },
    { key: "tenYearTest", label: "10-Year", passes: tp(tests.tenYearTest) },
    { key: "categoryEscapeTest", label: "Category Escape", passes: tp(tests.categoryEscapeTest) },
    { key: "oppositeTest", label: "Opposite", passes: tp(tests.oppositeTest) },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(({ key, label, passes }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            passes
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {passes ? <Check className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />}
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Concept Card ───────────────────────────────────────────

interface ConceptCardProps {
  concept: CreativeConcept;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function ConceptCard({ concept, index, isSelected, onSelect }: ConceptCardProps) {
  const [expanded, setExpanded] = useState(false);

  const templateLabel = (concept.goldenbergTemplate ?? "").replace(/_/g, " ");

  return (
    <div
      className={`relative rounded-xl border-2 transition-all ${
        isSelected
          ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Selection header */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left p-5 pb-3"
      >
        {isSelected && (
          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Template + Domain badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
            <Puzzle className="h-3 w-3" />
            {templateLabel}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="h-3 w-3" />
            {concept.bisociationDomain?.domain ?? "–"}
          </span>
        </div>

        {/* Campaign line — BIG */}
        <h4 className="text-xl font-bold text-gray-900 mb-2">
          &ldquo;{concept.campaignLine}&rdquo;
        </h4>

        {/* Big idea */}
        <p className="text-sm text-gray-700 mb-3">{concept.bigIdea}</p>

        {/* Stickiness scores */}
        <StickinessBar score={concept.stickinessScore} />
      </button>

      {/* Expand/collapse details */}
      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="space-y-3 text-sm">
            {/* Visual world */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase">Visual World</span>
              </div>
              <p className="text-gray-700">{concept.visualWorld}</p>
            </div>

            {/* Memorable device */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Memorable Device</span>
              </div>
              <p className="text-gray-700 font-medium">{concept.memorableDevice}</p>
            </div>

            {/* Bisociation connection */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Repeat2 className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Bisociation Connection</span>
              </div>
              <p className="text-gray-600">{concept.bisociationDomain?.connectionToInsight}</p>
            </div>

            {/* Template application */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Puzzle className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Template Application</span>
              </div>
              <p className="text-gray-600">{concept.goldenbergApplication}</p>
            </div>

            {/* Campaign line tests */}
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase">Campaign Line Tests</span>
              <div className="mt-1">
                <CampaignLineTestBadges tests={concept.campaignLineTests} />
              </div>
            </div>

            {/* Extendability */}
            {concept.extendability?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Extendability</span>
                <ul className="mt-1 space-y-0.5">
                  {concept.extendability.map((ext, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5">→</span>
                      {ext}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────

interface ConceptSelectionViewProps {
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

/**
 * Displays 3 creative concepts for the user to select one (Vote 2).
 * Each concept uses a different Goldenberg template + bisociation domain.
 */
export function ConceptSelectionView({ onRegenerate, isRegenerating }: ConceptSelectionViewProps) {
  const concepts = useCampaignWizardStore((s) => s.concepts);
  const selectedIndex = useCampaignWizardStore((s) => s.selectedConceptIndex);
  const setSelectedConcept = useCampaignWizardStore((s) => s.setSelectedConcept);
  const selectedInsight = useCampaignWizardStore((s) => {
    const idx = s.selectedInsightIndex;
    return idx !== null ? s.insights[idx] : null;
  });

  if (concepts.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Wand2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Choose the Creative Concept</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Three concepts built on your chosen insight, each using a different creative template and connecting to a different world.
          </p>
        </div>
      </div>

      {/* Selected insight reminder */}
      {selectedInsight && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-start gap-2">
          <Quote className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs font-medium text-gray-500">Building on insight:</span>
            <p className="text-sm text-gray-700 font-medium">&ldquo;{selectedInsight.insightStatement}&rdquo;</p>
          </div>
        </div>
      )}

      {/* 3 Concept cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {concepts.map((concept, index) => (
          <ConceptCard
            key={index}
            concept={concept}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={() => setSelectedConcept(selectedIndex === index ? null : index)}
          />
        ))}
      </div>

      {/* Feedback */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Optional: feedback for the creative debate
        </label>
        <textarea
          placeholder="e.g., 'I love the campaign line of Concept A but the visual world of Concept C. The memorable device in Concept B is strongest.'"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          rows={2}
          onKeyDown={(e) => e.stopPropagation()}
        />

        {onRegenerate && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Regenerating..." : "None of these — regenerate with different templates"}
          </Button>
        )}
      </div>
    </div>
  );
}
