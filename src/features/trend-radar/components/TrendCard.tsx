'use client';

import { useState } from 'react';
import { Lock, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/components/shared';
import {
  CATEGORY_COLORS,
  IMPACT_COLORS,
  DETECTION_SOURCE_CONFIG,
  RELEVANCE_THRESHOLDS,
} from '../constants/trend-radar-constants';
import type { DetectedTrendWithMeta } from '../types/trend-radar.types';

interface TrendCardProps {
  trend: DetectedTrendWithMeta;
  onClick: () => void;
}

const DIRECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rising: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

/** Trend card following BrandAssetCard / PersonaCard pattern */
export function TrendCard({ trend, onClick }: TrendCardProps) {
  const [imageError, setImageError] = useState(false);
  const categoryConfig = CATEGORY_COLORS[trend.category];
  const impactConfig = IMPACT_COLORS[trend.impactLevel];
  const sourceConfig = DETECTION_SOURCE_CONFIG[trend.detectionSource];
  const DirectionIcon = trend.direction ? DIRECTION_ICONS[trend.direction] : null;

  const relevanceColor: 'emerald' | 'amber' | 'teal' =
    trend.relevanceScore >= RELEVANCE_THRESHOLDS.HIGH ? 'emerald'
    : trend.relevanceScore >= RELEVANCE_THRESHOLDS.MEDIUM ? 'amber'
    : 'teal';

  return (
    <Card
      hoverable
      padding="none"
      onClick={onClick}
      className="cursor-pointer relative"
    >
      {/* Lock indicator */}
      {trend.isLocked && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
            <Lock className="w-3 h-3 text-amber-600" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          {trend.imageUrl && !imageError ? (
            <img
              src={trend.imageUrl}
              alt=""
              className="flex-shrink-0 w-10 h-10 rounded-xl object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${categoryConfig.bg}`}>
              <span className={`text-base font-bold ${categoryConfig.text}`}>
                {categoryConfig.label.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{trend.title}</h3>
            {trend.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{trend.description}</p>
            )}
          </div>
        </div>

        {/* Relevance bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Relevance</span>
            <span className="text-[10px] font-semibold text-gray-600">{trend.relevanceScore}%</span>
          </div>
          <ProgressBar value={trend.relevanceScore} color={relevanceColor} size="sm" />
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <Badge variant={trend.impactLevel === 'HIGH' || trend.impactLevel === 'CRITICAL' ? 'warning' : 'default'}>
            {impactConfig.label} Impact
          </Badge>
          {DirectionIcon && (
            <div className="flex items-center gap-1">
              <DirectionIcon className={`w-3.5 h-3.5 ${
                trend.direction === 'rising' ? 'text-emerald-600' : trend.direction === 'declining' ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${categoryConfig.bg} ${categoryConfig.text}`}>
            {categoryConfig.label}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceConfig.color}`}>
            {sourceConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {trend.isActivated && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <Zap className="w-3 h-3" /> Active
            </span>
          )}
          {trend.isDismissed && (
            <span className="text-[10px] font-medium text-gray-400">Dismissed</span>
          )}
          <span className="text-[10px] text-gray-400">
            {new Date(trend.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </Card>
  );
}
