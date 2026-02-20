'use client';

// =============================================================
// UsageMeter — AI token usage progress bar
//
// Shows current AI token usage vs limit with color coding:
// - Green (teal): < 50%
// - Amber: 50-80%
// - Red: > 80%
// =============================================================

import React from 'react';
import { Brain } from 'lucide-react';
import { ProgressBar } from '@/components/shared';
import { formatLimit } from '@/lib/constants/plan-limits';
import { cn } from '@/lib/constants/design-tokens';

interface UsageMeterProps {
  used: number;
  limit: number;
  className?: string;
  compact?: boolean;
}

function getBarColor(percentage: number): 'teal' | 'amber' | 'red' {
  if (percentage > 80) return 'red';
  if (percentage >= 50) return 'amber';
  return 'teal';
}

function getTextColor(percentage: number): string {
  if (percentage > 80) return 'text-red-600';
  if (percentage >= 50) return 'text-amber-600';
  return 'text-gray-500';
}

export function UsageMeter({ used, limit, className, compact = false }: UsageMeterProps) {
  const percentage = limit > 0 && isFinite(limit)
    ? Math.min(100, Math.round((used / limit) * 100))
    : 0;
  const color = getBarColor(percentage);
  const textColor = getTextColor(percentage);

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        <ProgressBar value={percentage} color={color} size="sm" />
        <p className={cn('text-[10px] tabular-nums', textColor)}>
          {formatLimit(used)} / {formatLimit(limit)} AI tokens
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">AI Tokens</span>
        </div>
        <span className={cn('text-xs font-medium tabular-nums', textColor)}>
          {percentage}%
        </span>
      </div>
      <ProgressBar value={percentage} color={color} size="md" />
      <p className="text-xs text-gray-500 tabular-nums">
        {formatLimit(used)} / {formatLimit(limit)} used
      </p>
    </div>
  );
}
