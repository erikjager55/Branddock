'use client';

import { Zap } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useTrends, useActivateTrend } from '../../hooks';
import { ActivatedTrendCard } from './ActivatedTrendCard';

interface ActivationPanelProps {
  onTrendClick: (id: string) => void;
}

export function ActivationPanel({ onTrendClick }: ActivationPanelProps) {
  const { data, isLoading } = useTrends({ activated: true });
  const activateMutation = useActivateTrend(); // toggle: deactivates if already active

  const activated = data?.trends ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (activated.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No activated trends"
        description="Activate trends from the Feed or Alerts tab to use them in campaigns and AI context."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activated.length} trend{activated.length !== 1 ? 's' : ''} activated for use in campaigns & AI context
        </p>
      </div>
      <div className="space-y-3">
        {activated.map((trend) => (
          <ActivatedTrendCard
            key={trend.id}
            trend={trend}
            onDeactivate={(id) => activateMutation.mutate(id)}
            onClick={onTrendClick}
          />
        ))}
      </div>
    </div>
  );
}
