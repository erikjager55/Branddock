"use client";

import React, { useMemo } from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { GOAL_LABELS } from "@/features/campaigns/lib/goal-types";

const DEFAULT_QUICK_PROMPTS = [
  "Professional tone",
  "Focus on benefits",
  "Include statistics",
  "Call to action",
];

export function PromptSection() {
  const { prompt, setPrompt } = useContentStudioStore();
  const campaignBlueprint = useContentStudioStore((s) => s.campaignBlueprint);
  const deliverableBrief = useContentStudioStore((s) => s.deliverableBrief);
  const campaignName = useContentStudioStore((s) => s.campaignName);
  const campaignGoalType = useContentStudioStore((s) => s.campaignGoalType);

  // Dynamic chips: deliverable brief → campaign messaging → fallback generic
  const quickPrompts = useMemo(() => {
    let chips: string[];
    if (deliverableBrief) {
      chips = [deliverableBrief.keyMessage, deliverableBrief.callToAction, deliverableBrief.toneDirection].filter(Boolean);
    } else if (campaignBlueprint?.strategy?.messagingHierarchy) {
      const { brandMessage, campaignMessage, proofPoints } = campaignBlueprint.strategy.messagingHierarchy;
      chips = [brandMessage, campaignMessage, ...(proofPoints ?? []).slice(0, 2)].filter(Boolean);
    } else {
      chips = DEFAULT_QUICK_PROMPTS;
    }
    // Deduplicate to avoid React key collisions
    return [...new Set(chips)];
  }, [deliverableBrief, campaignBlueprint]);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Prompt
      </label>

      {/* Campaign context hint */}
      {campaignBlueprint && (
        <p className="text-xs text-muted-foreground mb-2">
          Campaign: {campaignName} {campaignGoalType ? `\u2022 Goal: ${GOAL_LABELS[campaignGoalType] ?? campaignGoalType}` : ""}{" "}
          {campaignBlueprint.strategy?.campaignTheme ? `\u2022 Theme: ${campaignBlueprint.strategy.campaignTheme}` : ""}
        </p>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to create..."
        maxLength={500}
        rows={4}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400">{prompt.length}/500</span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {quickPrompts.map((chip) => (
          <button
            key={chip}
            onClick={() => {
              const separator = prompt.length > 0 ? ". " : "";
              setPrompt((prompt + separator + chip).slice(0, 500));
            }}
            className="px-2 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
