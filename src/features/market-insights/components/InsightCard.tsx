'use client';

import { MoreVertical } from 'lucide-react';
import type { InsightWithMeta } from '../types/market-insight.types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants/insight-constants';
import { InsightImpactBadge } from './InsightImpactBadge';
import { ScopeTag } from './ScopeTag';
import { RelevanceScoreBar } from './RelevanceScoreBar';
import { TimeframeBadge } from './TimeframeBadge';

interface InsightCardProps {
  insight: InsightWithMeta;
  onClick: () => void;
}

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const addedDate = new Date(insight.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div data-testid="insight-card" className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 mr-2">
          {insight.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InsightImpactBadge level={insight.impactLevel} />
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${CATEGORY_COLORS[insight.category]}`}>
          {CATEGORY_LABELS[insight.category]}
        </span>
        <ScopeTag scope={insight.scope} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {insight.description}
      </p>

      {/* Relevance bar */}
      <div className="mb-3">
        <RelevanceScoreBar score={insight.relevanceScore} />
      </div>

      {/* Timeframe */}
      <div className="mb-3">
        <TimeframeBadge timeframe={insight.timeframe} />
      </div>

      {/* Keyword tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {insight.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 border border-gray-200 text-gray-600 text-xs rounded"
          >
            {tag}
          </span>
        ))}
        {insight.tags.length > 3 && (
          <span className="text-xs text-gray-400">
            +{insight.tags.length - 3} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{addedDate}</span>
        <button
          onClick={onClick}
          className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
        >
          View Details &gt;
        </button>
      </div>
    </div>
  );
}
