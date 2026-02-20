'use client';

import { Badge } from '@/components/shared';
import type { StrategyDetailResponse } from '../../types/business-strategy.types';

interface StrategyProgressSectionProps {
  strategy: StrategyDetailResponse;
}

export function StrategyProgressSection({ strategy }: StrategyProgressSectionProps) {
  const objectives = strategy.objectives ?? [];
  const total = objectives.length;
  const onTrack = objectives.filter((o) => o.status === 'ON_TRACK').length;
  const atRisk = objectives.filter((o) => o.status === 'AT_RISK').length;
  const completed = objectives.filter((o) => o.status === 'COMPLETED').length;
  const progress = strategy.progressPercentage;

  const onTrackPct = total > 0 ? ((onTrack + completed) / total) * progress : 0;
  const atRiskPct = total > 0 ? (atRisk / total) * progress : 0;

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-8">
        {/* Big percentage */}
        <div className="flex-shrink-0">
          <span className="text-3xl font-bold text-gray-900">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1">
          <div className="h-3 rounded-full bg-gray-200 overflow-hidden flex">
            {onTrackPct > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${onTrackPct}%` }}
              />
            )}
            {atRiskPct > 0 && (
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${atRiskPct}%` }}
              />
            )}
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="text-center">
            <Badge variant="success" size="sm">{onTrack} On Track</Badge>
          </div>
          <div className="text-center">
            <Badge variant="danger" size="sm">{atRisk} At Risk</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
