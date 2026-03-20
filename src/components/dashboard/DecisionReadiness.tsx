import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useReadiness, dashboardKeys } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import type { ModuleScores } from '../../types/dashboard';

const MODULE_LABELS: Record<keyof ModuleScores, string> = {
  brandAssets: 'Brand Assets',
  personas: 'Personas',
  products: 'Products',
  campaigns: 'Campaigns',
  trends: 'Trends',
};

export function DecisionReadiness() {
  const { data, isLoading, isError } = useReadiness();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6">
        <Skeleton className="h-6 w-48 mb-4 bg-white/20" />
        <Skeleton className="h-12 w-24 mb-3 bg-white/20" />
        <Skeleton className="h-3 w-full mb-4 bg-white/20" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full bg-white/20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6">
        <div className="flex items-center gap-2 text-white mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load readiness</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKeys.readiness })}
          className="text-sm text-white/80 hover:text-white underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { percentage, breakdown, moduleScores } = data;

  return (
    <div data-testid="decision-readiness" className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-white" />
        <h2 className="text-sm font-semibold text-white">Decision Readiness</h2>
      </div>

      <div data-testid="readiness-percentage" className="text-4xl font-bold text-white mb-3">
        {percentage}%
      </div>

      <div data-testid="readiness-progress-bar" className="w-full bg-white/20 rounded-full h-3 mb-3">
        <div
          className="h-3 rounded-full bg-white transition-all duration-500"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      <p className="text-sm text-white/80 mb-4">
        <span className="text-white font-medium">{breakdown.ready} ready</span>
        {' · '}
        <span className="text-white/80 font-medium">{breakdown.needAttention} need attention</span>
        {' · '}
        <span className="text-white/70 font-medium">{breakdown.inProgress} in progress</span>
      </p>

      {moduleScores && (
        <div className="space-y-2 pt-2 border-t border-white/20">
          {(Object.keys(MODULE_LABELS) as Array<keyof ModuleScores>).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-white/80 w-24 flex-shrink-0">{MODULE_LABELS[key]}</span>
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.min(100, moduleScores[key])}%` }}
                />
              </div>
              <span className="text-xs text-white/80 w-8 text-right flex-shrink-0">{moduleScores[key]}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
