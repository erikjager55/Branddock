'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit3, Trash2, Megaphone } from 'lucide-react';
import type { InsightWithMeta } from '../types/market-insight.types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants/insight-constants';
import { InsightImpactBadge } from './InsightImpactBadge';
import { ScopeTag } from './ScopeTag';
import { RelevanceScoreBar } from './RelevanceScoreBar';
import { TimeframeBadge } from './TimeframeBadge';

interface InsightCardProps {
  insight: InsightWithMeta;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUseCampaign?: () => void;
}

export function InsightCard({ insight, onClick, onEdit, onDelete, onUseCampaign }: InsightCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const addedDate = new Date(insight.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      data-testid="insight-card"
      className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 mr-2">
          {insight.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InsightImpactBadge level={insight.impactLevel} />
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onUseCampaign && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onUseCampaign(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Megaphone className="h-4 w-4" />
                    Use in Campaign
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
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
        {insight.tags.slice(0, 3).map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
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
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
        >
          View Details &gt;
        </button>
      </div>
    </div>
  );
}
