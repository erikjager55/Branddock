"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Palette,
  RefreshCw,
  Type,
  Users,
  Package,
  Swords,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, Button } from "@/components/shared";
import { useRefreshBrandContext } from "../../../hooks";
import type { ConsistentModelDetail, ModelBrandContext } from "../../../types/consistent-model.types";

interface BrandContextCardProps {
  model: ConsistentModelDetail;
}

/** Sidebar card showing the brand context snapshot used for AI generation */
export function BrandContextCard({ model }: BrandContextCardProps) {
  const { t } = useTranslation("consistent-models");
  const [isExpanded, setIsExpanded] = useState(false);
  const refreshContext = useRefreshBrandContext(model.id);

  const ctx = model.brandContext as ModelBrandContext | null;

  if (!ctx) {
    return (
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("brandContext.heading")}</h3>
        <p className="text-sm text-gray-500">
          {t("brandContext.none")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => refreshContext.mutate()}
          disabled={refreshContext.isPending}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshContext.isPending ? "animate-spin" : ""}`} />
          {refreshContext.isPending ? t("brandContext.resolving") : t("brandContext.resolve")}
        </Button>
      </Card>
    );
  }

  const resolvedDate = new Date(ctx.resolvedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sources: { icon: React.ElementType; label: string; present: boolean }[] = [
    { icon: Palette, label: t("brandContext.labels.brandColors"), present: !!ctx.brandColors?.length },
    { icon: Type, label: t("brandContext.labels.brandFonts"), present: !!ctx.brandFonts?.length },
    { icon: Brain, label: t("brandContext.labels.brandPersonality"), present: !!ctx.brandPersonality },
    { icon: Sparkles, label: t("brandContext.labels.toneOfVoice"), present: !!ctx.toneOfVoice },
    { icon: Sparkles, label: t("brandContext.labels.imageryStyle"), present: !!ctx.brandImageryStyle },
    { icon: Sparkles, label: t("brandContext.labels.designLanguage"), present: !!ctx.brandDesignLanguage },
    { icon: Users, label: t("brandContext.labels.targetPersonas"), present: !!ctx.targetPersonas?.length },
    { icon: Package, label: t("brandContext.labels.productInfo"), present: !!ctx.productInfo?.length },
    { icon: Swords, label: t("brandContext.labels.competitors"), present: !!ctx.competitors?.length },
    { icon: TrendingUp, label: t("brandContext.labels.trendInsights"), present: !!ctx.trendInsights?.length },
    { icon: Sparkles, label: t("brandContext.labels.moodKeywords"), present: !!ctx.moodKeywords?.length },
  ];

  const activeSources = sources.filter((s) => s.present);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{t("brandContext.heading")}</h3>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("brandContext.resolved")}</span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Clock className="h-3.5 w-3.5" />
            {resolvedDate}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("brandContext.sources")}</span>
          <span className="text-sm text-gray-700">
            {t("brandContext.sourcesCount", { active: activeSources.length, total: sources.length })}
          </span>
        </div>

        {isExpanded && (
          <div className="space-y-1.5 pt-1">
            {sources.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.label}
                  className={`flex items-center gap-2 text-xs ${
                    source.present ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{source.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => refreshContext.mutate()}
          disabled={refreshContext.isPending}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshContext.isPending ? "animate-spin" : ""}`} />
          {refreshContext.isPending ? t("brandContext.refreshing") : t("brandContext.refresh")}
        </Button>
      </div>
    </Card>
  );
}
