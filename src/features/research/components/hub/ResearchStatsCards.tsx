"use client";

import React from "react";
import { Zap, CheckCircle, Clock, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/shared";
import type { ResearchStatsResponse } from "../../types/research.types";
import { RESEARCH_STATS_CONFIG } from "../../constants/research-constants";

// ─── Icon mapping ────────────────────────────────────────────

const ICON_MAP = {
  Zap,
  CheckCircle,
  Clock,
  Lightbulb,
} as const;

// ─── Types ───────────────────────────────────────────────────

interface ResearchStatsCardsProps {
  stats: ResearchStatsResponse | undefined;
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────

export function ResearchStatsCards({ stats, isLoading }: ResearchStatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 space-y-3">
            <Skeleton className="rounded-lg" width={40} height={40} />
            <Skeleton className="rounded" width="40%" height={24} />
            <Skeleton className="rounded" width="60%" height={14} />
          </div>
        ))}
      </div>
    );
  }

  const statKeys: (keyof ResearchStatsResponse)[] = [
    "activeStudies",
    "completed",
    "pendingReview",
    "totalInsights",
  ];

  return (
    <div data-testid="research-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statKeys.map((key) => {
        const config = RESEARCH_STATS_CONFIG[key];
        const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];
        const value = stats[key];

        return (
          <div key={key} data-testid="stat-card" className="bg-white rounded-lg border p-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-gray-500">{config.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
