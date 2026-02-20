import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useRecommendedAction } from '../../hooks/use-dashboard';

interface RecommendedActionProps {
  onNavigate: (section: string) => void;
}

export function RecommendedAction({ onNavigate }: RecommendedActionProps) {
  const { data } = useRecommendedAction();

  if (!data) return null;

  return (
    <div data-testid="recommended-action" className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-200 text-green-800 rounded-full mb-3">
            <Sparkles className="h-3 w-3" />
            {data.badge}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{data.title}</h3>
          <p className="text-sm text-gray-600">{data.description}</p>
        </div>
      </div>
      <button
        data-testid="recommended-action-button"
        onClick={() => onNavigate(data.actionHref)}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
      >
        {data.actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
