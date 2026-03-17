"use client";

import React from "react";
import { ThumbsUp } from "lucide-react";
import { Badge } from "@/components/shared";
import type { PersonaValidationResult } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ──────────────────────────────────────────────

interface PersonaFeedbackCardProps {
  persona: PersonaValidationResult;
  isEndorsed: boolean;
  onToggleEndorse: () => void;
}

// ─── Main Component ─────────────────────────────────────

export function PersonaFeedbackCard({
  persona,
  isEndorsed,
  onToggleEndorse,
}: PersonaFeedbackCardProps) {
  const scoreColor =
    persona.overallScore >= 7 ? "success" : persona.overallScore >= 5 ? "warning" : "danger";

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 transition-colors ${
        isEndorsed
          ? "border-emerald-300 bg-emerald-50/20"
          : "border-gray-200"
      }`}
    >
      {/* Header row: avatar + name + badges + endorse */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
            {(persona.personaName || "?").charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {persona.personaName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={scoreColor}>
                {persona.overallScore}/10
              </Badge>
              <Badge variant="default">
                Prefers {persona.preferredVariant}
              </Badge>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={isEndorsed}
          onClick={onToggleEndorse}
          className={`p-1.5 rounded-lg border transition-all ${
            isEndorsed
              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
              : "border-gray-200 bg-white text-gray-400 hover:text-emerald-500 hover:border-emerald-200"
          }`}
          title={isEndorsed ? "Remove endorsement" : "Endorse this persona's feedback for synthesis"}
        >
          <ThumbsUp className={`w-4 h-4 ${isEndorsed ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Feedback text */}
      <p className="text-sm text-gray-700 leading-relaxed">
        {persona.feedback}
      </p>

      {/* Resonates tags (green) */}
      {persona.resonates.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-700">Resonates</p>
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
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-700">Concerns</p>
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
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-700">Suggestions</p>
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
