'use client';

import React from 'react';
import { COMPONENTS, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Progress value 0-100 */
  value: number;
  /** Bar thickness — defaults to 'md' */
  size?: 'sm' | 'md';
  /** Fill color — defaults to 'teal' */
  color?: 'teal' | 'emerald' | 'red' | 'amber' | 'blue';
  /** Show percentage label to the right — defaults to false */
  showLabel?: boolean;
  className?: string;
}

// ─── Color mapping ────────────────────────────────────────

const COLOR_MAP: Record<NonNullable<ProgressBarProps['color']>, string> = {
  teal: 'bg-primary',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  blue: 'bg-blue-500',
};

const TRACK_COLOR_MAP: Record<NonNullable<ProgressBarProps['color']>, string> = {
  teal: 'bg-primary/15',
  emerald: 'bg-emerald-100',
  red: 'bg-red-100',
  amber: 'bg-amber-100',
  blue: 'bg-blue-100',
};

const SIZE_MAP: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
};

// ─── Component ────────────────────────────────────────────

export function ProgressBar({
  value,
  size = 'md',
  color = 'teal',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  const bar = (
    <div
      className={cn(
        'rounded-full w-full overflow-hidden',
        TRACK_COLOR_MAP[color],
        SIZE_MAP[size],
        !showLabel && className,
      )}
    >
      <div
        className={cn(
          'rounded-full transition-all duration-500',
          COLOR_MAP[color],
          SIZE_MAP[size],
        )}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );

  if (showLabel) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1">{bar}</div>
        <span className="text-xs font-medium text-gray-500 tabular-nums w-8 text-right">
          {Math.round(clamped)}%
        </span>
      </div>
    );
  }

  return bar;
}

export default ProgressBar;
