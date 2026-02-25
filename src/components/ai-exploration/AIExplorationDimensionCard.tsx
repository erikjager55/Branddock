'use client';

import type { LucideIcon } from 'lucide-react';
import { Users } from 'lucide-react';
import type { DimensionInsight, DimensionConfig } from './types';

interface AIExplorationDimensionCardProps {
  dimension: DimensionInsight;
  /** Optional: pass dimension configs to resolve icon/color dynamically */
  dimensionConfigs?: DimensionConfig[];
}

export function AIExplorationDimensionCard({
  dimension,
  dimensionConfigs,
}: AIExplorationDimensionCardProps) {
  // Try to find the matching config for icon/color
  const config = dimensionConfigs?.find((c) => c.key === dimension.key);
  const Icon: LucideIcon = config?.icon ?? Users;
  const bgClass = config?.bgClass ?? 'bg-gray-100';
  const textClass = config?.textClass ?? 'text-gray-600';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgClass}`}>
          <Icon className={`w-5 h-5 ${textClass}`} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{dimension.title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{dimension.summary}</p>
    </div>
  );
}
