"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Zap, CheckCircle, FileText } from "lucide-react";
import { StatCard } from "@/components/shared";
import type { CampaignStatsResponse } from "@/types/campaign";

interface CampaignStatsCardsProps {
  stats: CampaignStatsResponse | undefined;
  isLoading: boolean;
}

export function CampaignStatsCards({ stats, isLoading }: CampaignStatsCardsProps) {
  const { t } = useTranslation("campaigns-overview");
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const s = stats ?? { active: 0, quick: 0, completed: 0, totalContent: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label={t("stats.activeCampaigns")}
        value={s.active}
        icon={Megaphone}
        className="border-l-4 border-l-blue-500"
      />
      <StatCard
        label={t("stats.quickContent")}
        value={s.quick}
        icon={Zap}
        className="border-l-4 border-l-purple-500"
      />
      <StatCard
        label={t("stats.completed")}
        value={s.completed}
        icon={CheckCircle}
        className="border-l-4 border-l-green-500"
      />
      <StatCard
        label={t("stats.totalContent")}
        value={s.totalContent}
        icon={FileText}
        className="border-l-4 border-l-gray-400"
      />
    </div>
  );
}
