'use client';

import { Zap, X, AlertTriangle } from 'lucide-react';
import { CATEGORY_COLORS, IMPACT_COLORS } from '../../constants/trend-radar-constants';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface AlertCardProps {
  trend: DetectedTrendWithMeta;
  onActivate: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick: (id: string) => void;
}

export function AlertCard({ trend, onActivate, onDismiss, onClick }: AlertCardProps) {
  const categoryConfig = CATEGORY_COLORS[trend.category];
  const impactConfig = IMPACT_COLORS[trend.impactLevel];

  return (
    <button
      onClick={() => onClick(trend.id)}
      className="w-full text-left p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:border-amber-300 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{trend.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onActivate(trend.id); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
              >
                <Zap className="w-3 h-3" /> Activate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(trend.id); }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
          {trend.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{trend.description}</p>
          )}
          {trend.rawExcerpt && (
            <p className="text-xs text-amber-700 bg-amber-100/50 rounded px-2 py-1 mt-2 line-clamp-2 italic">
              &ldquo;{trend.rawExcerpt}&rdquo;
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${categoryConfig.bg} ${categoryConfig.text}`}>
              {categoryConfig.label}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${impactConfig.bg} ${impactConfig.text}`}>
              {impactConfig.label}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">
              Score: {trend.relevanceScore}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
