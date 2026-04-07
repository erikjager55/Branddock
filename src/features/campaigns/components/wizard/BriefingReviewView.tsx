"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Pencil,
  Loader2,
  Plus,
  RotateCcw,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import type { BriefingValidation } from "../../types/campaign-wizard.types";
import type { CampaignBriefing } from "@/lib/campaigns/strategy-blueprint.types";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { improveBriefingApi } from "../../api/campaigns.api";

// ─── Types ──────────────────────────────────────────────

interface BriefingReviewViewProps {
  validation: BriefingValidation;
  onRevise: () => void;
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
  isRevalidating?: boolean;
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
  { keywords: ["tone", "creative direction"], field: "tonePreference" },
  { keywords: ["constraint", "mandatory", "limitation", "budget"], field: "constraints" },
];

const FIELD_LABELS: Record<BriefingField, string> = {
  occasion: "Occasion / Why Now",
  audienceObjective: "Audience Objective",
  coreMessage: "Core Message",
  tonePreference: "Tone & Creative Direction",
  constraints: "Constraints & Mandatories",
};

// ─── Local score estimator ──────────────────────────────

const FIELD_WEIGHTS: { field: BriefingField; weight: number }[] = [
  { field: "occasion", weight: 20 },
  { field: "audienceObjective", weight: 25 },
  { field: "coreMessage", weight: 25 },
  { field: "tonePreference", weight: 15 },
  { field: "constraints", weight: 15 },
];

function estimateBriefingScore(briefing: Record<BriefingField, string>): number {
  let total = 0;
  for (const { field, weight } of FIELD_WEIGHTS) {
    const len = (briefing[field] ?? "").trim().length;
    if (len === 0) continue;
    if (len < 20) total += weight * 0.3;
    else if (len < 50) total += weight * 0.5;
    else if (len < 100) total += weight * 0.7;
    else if (len < 200) total += weight * 0.85;
    else total += weight;
  }
  return Math.min(100, Math.round(total));
}

// ─── Field mapping helpers ──────────────────────────────

function mapGapToField(gapField: string | undefined | null): BriefingField | null {
  if (!gapField) return null;
  const lower = gapField.toLowerCase();
  for (const entry of FIELD_KEYWORDS) {
    if (entry.keywords.some((kw) => {
      // Use word-boundary regex to avoid substring false positives
      // e.g. "do" should not match inside "domain" or "window"
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return regex.test(lower);
    })) {
      return entry.field;
    }
  }
  return null;
}

// ─── Component ──────────────────────────────────────────

