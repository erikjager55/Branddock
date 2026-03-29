"use client";

import React from "react";
import { ThumbsUp, CheckCircle, AlertTriangle, Lightbulb } from "lucide-react";
import type { PersonaValidationResult } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ──────────────────────────────────────────────

interface PersonaFeedbackCardProps {
  persona: PersonaValidationResult;
  isEndorsed: boolean;
  onToggleEndorse: () => void;
}

// ─── Score Circle ────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 7
      ? "text-emerald-600 border-emerald-200 bg-emerald-50"
      : score >= 5
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : "text-red-600 border-red-200 bg-red-50";

  return (
    <div
      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${color}`}
    >
      <span className="text-lg font-bold">{score}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function PersonaFeedbackCard({
  persona,
  isEndorsed,
  onToggleEndorse,
}: PersonaFeedbackCardProps) {
  const variantColor =
    persona.preferredVariant === "A"
      ? "bg-primary-100 text-primary-700 border-primary-300"
      : persona.preferredVariant === "C"
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-blue-100 text-blue-700 border-blue-300";

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 transition-colors ${
        isEndorsed
          ? "border-emerald-300 bg-emerald-50/20"
          : "border-gray-200"
      }`}
    >
      {/* Header row: avatar + name + score circle + endorse */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ScoreCircle score={persona.overallScore} />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {persona.personaName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variantColor}`}
              >
                Prefers {persona.preferredVariant}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={isEndorsed}
          onClick={onToggleEndorse}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${
            isEndorsed
              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
              : "border-gray-200 bg-white text-gray-500 hover:text-emerald-500 hover:border-emerald-200"
          }`}
          title={isEndorsed ? "Remove endorsement" : "Endorse this persona's feedback for synthesis"}
        >
          <ThumbsUp className={`w-4 h-4 ${isEndorsed ? "fill-current" : ""}`} />
          <span>{isEndorsed ? "Endorsed" : "Endorse"}</span>
        </button>
      </div>

      {/* Creative Verdict */}
      {persona.creativeVerdict && (
        <p className="text-sm text-gray-800 italic leading-relaxed">
          &ldquo;{persona.creativeVerdict}&rdquo;
        </p>
      )}

      {/* Creative Quality Scores (mini-bars) */}
      {(persona.originalityScore != null || persona.memorabilityScore != null || persona.culturalRelevanceScore != null || persona.talkabilityScore != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Originality", score: persona.originalityScore },
            { label: "Memorability", score: persona.memorabilityScore },
            { label: "Cultural Fit", score: persona.culturalRelevanceScore },
            { label: "Talkability", score: persona.talkabilityScore },
          ].map(({ label, score }) =>
            score != null ? (
              <div key={label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold text-gray-700">{score}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-400" : "bg-red-400"
                    }`}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Feedback text */}
      <p className="text-sm text-gray-700 leading-relaxed">
        {persona.feedback}
      </p>

      {/* Resonates tags (green) */}
      {persona.resonates.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-700">Resonates</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.resonates.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concerns tags (amber) */}
      {persona.concerns.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-amber-700">Concerns</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.concerns.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions tags (blue) */}
      {persona.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs font-semibold text-blue-700">Suggestions</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.suggestions.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
