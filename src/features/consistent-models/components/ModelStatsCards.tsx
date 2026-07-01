"use client";

import { useTranslation } from "react-i18next";
import { Cpu, CheckCircle2, Loader2, Image } from "lucide-react";
import { StatCard } from "@/components/shared";
import type { ConsistentModelStats } from "../types/consistent-model.types";

interface ModelStatsCardsProps {
  stats: ConsistentModelStats | undefined;
  isLoading: boolean;
}

/** 4 stat cards for model overview */
export function ModelStatsCards({ stats, isLoading }: ModelStatsCardsProps) {
  const { t } = useTranslation("consistent-models");
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label={t("stats.total")}
        value={stats?.total ?? 0}
        icon={Cpu}
      />
      <StatCard
        label={t("stats.ready")}
        value={stats?.ready ?? 0}
        icon={CheckCircle2}
      />
      <StatCard
        label={t("stats.training")}
        value={stats?.training ?? 0}
        icon={Loader2}
      />
      <StatCard
        label={t("stats.generations")}
        value={stats?.totalGenerations ?? 0}
        icon={Image}
      />
    </div>
  );
}
