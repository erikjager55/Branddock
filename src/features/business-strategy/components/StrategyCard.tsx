'use client';

import {
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/shared';
import { CardLockIndicator } from '@/components/lock';
import { STRATEGY_STATUS_COLORS } from '../constants/strategy-types';
import type { StrategyWithMeta, StrategyType, StrategyStatus } from '../types/business-strategy.types';

// ─── Icon map ─────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
};

const TYPE_ICON: Record<StrategyType, string> = {
  GROWTH: 'TrendingUp',
  MARKET_ENTRY: 'Globe',
  PRODUCT_LAUNCH: 'Rocket',
  BRAND_BUILDING: 'Award',
  OPERATIONAL_EXCELLENCE: 'Settings',
  CUSTOM: 'Puzzle',
};

const TYPE_LABEL: Record<StrategyType, string> = {
  GROWTH: 'Growth',
  MARKET_ENTRY: 'Market Entry',
  PRODUCT_LAUNCH: 'Product Launch',
  BRAND_BUILDING: 'Brand Building',
  OPERATIONAL_EXCELLENCE: 'Operational Excellence',
  CUSTOM: 'Custom',
};

const STATUS_BADGE_VARIANT: Record<StrategyStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  DRAFT: 'default',
  ARCHIVED: 'default',
  COMPLETED: 'info',
};

interface StrategyCardProps {
  strategy: StrategyWithMeta;
  onClick: () => void;
}

export function StrategyCard({ strategy, onClick }: StrategyCardProps) {
  const iconName = TYPE_ICON[strategy.type];
  const Icon = ICON_MAP[iconName] ?? Puzzle;
  const statusColors = STRATEGY_STATUS_COLORS[strategy.status];

  const { total, onTrack, atRisk } = strategy.objectives;
  const behind = total - onTrack - atRisk;

  // Segment widths for progress bar
  const onTrackPct = total > 0 ? (onTrack / total) * 100 : 0;
  const atRiskPct = total > 0 ? (atRisk / total) * 100 : 0;
  const behindPct = total > 0 ? (behind / total) * 100 : 0;

  return (
    <div
      data-testid={`strategy-card-${strategy.id}`}
      onClick={onClick}
      className="relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <CardLockIndicator isLocked={strategy.isLocked} className="absolute top-3 right-3" />

      {/* Header: icon + type badge + status badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-emerald-600" />
          </div>
          <Badge variant="default" size="sm">
            {TYPE_LABEL[strategy.type]}
          </Badge>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[strategy.status]} size="sm" dot>
          {strategy.status.charAt(0) + strategy.status.slice(1).toLowerCase()}
        </Badge>
      </div>

      {/* Name + description */}
      <h3 className="font-semibold text-gray-900 mb-1">{strategy.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{strategy.description}</p>

      {/* Multi-segment progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-gray-900">{Math.round(strategy.progressPercentage)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {onTrackPct > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${onTrackPct}%` }}
            />
          )}
          {atRiskPct > 0 && (
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${atRiskPct}%` }}
            />
          )}
          {behindPct > 0 && (
            <div
              className="h-full bg-gray-300 transition-all"
              style={{ width: `${behindPct}%` }}
            />
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
        <span>{total} objectives</span>
        {onTrack > 0 && (
          <>
            <span className="text-gray-300">&middot;</span>
            <span className="text-green-600">{onTrack} on track</span>
          </>
        )}
        {atRisk > 0 && (
          <>
            <span className="text-gray-300">&middot;</span>
            <span className="text-red-600">{atRisk} at risk</span>
          </>
        )}
      </div>

      {/* Focus area tags */}
      {strategy.focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {strategy.focusAreas.slice(0, 3).map((name) => (
            <Badge key={name} variant="default" size="sm">
              {name}
            </Badge>
          ))}
          {strategy.focusAreas.length > 3 && (
            <Badge variant="default" size="sm">
              +{strategy.focusAreas.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
