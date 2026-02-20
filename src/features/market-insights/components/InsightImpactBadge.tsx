'use client';

import type { ImpactLevel } from '../types/market-insight.types';
import { IMPACT_BADGE_COLORS } from '../constants/insight-constants';

interface InsightImpactBadgeProps {
  level: ImpactLevel;
}

export function InsightImpactBadge({ level }: InsightImpactBadgeProps) {
  const { bg, text, label } = IMPACT_BADGE_COLORS[level];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${bg} ${text}`}>
      {label}
    </span>
  );
}
