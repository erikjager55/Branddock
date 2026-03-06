'use client';

import { Zap, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge, ProgressBar } from '@/components/shared';
import {
  CATEGORY_COLORS,
  IMPACT_COLORS,
  DETECTION_SOURCE_CONFIG,
  RELEVANCE_THRESHOLDS,
} from '../../constants/trend-radar-constants';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface TrendFeedCardProps {
  trend: DetectedTrendWithMeta;
  onActivate: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick: (id: string) => void;
}

const DIRECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rising: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

export function TrendFeedCard({ trend, onActivate, onDismiss, onClick }: TrendFeedCardProps) {
  const categoryConfig = CATEGORY_COLORS[trend.category];
  const impactConfig = IMPACT_COLORS[trend.impactLevel];
  const sourceConfig = DETECTION_SOURCE_CONFIG[trend.detectionSource];
  const DirectionIcon = trend.direction ? DIRECTION_ICONS[trend.direction] : null;

  const relevanceBarColor: 'emerald' | 'amber' | 'teal' =
    trend.relevanceScore >= RELEVANCE_THRESHOLDS.HIGH ? 'emerald'
    : trend.relevanceScore >= RELEVANCE_THRESHOLDS.MEDIUM ? 'amber'
    : 'teal';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(trend.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(trend.id); } }}
      className={`w-full text-left p-4 rounded-xl border transition-colors hover:border-gray-300 cursor-pointer ${
        trend.isActivated
          ? 'border-emerald-200 bg-emerald-50/30'
          : trend.isDismissed
          ? 'border-gray-100 bg-gray-50/50 opacity-60'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Top row: title + actions */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{trend.title}</h3>
          {trend.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{trend.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!trend.isActivated && !trend.isDismissed && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onActivate(trend.id); }}
                className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                title="Activate trend"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(trend.id); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Dismiss trend"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </>
          )}
          {trend.isActivated && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Relevance bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400">Relevance</span>
          <span className="text-[10px] font-semibold text-gray-600">{trend.relevanceScore}%</span>
        </div>
        <ProgressBar value={trend.relevanceScore} color={relevanceBarColor} size="sm" />
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="default">
          <span className={`${categoryConfig.text}`}>{categoryConfig.label}</span>
        </Badge>
        <Badge variant={trend.impactLevel === 'HIGH' || trend.impactLevel === 'CRITICAL' ? 'warning' : 'default'}>
          {impactConfig.label}
        </Badge>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceConfig.color}`}>
          {sourceConfig.label}
        </span>
        {DirectionIcon && (
          <DirectionIcon className={`w-3.5 h-3.5 ${
            trend.direction === 'rising' ? 'text-emerald-600' : trend.direction === 'declining' ? 'text-red-500' : 'text-gray-400'
          }`} />
        )}
      </div>

      {/* Research job */}
      {trend.researchJob && (
        <p className="text-[10px] text-gray-400 mt-2 truncate">
          via AI Research: {trend.researchJob.query}
        </p>
      )}
    </div>
  );
}
