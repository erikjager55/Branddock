"use client";

import React from "react";
import { FileText, CheckCircle, Clock, Star } from "lucide-react";
import { StatCard, Skeleton } from "@/components/shared";
import type { ContentLibraryStatsResponse } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentStatsCardsProps {
  stats: ContentLibraryStatsResponse | undefined;
  isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────

export function ContentStatsCards({ stats, isLoading }: ContentStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-5 space-y-3"
          >
            <Skeleton width={40} height={40} className="rounded-lg" />
            <Skeleton width="50%" height={24} className="rounded" />
            <Skeleton width="70%" height={12} className="rounded" />
          </div>
        ))}
      </div>
    );
  }

  const s = stats ?? { totalContent: 0, complete: 0, inProgress: 0, avgQuality: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Content"
        value={s.totalContent}
        icon={FileText}
      />
      <StatCard
        label="Complete"
        value={s.complete}
        icon={CheckCircle}
        className="[&_div:first-child]:bg-emerald-50 [&_svg]:text-emerald-500"
      />
      <StatCard
        label="In Progress"
        value={s.inProgress}
        icon={Clock}
        className="[&_div:first-child]:bg-amber-50 [&_svg]:text-amber-500"
      />
      <StatCard
        label="Avg Quality"
        value={s.avgQuality > 0 ? `${s.avgQuality}/100` : "--"}
        icon={Star}
        className="[&_div:first-child]:bg-teal-50 [&_svg]:text-teal-600"
      />
    </div>
  );
}

export default ContentStatsCards;
