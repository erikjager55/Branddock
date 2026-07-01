"use client";

import React from "react";
import { FileText, CheckCircle, Clock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard, Skeleton } from "@/components/shared";
import type { ContentLibraryStatsResponse } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentStatsCardsProps {
  stats: ContentLibraryStatsResponse | undefined;
  isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────

export function ContentStatsCards({ stats, isLoading }: ContentStatsCardsProps) {
  const { t } = useTranslation("campaigns-content-library");
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const s = stats ?? { totalContent: 0, complete: 0, inProgress: 0, avgQuality: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label={t("stats.totalContent")}
        value={s.totalContent}
        icon={FileText}
        className="border-l-4 border-l-blue-500"
      />
      <StatCard
        label={t("stats.complete")}
        value={s.complete}
        icon={CheckCircle}
        className="border-l-4 border-l-green-500"
      />
      <StatCard
        label={t("stats.inProgress")}
        value={s.inProgress}
        icon={Clock}
        className="border-l-4 border-l-purple-500"
      />
      <StatCard
        label={t("stats.avgQuality")}
        value={s.avgQuality > 0 ? `${s.avgQuality}/100` : "--"}
        icon={Star}
        className="border-l-4 border-l-gray-400"
      />
    </div>
  );
}

export default ContentStatsCards;
