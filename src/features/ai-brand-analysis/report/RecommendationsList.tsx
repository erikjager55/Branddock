'use client';

import React from 'react';
import type { AIRecommendation } from '@/types/ai-analysis';
import { RecommendationItem } from './RecommendationItem';

interface RecommendationsListProps {
  recommendations: AIRecommendation[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const sorted = [...safeRecommendations].sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Recommendations</h3>
      <div className="divide-y divide-gray-100">
        {sorted.map((rec) => (
          <RecommendationItem key={rec.number} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}
