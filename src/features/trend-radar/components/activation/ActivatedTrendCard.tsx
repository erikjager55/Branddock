'use client';

import { ZapOff } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/trend-radar-constants';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface ActivatedTrendCardProps {
  trend: DetectedTrendWithMeta;
  onDeactivate: (id: string) => void;
  onClick: (id: string) => void;
}

export function ActivatedTrendCard({ trend, onDeactivate, onClick }: ActivatedTrendCardProps) {
  const categoryConfig = CATEGORY_COLORS[trend.category];
  const activatedDate = trend.activatedAt
    ? new Date(trend.activatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    : null;

  return (
    <button
      onClick={() => onClick(trend.id)}
      className="w-full text-left p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{trend.title}</h3>
          {trend.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{trend.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${categoryConfig.bg} ${categoryConfig.text}`}>
              {categoryConfig.label}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              Score: {trend.relevanceScore}%
            </span>
            {activatedDate && (
              <span className="text-[10px] text-gray-400 ml-auto">
                Activated {activatedDate}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDeactivate(trend.id); }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
          title="Deactivate trend"
        >
          <ZapOff className="w-3 h-3" /> Deactivate
        </button>
      </div>
    </button>
  );
}
