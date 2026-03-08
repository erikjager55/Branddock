'use client';

import { SkeletonCard, EmptyState } from '@/components/shared';
import { TrendCard } from './TrendCard';
import { useTrends } from '../hooks';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';
import type { TrendListParams } from '../types/trend-radar.types';
import { Radar } from 'lucide-react';

interface TrendCardGridProps {
  onTrendClick: (id: string) => void;
}

/** Responsive card grid with loading/empty states */
export function TrendCardGrid({ onTrendClick }: TrendCardGridProps) {
  const {
    searchQuery,
    categoryFilter,
    impactFilter,
    detectionSourceFilter,
    showDismissed,
    showActivated,
  } = useTrendRadarStore();

  const params: TrendListParams = {};
  if (categoryFilter) params.category = categoryFilter;
  if (impactFilter) params.impactLevel = impactFilter;
  if (detectionSourceFilter) params.detectionSource = detectionSourceFilter;
  if (searchQuery) params.search = searchQuery;
  if (showDismissed) params.dismissed = true;
  if (showActivated) params.activated = true;

  const { data, isLoading } = useTrends(params);
  const trends = data?.trends ?? [];

  // Client-side: hide dismissed unless showDismissed is active
  const visibleTrends = showDismissed
    ? trends
    : trends.filter((t) => !t.isDismissed);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (visibleTrends.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        title="No trends found"
        description={
          searchQuery || categoryFilter || impactFilter || detectionSourceFilter
            ? 'Try adjusting your filters or search query.'
            : 'Start by adding trends manually or running an AI research.'
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {visibleTrends.map((trend) => (
        <TrendCard
          key={trend.id}
          trend={trend}
          onClick={() => onTrendClick(trend.id)}
        />
      ))}
    </div>
  );
}
