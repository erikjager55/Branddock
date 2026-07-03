"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, Heart, Zap, Eye, Check } from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { HumanInsight } from "@/lib/campaigns/strategy-blueprint.types";

const LENS_LABELS: Record<string, { labelKey: string; icon: React.ElementType; color: string }> = {
  anthropic: { labelKey: "insightReview.lens.empathy", icon: Heart, color: "text-rose-600 bg-rose-50 border-rose-200" },
  openai: { labelKey: "insightReview.lens.tension", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200" },
  google: { labelKey: "insightReview.lens.behavior", icon: Eye, color: "text-blue-600 bg-blue-50 border-blue-200" },
};

function getLensInfo(providerUsed: string) {
  return LENS_LABELS[providerUsed] ?? LENS_LABELS.anthropic;
}

interface InsightCardProps {
  insight: HumanInsight;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function InsightCard({ insight, index, isSelected, onSelect }: InsightCardProps) {
  const { t } = useTranslation("campaigns-wizard");
  const lens = getLensInfo(insight.providerUsed);
  const LensIcon = lens.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
        isSelected
          ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-200"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Lens badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${lens.color} mb-3`}>
        <LensIcon className="h-3.5 w-3.5" />
        {t(lens.labelKey)}
      </div>

      {/* Insight statement — the main attraction */}
      <p className="text-lg font-semibold text-gray-900 leading-snug mb-3">
        &ldquo;{insight.insightStatement}&rdquo;
      </p>

      {/* Underlying tension */}
      <div className="mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("insightReview.underlyingTension")}</span>
        <p className="text-sm text-gray-700 mt-0.5">{insight.underlyingTension}</p>
      </div>

      {/* Emotional territory */}
      <div className="mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("insightReview.emotionalTerritory")}</span>
        <p className="text-sm text-gray-600 italic mt-0.5">{insight.emotionalTerritory}</p>
      </div>

      {/* Category convention vs human truth */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="text-xs font-medium text-gray-400 uppercase">{t("insightReview.categoryAssumes")}</span>
          <p className="text-xs text-gray-600 mt-1">{insight.categoryConvention}</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-3">
          <span className="text-xs font-medium text-teal-600 uppercase">{t("insightReview.humanTruth")}</span>
          <p className="text-xs text-teal-800 mt-1">{insight.humanTruth}</p>
        </div>
      </div>

      {/* Proof points */}
      {insight.proofPoints.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("insightReview.evidence")}</span>
          <ul className="mt-1 space-y-0.5">
            {insight.proofPoints.map((pp, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">•</span>
                {pp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </button>
  );
}

interface InsightReviewViewProps {
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

/**
 * Displays 3 human insights for the user to select one (Vote 1).
 * Each insight was mined by a different LLM with a different lens.
 */
export function InsightReviewView({ onRegenerate, isRegenerating }: InsightReviewViewProps) {
  const { t } = useTranslation("campaigns-wizard");
  const insights = useCampaignWizardStore((s) => s.insights);
  const selectedIndex = useCampaignWizardStore((s) => s.selectedInsightIndex);
  const setSelectedInsight = useCampaignWizardStore((s) => s.setSelectedInsight);
  const insightFeedback = useCampaignWizardStore((s) => s.insightFeedback);
  const setInsightFeedback = useCampaignWizardStore((s) => s.setInsightFeedback);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t("insightReview.title")}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("insightReview.subtitle")}
          </p>
        </div>
      </div>

      {/* 3 Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={() => setSelectedInsight(selectedIndex === index ? null : index)}
          />
        ))}
      </div>

      {/* Feedback / regeneration */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {t("insightReview.feedbackLabel")}
        </label>
        <textarea
          value={insightFeedback}
          onChange={(e) => setInsightFeedback(e.target.value)}
          placeholder={t("insightReview.feedbackPlaceholder")}
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
            {isRegenerating ? t("actions.regenerating") : t("insightReview.regenerateHint")}
          </Button>
        )}
      </div>
    </div>
  );
}
