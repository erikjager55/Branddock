"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, Zap, Scale, Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/shared";
import type { QuickInsight } from "../../types/research.types";

// ─── Icon / color mapping ────────────────────────────────────

const INSIGHT_STYLES: Record<
  QuickInsight["type"],
  { icon: React.ElementType; iconColor: string; bg: string }
> = {
  progress: { icon: TrendingUp, iconColor: "text-green-600", bg: "bg-green-50" },
  momentum: { icon: Zap, iconColor: "text-blue-600", bg: "bg-blue-50" },
  balance: { icon: Scale, iconColor: "text-red-600", bg: "bg-red-50" },
};

// ─── Types ───────────────────────────────────────────────────

interface QuickInsightsSectionProps {
  insights: QuickInsight[] | undefined;
}

// ─── Component ───────────────────────────────────────────────

export function QuickInsightsSection({ insights }: QuickInsightsSectionProps) {
  const { t } = useTranslation("research");

  if (!Array.isArray(insights) || insights.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("quickInsights.heading")}</h3>
        <EmptyState
          icon={Lightbulb}
          title={t("quickInsights.empty.title")}
          description={t("quickInsights.empty.description")}
        />
      </div>
    );
  }

  return (
    <div data-testid="quick-insights">
      <h3 className="text-lg font-semibold mb-4">{t("quickInsights.heading")}</h3>

      <div className="space-y-3">
        {insights.map((insight) => {
          const style = INSIGHT_STYLES[insight.type];
          const Icon = style.icon;

          return (
            <div
              key={insight.id}
              className="bg-white rounded-lg border p-4 flex gap-3"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}
              >
                <Icon className={`w-5 h-5 ${style.iconColor}`} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{insight.title}</div>
                <div className="text-sm text-gray-600">{insight.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
