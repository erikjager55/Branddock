'use client';

import { BarChart3, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { StrategyStats } from '../types/business-strategy.types';

interface SummaryStatsProps {
  stats: StrategyStats | undefined;
  isLoading: boolean;
}

export function SummaryStats({ stats, isLoading }: SummaryStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
            <div className="h-6 bg-gray-200 rounded w-12 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="strategy-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Strategies"
        value={stats.active}
        icon={BarChart3}
      />
      <StatCard
        label="On Track"
        value={stats.onTrack}
        icon={CheckCircle}
        className="[&_svg]:text-green-500"
      />
      <StatCard
        label="At Risk"
        value={stats.atRisk}
        icon={AlertTriangle}
        className="[&_svg]:text-red-500"
      />
      <StatCard
        label="Current Period"
        value={stats.currentPeriod}
        icon={Calendar}
      />
    </div>
  );
}
