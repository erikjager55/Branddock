'use client';

import React from 'react';
import type { AIRecommendation } from '@/types/ai-analysis';
import { Badge } from '@/components/shared';

const NUMBER_COLORS = [
  'bg-gradient-to-br from-red-500 to-red-600',
  'bg-gradient-to-br from-orange-500 to-orange-600',
  'bg-gradient-to-br from-amber-500 to-amber-600',
  'bg-gradient-to-br from-teal-500 to-teal-600',
  'bg-gradient-to-br from-blue-500 to-blue-600',
];

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
};

interface RecommendationItemProps {
  recommendation: AIRecommendation;
}

export function RecommendationItem({ recommendation }: RecommendationItemProps) {
  const bgColor = NUMBER_COLORS[(recommendation.number - 1) % NUMBER_COLORS.length];
  const priorityVariant = PRIORITY_VARIANT[recommendation.priority] ?? 'default';

  return (
    <div className="flex items-start gap-4 py-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-sm font-bold`}>
        {recommendation.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-gray-900">{recommendation.title}</h4>
          <Badge variant={priorityVariant} size="sm">
            {recommendation.priority}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{recommendation.description}</p>
      </div>
    </div>
  );
}
