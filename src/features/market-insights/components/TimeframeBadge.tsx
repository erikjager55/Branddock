'use client';

import { Clock } from 'lucide-react';
import type { InsightTimeframe } from '../types/market-insight.types';
import { TIMEFRAME_BADGES } from '../constants/insight-constants';

interface TimeframeBadgeProps {
  timeframe: InsightTimeframe;
}

export function TimeframeBadge({ timeframe }: TimeframeBadgeProps) {
  const { bg, text, label } = TIMEFRAME_BADGES[timeframe];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${bg} ${text}`}>
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
