"use client";

import React from "react";
import {
  Sparkles,
  Lightbulb,
  Eye,
  Palette,
  Megaphone,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type {
  CreativeHook,
  PersonaValidationResult,
} from "../../types/campaign-wizard.types";

// ─── Types ──────────────────────────────────────────────

interface HookReviewViewProps {
  hooks: CreativeHook[];
  hookScores: number[];
  personaValidation: PersonaValidationResult[];
  onSelectAndRefine: () => void;
  errorMessage?: string | null;
}

// ─── Score Color ─────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-50 border-emerald-200";
  if (score >= 6) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

const HOOK_LABELS = ["A", "B", "C"];
const HOOK_COLORS = [
  "border-blue-200 bg-blue-50",
  "border-purple-200 bg-purple-50",
  "border-amber-200 bg-amber-50",
];
const HOOK_ACCENT = ["text-blue-700", "text-purple-700", "text-amber-700"];

// ─── Hook Card ──────────────────────────────────────────

function HookCard({
  hook,
  index,
  score,
  isSelected,
  onSelect,
  feedback,
  onFeedbackChange,
}: {
  hook: CreativeHook;
  index: number;
  score: number;
  isSelected: boolean;
  onSelect: () => void;
  feedback: string;
  onFeedbackChange: (v: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const label = HOOK_LABELS[index] ?? String(index + 1);

  return (
    <div
      className={`rounded-xl border-2 p-5 transition-all cursor-pointer ${
        isSelected
          ? "border-teal-400 ring-2 ring-teal-100 bg-teal-50/30"
          : `${HOOK_COLORS[index] ?? "border-gray-200 bg-gray-50"} hover:border-gray-300`
      }`}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              isSelected
                ? "bg-teal-600 text-white"
                : `bg-white border border-gray-200 ${HOOK_ACCENT[index] ?? "text-gray-700"}`
            }`}
          >
            {label}
          </span>
          <span className="text-sm font-medium text-gray-800">
            {hook.hookConcept.hookTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">{hook.creativeAngleName}</Badge>
          <span className={`text-lg font-bold ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Big Idea */}
      <p className="text-sm text-gray-700 mb-3">
        {hook.hookConcept.bigIdea}
      </p>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{hook.hookConcept.creativeInsight}</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Megaphone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{hook.hookConcept.campaignLine}</span>
        </div>
      </div>

      {/* Expandable detail */}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        {expanded ? "Less detail" : "More detail"}
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">
                Visual Direction
              </p>
              <p className="text-gray-600">
                {hook.hookConcept.visualDirection}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Palette className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">Tone</p>
              <p className="text-gray-600">
                {hook.hookConcept.toneOfVoice}
              </p>
            </div>
          </div>
          {hook.hookConcept.extendability.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Extendability
              </p>
              <div className="flex flex-wrap gap-1">
                {hook.hookConcept.extendability.map((e, i) => (
                  <Badge key={i} variant="default">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500 italic">
            Model: {hook.providerUsed}/{hook.modelUsed}
          </div>
        </div>
      )}

      {/* Selection + Feedback */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-teal-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selected for refinement
          </div>
          <textarea
            className="w-full rounded-lg border border-teal-200 p-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-300 focus:ring-1 focus:ring-teal-300"
            rows={2}
            placeholder="Feedback for refining this hook (optional)..."
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function HookReviewView({
  hooks,
  hookScores,
  personaValidation,
  onSelectAndRefine,
  errorMessage,
}: HookReviewViewProps) {
  const selectedHookIndex = useCampaignWizardStore(
    (s) => s.selectedHookIndex,
  );
  const setSelectedHook = useCampaignWizardStore((s) => s.setSelectedHook);
  const hookFeedback = useCampaignWizardStore((s) => s.hookFeedback);
  const setHookFeedback = useCampaignWizardStore((s) => s.setHookFeedback);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Choose Your Creative Hook
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Three creative hooks were generated from different angles. Select one
          to refine into a production-ready campaign concept.
        </p>
      </div>

      {/* Hook Cards */}
      <div className="space-y-4" role="radiogroup" aria-label="Creative hooks">
        {hooks.map((hook, i) => (
          <HookCard
            key={i}
            hook={hook}
            index={i}
            score={hookScores[i] ?? 0}
            isSelected={selectedHookIndex === i}
            onSelect={() => setSelectedHook(i)}
            feedback={hookFeedback[i] ?? ""}
            onFeedbackChange={(v) => setHookFeedback(i, v)}
          />
        ))}
      </div>

      {/* Persona Validation Summary */}
      {personaValidation.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Persona Validation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {personaValidation.map((pv, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 ${scoreBg(pv.overallScore)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {pv.personaName || `Persona ${i + 1}`}
                  </span>
                  <span
                    className={`text-sm font-bold ${scoreColor(pv.overallScore)}`}
                  >
                    {pv.overallScore}/10
                  </span>
                </div>
                {pv.preferredVariant && (
                  <p className="text-xs text-gray-500">
                    Prefers Hook {pv.preferredVariant}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="primary"
          onClick={onSelectAndRefine}
          disabled={selectedHookIndex === null}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Refine Selected Hook
        </Button>
      </div>
    </div>
  );
}
