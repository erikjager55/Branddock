'use client';

import { Users, Target, Heart, Zap, Brain, TrendingUp } from 'lucide-react';
import type { DimensionConfig, DimensionInsight } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Target, Heart, Zap, Brain, TrendingUp,
};

const DIMENSION_STYLES: Record<string, { bg: string; border: string; iconBg: string; iconColor: string }> = {
  demographics: { bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', iconColor: '#2563eb' },
  goals_motivations: { bg: '#fefce8', border: '#fde68a', iconBg: '#fef3c7', iconColor: '#d97706' },
  challenges_frustrations: { bg: '#fdf2f8', border: '#fbcfe8', iconBg: '#fce7f3', iconColor: '#db2777' },
  value_proposition: { bg: '#f5f3ff', border: '#ddd6fe', iconBg: '#ede9fe', iconColor: '#7c3aed' },
  psychographics: { bg: '#fdf2f8', border: '#fbcfe8', iconBg: '#fce7f3', iconColor: '#db2777' },
  behaviors: { bg: '#f5f3ff', border: '#ddd6fe', iconBg: '#ede9fe', iconColor: '#7c3aed' },
};

const DEFAULT_STYLE = { bg: '#f9fafb', border: '#e5e7eb', iconBg: '#f3f4f6', iconColor: '#6b7280' };

interface AIExplorationDimensionCardProps {
  dimension: DimensionInsight;
  dimensionConfigs: DimensionConfig[];
}

export function AIExplorationDimensionCard({
  dimension,
  dimensionConfigs,
}: AIExplorationDimensionCardProps) {
  const IconComponent = ICON_MAP[dimension.icon] ?? Users;
  const style = DIMENSION_STYLES[dimension.key] ?? DEFAULT_STYLE;

  return (
    <div
      className="rounded-xl p-5 transition-all hover:shadow-md"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: style.iconBg }}
        >
          <IconComponent className="h-5 w-5" style={{ color: style.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: '#111827' }}>{dimension.title}</h4>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{dimension.summary}</p>
        </div>
      </div>
    </div>
  );
}
