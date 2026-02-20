'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { COMPONENTS, TYPOGRAPHY, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface StatCardProps {
  /** Display label below the value */
  label: string;
  /** The stat value (number or string) */
  value: string | number;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional trend indicator */
  trend?: {
    value: number | string;
    isPositive: boolean;
  };
  /** Optional className override for the value text */
  valueClassName?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────

export function StatCard({ label, value, icon: Icon, trend, valueClassName, className }: StatCardProps) {
  return (
    <div data-testid="stat-card" className={cn(COMPONENTS.card.padded, 'flex flex-col gap-3', className)}>
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

      {/* Value */}
      <div className={cn(TYPOGRAPHY.statValue, valueClassName)}>{value}</div>

      {/* Label + trend */}
      <div className="flex items-center gap-2">
        <span className={TYPOGRAPHY.statLabel}>{label}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              trend.isPositive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {typeof trend.value === 'number' ? `${trend.value}%` : trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
