'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ProgressBar, Button } from '@/components/shared';
import { useQualityScore, useRefreshQuality } from '../../hooks/studio.hooks';
import { ImproveScoreButton } from './ImproveScoreButton';
import { STUDIO } from '@/lib/constants/design-tokens';

// ─── Types ─────────────────────────────────────────────

interface QualityScoreWidgetProps {
  deliverableId: string;
}

// ─── Helpers ───────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return STUDIO.quality.high;
  if (score >= 60) return STUDIO.quality.medium;
  return STUDIO.quality.low;
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

export function QualityScoreWidget({ deliverableId }: QualityScoreWidgetProps) {
  const { data, isLoading } = useQualityScore(deliverableId);
  const refreshMutation = useRefreshQuality(deliverableId);

  const overall = data?.overall ?? 0;
  const metrics = Array.isArray(data?.metrics) ? data.metrics : [];
  const hasScore = overall > 0 && metrics.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-32" />
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // No score yet — show CTA to score
  if (!hasScore) {
    return (
      <div data-testid="quality-score" className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Quality Score</h3>
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-gray-200 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-300">—</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Generate content first, then score its quality.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          isLoading={refreshMutation.isPending}
          className="w-full"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Score Quality
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="quality-score" className="space-y-4">
      {/* Section header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quality Score</h3>
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-40"
          title="Re-score quality"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
        {metrics.map((metric) => {
          const score = metric.maxScore > 0 ? Math.round((metric.score / metric.maxScore) * 100) : 0;

          return (
            <div key={metric.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{metric.name}</span>
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
