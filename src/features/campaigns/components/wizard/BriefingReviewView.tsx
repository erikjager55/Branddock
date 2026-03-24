"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Pencil,
  ArrowRight,
  Loader2,
  Plus,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import type { BriefingValidation } from "../../types/campaign-wizard.types";
import type { CampaignBriefing } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ──────────────────────────────────────────────

interface BriefingReviewViewProps {
  validation: BriefingValidation;
  onProceed: () => void;
  onRevise: () => void;
  onImproveWithAI: () => void;
  isImproving?: boolean;
  error?: string | null;
  briefing: {
    occasion: string;
    audienceObjective: string;
    coreMessage: string;
    tonePreference: string;
    constraints: string;
  };
  onBriefingChange: (field: keyof CampaignBriefing, value: string) => void;
  onRevalidate: () => void;
}

// ─── Severity helpers ───────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { label: "Critical", variant: "danger" as const, icon: AlertTriangle },
  recommended: { label: "Recommended", variant: "warning" as const, icon: Info },
  "nice-to-have": { label: "Nice to have", variant: "default" as const, icon: Info },
} as const;

// ─── Field mapping ──────────────────────────────────────

type BriefingField = keyof CampaignBriefing;

const FIELD_KEYWORDS: { keywords: string[]; field: BriefingField }[] = [
  { keywords: ["occasion", "why now", "trigger"], field: "occasion" },
  { keywords: ["audience", "think", "feel", "do", "objective"], field: "audienceObjective" },
  { keywords: ["core message", "message", "takeaway"], field: "coreMessage" },
  { keywords: ["tone", "creative direction", "direction"], field: "tonePreference" },
  { keywords: ["constraint", "mandatory", "limitation", "budget"], field: "constraints" },
];

const FIELD_LABELS: Record<BriefingField, string> = {
  occasion: "Occasion / Why Now",
  audienceObjective: "Audience Objective",
  coreMessage: "Core Message",
  tonePreference: "Tone & Creative Direction",
  constraints: "Constraints & Mandatories",
};

function mapGapToField(gapField: string): BriefingField | null {
  const lower = gapField.toLowerCase();
  for (const entry of FIELD_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.field;
    }
  }
  return null;
}

// ─── Component ──────────────────────────────────────────

export function BriefingReviewView({
  validation,
  onProceed,
  onRevise,
  onImproveWithAI,
  isImproving = false,
  error = null,
  briefing,
  onBriefingChange,
  onRevalidate,
}: BriefingReviewViewProps) {
  const [showGaps, setShowGaps] = React.useState(true);
  const [showEditor, setShowEditor] = React.useState(false);
  const [appliedGaps, setAppliedGaps] = React.useState<Set<number>>(new Set());
  const [hasEdited, setHasEdited] = React.useState(false);

  const scoreColor =
    validation.overallScore >= 80
      ? "text-emerald-600"
      : validation.overallScore >= 60
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    validation.overallScore >= 80
      ? "bg-emerald-50 border-emerald-200"
      : validation.overallScore >= 60
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  const hasCriticalGaps = validation.gaps.some((g) => g.severity === "critical");

  const handleFieldChange = (field: BriefingField, value: string) => {
    onBriefingChange(field, value);
    setHasEdited(true);
  };

  const handleApplyGap = (gapIndex: number, suggestion: string, targetField: BriefingField) => {
    onBriefingChange(targetField, suggestion);
    setAppliedGaps((prev) => new Set(prev).add(gapIndex));
    setShowEditor(true);
    setHasEdited(true);
  };

  const handleRevalidate = () => {
    setHasEdited(false);
    setAppliedGaps(new Set());
    onRevalidate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Briefing Validation
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          AI has evaluated your campaign briefing for completeness and strategic
          clarity.
        </p>
      </div>

      {/* Score Card */}
      <div className={`rounded-xl border p-6 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Briefing Score</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>
              {validation.overallScore}
              <span className="text-lg text-gray-400">/100</span>
            </p>
          </div>
          <div className="text-right">
            {validation.isComplete ? (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Incomplete
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Strengths */}
      {validation.strengths.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Strengths</h4>
          <ul className="space-y-1.5">
            {validation.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {validation.gaps.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => setShowGaps(!showGaps)}
          >
            Gaps ({validation.gaps.length})
            {showGaps ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showGaps && (
            <div className="space-y-2">
              {validation.gaps.map((gap, i) => {
                const config = SEVERITY_CONFIG[gap.severity];
                const Icon = config.icon;
                const targetField = mapGapToField(gap.field);
                const isApplied = appliedGaps.has(i);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      isApplied
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {isApplied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800">
                          {gap.field}
                        </span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{gap.suggestion}</p>
                      {/* Apply button or Knowledge step label */}
                      {targetField ? (
                        <button
                          type="button"
                          disabled={isApplied || isImproving}
                          onClick={() => handleApplyGap(i, gap.suggestion, targetField)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50 disabled:cursor-default"
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Applied to {FIELD_LABELS[targetField]}
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Apply to {FIELD_LABELS[targetField]}
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400">
                          <BookOpen className="w-3 h-3" />
                          Managed via Knowledge step
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inline Briefing Editor */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          onClick={() => setShowEditor(!showEditor)}
        >
          <Pencil className="w-3.5 h-3.5" />
          {showEditor ? "Hide Briefing Fields" : "Show Briefing Fields"}
          {showEditor ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showEditor && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            {(Object.keys(FIELD_LABELS) as BriefingField[]).map((field) => (
              <div key={field}>
                <label
                  htmlFor={`briefing-${field}`}
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  {FIELD_LABELS[field]}
                </label>
                <textarea
                  id={`briefing-${field}`}
                  value={briefing[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  disabled={isImproving}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none disabled:opacity-50 resize-none"
                  placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}...`}
                />
              </div>
            ))}
            {hasEdited && (
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={handleRevalidate}
                  disabled={isImproving}
                  size="sm"
                >
                  Re-validate Briefing
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Suggestions for Improvement
          </h4>
          <ul className="space-y-1.5">
            {validation.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error feedback */}
      {error && !isImproving && (
        <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {/* AI Improving indicator */}
      {isImproving && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-violet-50 border border-violet-200">
          <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
          <span className="text-sm font-medium text-violet-700">
            AI is improving your briefing...
          </span>
        </div>
      )}

      {/* Actions — 3 options */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          icon={Pencil}
          onClick={onRevise}
          disabled={isImproving}
        >
          Edit Manually
        </Button>
        <Button
          variant="secondary"
          icon={isImproving ? Loader2 : Sparkles}
          onClick={onImproveWithAI}
          disabled={isImproving}
        >
          {isImproving ? "Improving..." : "Improve with AI"}
        </Button>
        <Button
          variant="primary"
          icon={ArrowRight}
          onClick={onProceed}
          disabled={isImproving}
        >
          {hasCriticalGaps
            ? "Proceed Anyway"
            : "Build Strategy Foundation"}
        </Button>
      </div>
    </div>
  );
}
