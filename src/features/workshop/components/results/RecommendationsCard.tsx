'use client';

import { Target, CheckCircle, Circle } from 'lucide-react';

interface RecommendationItem {
  id: string;
  order: number;
  content: string;
  isCompleted: boolean;
}

interface RecommendationsCardProps {
  recommendations: RecommendationItem[];
}

export function RecommendationsCard({
  recommendations,
}: RecommendationsCardProps) {
  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  if (safeRecommendations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Recommendations
        </h3>
      </div>
      <div className="space-y-3">
        {safeRecommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg"
          >
            {rec.isCompleted ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-gray-700 leading-relaxed">
              {rec.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
