'use client';

import { TrendingUp, Zap, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { InsightStats } from '../types/market-insight.types';

interface InsightStatsCardsProps {
  stats: InsightStats;
}

export function InsightStatsCards({ stats }: InsightStatsCardsProps) {
  return (
    <div data-testid="insight-stats" className="grid grid-cols-3 gap-4">
      <StatCard
        label="Active Insights"
        value={stats.active}
        icon={TrendingUp}
      />
      <StatCard
        label="High Impact"
        value={stats.highImpact}
        icon={Zap}
      />
      <StatCard
        label="New This Month"
        value={stats.newThisMonth}
        icon={Sparkles}
      />
    </div>
  );
}