export function BriefingReviewView({
  validation,
  onRevise,
  error = null,
  briefing,
  onBriefingChange,
  onRevalidate,
  isRevalidating = false,
}: BriefingReviewViewProps) {
  const [showGaps, setShowGaps] = React.useState(true);
  const [showEditor, setShowEditor] = React.useState(true);
  const [appliedGaps, setAppliedGaps] = React.useState<Set<number>>(new Set());
  const [appliedSuggestions, setAppliedSuggestions] = React.useState<Set<number>>(new Set());
  const [hasEdited, setHasEdited] = React.useState(false);
  const [isImprovingWithAI, setIsImprovingWithAI] = React.useState(false);
  const [improveError, setImproveError] = React.useState<string | null>(null);

  // Local score: use AI score as baseline, switch to estimate when fields are edited
  const aiScore = validation.overallScore ?? 0;
  const estimatedScore = estimateBriefingScore(briefing);
  const score = hasEdited ? Math.max(aiScore, estimatedScore) : aiScore;

  // Sync local score back to store so canProceed() works with the updated score
  React.useEffect(() => {
    if (hasEdited && score !== aiScore) {
      const store = useCampaignWizardStore.getState();
      const current = store.briefingValidation;
      if (current && current.overallScore !== score) {
        store.setBriefingValidation({ ...current, overallScore: score });
      }
    }
  }, [hasEdited, score, aiScore]);

  const scoreColor =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    score >= 80
      ? "bg-emerald-50 border-emerald-200"
      : score >= 60
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  const handleFieldChange = (field: BriefingField, value: string) => {
    onBriefingChange(field, value);
    setHasEdited(true);
  };

  /** Use AI to improve ALL briefing fields based on validation gaps and suggestions */
  const handleImproveWithAI = async () => {
    setIsImprovingWithAI(true);
    setImproveError(null);
    try {
      const store = useCampaignWizardStore.getState();
      const improved = await improveBriefingApi({
        validation,
        strategicIntent: store.strategicIntent,
        wizardContext: {
          campaignName: store.name || 'Untitled Campaign',
          campaignDescription: store.description || undefined,
          campaignGoalType: store.campaignGoalType ?? undefined,
          briefing: {
            occasion: briefing.occasion,
            audienceObjective: briefing.audienceObjective,
            coreMessage: briefing.coreMessage,
            tonePreference: briefing.tonePreference,
            constraints: briefing.constraints,
          },
        },
      });

      // Apply all improved fields
      if (improved.occasion) onBriefingChange('occasion', improved.occasion);
      if (improved.audienceObjective) onBriefingChange('audienceObjective', improved.audienceObjective);
      if (improved.coreMessage) onBriefingChange('coreMessage', improved.coreMessage);
      if (improved.tonePreference) onBriefingChange('tonePreference', improved.tonePreference);
      if (improved.constraints) onBriefingChange('constraints', improved.constraints);

      // Mark all gaps as applied
      const allGapIndices = new Set(validation.gaps.map((_, i) => i));
      setAppliedGaps(allGapIndices);
      setShowEditor(true);
      setHasEdited(true);
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : 'Failed to improve briefing');
    } finally {
      setIsImprovingWithAI(false);
    }
  };


  const handleRevalidate = () => {
    setHasEdited(false);
    setAppliedGaps(new Set());
    setAppliedSuggestions(new Set());
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
              {score}
              <span className="text-lg text-gray-400">/100</span>
            </p>
            {hasEdited && (
              <p className="text-xs text-gray-400 mt-0.5">Estimated — re-validate for AI score</p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-1.5">
            {validation.isComplete && !hasEdited ? (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : hasEdited ? (
              <Badge variant="info">
                <Pencil className="w-3 h-3 mr-1" />
                Edited
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

      {/* Inline Briefing Editor — positioned after score for immediate visibility */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
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
          <Button
            variant="secondary"
            icon={Pencil}
            onClick={onRevise}
            disabled={isRevalidating}
            size="sm"
          >
            Edit Manually
          </Button>
        </div>
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
                  disabled={isRevalidating}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none disabled:opacity-50 resize-none"
                  placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}...`}
                />
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <Button
                variant={hasEdited ? "primary" : "secondary"}
                icon={RotateCcw}
                onClick={handleRevalidate}
                disabled={isRevalidating}
                size="sm"
              >
                Re-validate with AI
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Strengths */}
      {(validation.strengths ?? []).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Strengths</h4>
          <ul className="space-y-1.5">
            {(validation.strengths ?? []).map((s, i) => (
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
      {(validation.gaps ?? []).length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => setShowGaps(!showGaps)}
          >
            Gaps ({(validation.gaps ?? []).length})
            {showGaps ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showGaps && (
            <div className="space-y-2">
              {(validation.gaps ?? []).map((gap, i) => {
                const config = SEVERITY_CONFIG[gap.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG["nice-to-have"];
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
                          {gap.field ?? "General"}
                        </span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{gap.suggestion}</p>
                      {/* Field mapping indicator */}
                      {targetField ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
                          {isApplied ? (
                            <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Improved</>
                          ) : (
                            <>{FIELD_LABELS[targetField]}</>
                          )}
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
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

      {/* Suggestions — with apply buttons for field-matched suggestions */}
      {(validation.suggestions ?? []).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Suggestions for Improvement
          </h4>
          <div className="space-y-2">
            {(validation.suggestions ?? []).map((s, i) => {
              const targetField = mapGapToField(s);
              const isApplied = appliedSuggestions.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    isApplied
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-blue-100 bg-blue-50/50"
                  }`}
                >
                  {isApplied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">{s}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
                      {isApplied ? (
                        <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Improved</>
                      ) : targetField ? (
                        <>{FIELD_LABELS[targetField]}</>
                      ) : (
                        <>General suggestion</>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Improve Button — single action to improve all fields based on gaps */}
      {validation.gaps.length > 0 && !appliedGaps.size && (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="cta"
            icon={isImprovingWithAI ? Loader2 : Sparkles}
            onClick={handleImproveWithAI}
            disabled={isImprovingWithAI || isRevalidating}
          >
            {isImprovingWithAI ? 'Improving briefing...' : 'Improve Briefing with AI'}
          </Button>
          <p className="text-xs text-gray-400">AI will rewrite all fields to address the gaps above</p>
          {improveError && (
            <p className="text-xs text-red-600">{improveError}</p>
          )}
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {/* Revalidation indicator */}
      {isRevalidating && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary-50 border border-primary-200">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm font-medium text-primary-700">
            Re-validating your briefing...
          </span>
        </div>
      )}

      {/* Score gate hint */}
      {score < 80 && (
        <p className="text-xs text-gray-500 text-center pt-2">
          Score must be at least 80/100 to continue
        </p>
      )}
    </div>
  );
}
