'use client';

import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useTrends, useActivateTrend, useDismissTrend } from '../../hooks';
import { RELEVANCE_THRESHOLDS } from '../../constants/trend-radar-constants';
import { AlertCard } from './AlertCard';

interface AlertsPanelProps {
  onTrendClick: (id: string) => void;
}

export function AlertsPanel({ onTrendClick }: AlertsPanelProps) {
  const { data, isLoading } = useTrends({ dismissed: false });
  const activateMutation = useActivateTrend();
  const dismissMutation = useDismissTrend();

  // Filter to high-relevance, non-activated trends
  const alerts = (data?.trends ?? []).filter(
    (t) => t.relevanceScore >= RELEVANCE_THRESHOLDS.HIGH && !t.isActivated,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No alerts right now"
        description="High-relevance trends (score > 80) that need your attention will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {alerts.length} high-relevance trend{alerts.length !== 1 ? 's' : ''} need{alerts.length === 1 ? 's' : ''} your attention
      </p>
      <div className="space-y-3">
        {alerts.map((trend) => (
          <AlertCard
            key={trend.id}
            trend={trend}
            onActivate={(id) => activateMutation.mutate(id)}
            onDismiss={(id) => dismissMutation.mutate(id)}
            onClick={onTrendClick}
          />
        ))}
      </div>
    </div>
  );
}
