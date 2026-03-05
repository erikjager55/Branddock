'use client';

import { Rss } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useTrends, useActivateTrend, useDismissTrend } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { TrendFilterBar } from './TrendFilterBar';
import { TrendFeedCard } from './TrendFeedCard';

interface TrendFeedPanelProps {
  onTrendClick: (id: string) => void;
}

export function TrendFeedPanel({ onTrendClick }: TrendFeedPanelProps) {
  const {
    searchQuery,
    categoryFilter,
    impactFilter,
    detectionSourceFilter,
    showDismissed,
  } = useTrendRadarStore();

  const { data, isLoading } = useTrends({
    search: searchQuery || undefined,
    category: categoryFilter,
    impactLevel: impactFilter,
    detectionSource: detectionSourceFilter,
    dismissed: showDismissed ? undefined : false,
  });

  const activateMutation = useActivateTrend();
  const dismissMutation = useDismissTrend();

  const trends = data?.trends ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TrendFilterBar />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TrendFilterBar />

      {/* Dismissed toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={showDismissed}
          onChange={(e) => useTrendRadarStore.getState().setShowDismissed(e.target.checked)}
          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        Show dismissed trends
      </label>

      {trends.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No trends found"
          description={searchQuery ? 'Try adjusting your filters' : 'Run a scan or add trends manually to see them here.'}
        />
      ) : (
        <div className="space-y-3">
          {trends.map((trend) => (
            <TrendFeedCard
              key={trend.id}
              trend={trend}
              onActivate={(id) => activateMutation.mutate(id)}
              onDismiss={(id) => dismissMutation.mutate(id)}
              onClick={onTrendClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
