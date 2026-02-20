import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useReadiness } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import { getThresholdColor, getThresholdBgColor, THRESHOLDS } from '../../lib/dashboard/thresholds';

export function DecisionReadiness() {
  const { data, isLoading } = useReadiness();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-12 w-24 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!data) return null;

  const { percentage, breakdown } = data;
  const textColor = getThresholdColor(percentage);
  const barColor = getThresholdBgColor(percentage);

  return (
    <div data-testid="decision-readiness" className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Decision Readiness</h2>
      </div>

      <div data-testid="readiness-percentage" className={`text-4xl font-bold ${textColor} mb-3`}>
        {percentage}%
      </div>

      <div data-testid="readiness-progress-bar" className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      <p className="text-sm text-gray-500">
        <span className="text-green-600 font-medium">{breakdown.ready} {THRESHOLDS.high.label.toLowerCase()}</span>
        {' · '}
        <span className="text-yellow-500 font-medium">{breakdown.needAttention} {THRESHOLDS.medium.label.toLowerCase()}</span>
        {' · '}
        <span className="text-red-500 font-medium">{breakdown.inProgress} {THRESHOLDS.low.label.toLowerCase()}</span>
      </p>
    </div>
  );
}
