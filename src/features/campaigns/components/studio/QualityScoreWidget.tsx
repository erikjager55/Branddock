'use client';

import React from 'react';
import { ProgressBar } from '@/components/shared';
import { useQualityScore } from '../../hooks/studio.hooks';
import { getMetricsForType } from '@/lib/studio/quality-metrics';
import { ImproveScoreButton } from './ImproveScoreButton';

// ─── Types ─────────────────────────────────────────────

interface QualityScoreWidgetProps {
  deliverableId: string;
  contentTab: string | null;
}

// ─── Helpers ───────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getBorderColor(score: number): string {
  if (score >= 80) return 'border-emerald-500';
  if (score >= 60) return 'border-amber-400';
  return 'border-red-500';
}

function getProgressColor(score: number): 'emerald' | 'amber' | 'red' {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'amber';
  return 'red';
}

// ─── Component ─────────────────────────────────────────

export function QualityScoreWidget({ deliverableId, contentTab }: QualityScoreWidgetProps) {
  const { data, isLoading } = useQualityScore(deliverableId);
  const metricNames = getMetricsForType(contentTab);

  const overall = data?.overall ?? 0;
  const metrics = Array.isArray(data?.metrics) ? data.metrics : [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-32" />
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="quality-score" className="space-y-4">
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-900">Quality Score</h3>

      {/* Circular score display */}
      <div className="flex justify-center">
        <div
          className={`w-24 h-24 rounded-full border-4 ${getBorderColor(overall)} flex items-center justify-center`}
        >
          <span data-testid="quality-overall" className={`text-3xl font-bold ${getScoreColor(overall)}`}>
            {Math.round(overall)}
          </span>
        </div>
      </div>

      {/* Metric bars */}
      <div className="space-y-3">
        {metricNames.map((name, index) => {
          const metric = metrics.find((m) => m.name === name);
          const score = metric ? Math.round((metric.score / metric.maxScore) * 100) : 0;

          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{name}</span>
                <span className="text-xs font-medium text-gray-900">{score}</span>
              </div>
              <ProgressBar
                value={score}
                size="sm"
                color={getProgressColor(score)}
              />
            </div>
          );
        })}
      </div>

      {/* Improve button */}
      <ImproveScoreButton />
    </div>
  );
}

export default QualityScoreWidget;
