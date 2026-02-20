'use client';

import { Users, TrendingUp, Heart, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DimensionInsight } from '../../types/persona-analysis.types';

const DIMENSION_STYLES: Record<string, { Icon: LucideIcon; bg: string; color: string }> = {
  demographics: { Icon: Users, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  goals_motivations: { Icon: TrendingUp, bg: 'bg-blue-100', color: 'text-blue-600' },
  challenges_frustrations: { Icon: Heart, bg: 'bg-pink-100', color: 'text-pink-600' },
  value_proposition: { Icon: Zap, bg: 'bg-amber-100', color: 'text-amber-600' },
};

interface DimensionInsightCardProps {
  dimension: DimensionInsight;
}

export function DimensionInsightCard({ dimension }: DimensionInsightCardProps) {
  const style = DIMENSION_STYLES[dimension.key] ?? {
    Icon: Users,
    bg: 'bg-gray-100',
    color: 'text-gray-600',
  };
  const { Icon } = style;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${style.bg}`}>
          <Icon className={`w-5 h-5 ${style.color}`} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{dimension.title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{dimension.summary}</p>
    </div>
  );
}
