'use client';

import React from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { Button, Badge, ProgressBar, EmptyState } from '@/components/shared';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import { useResearchInsights } from '../../hooks/studio.hooks';

// ─── Types ─────────────────────────────────────────────

interface ResearchInsightsSectionProps {
  deliverableId: string;
}

// ─── Component ─────────────────────────────────────────

export function ResearchInsightsSection({ deliverableId }: ResearchInsightsSectionProps) {
  const { data: insights, isLoading } = useResearchInsights(deliverableId);
  const setIsInsertModalOpen = useContentStudioStore((s) => s.setIsInsertModalOpen);
  const setSelectedInsightId = useContentStudioStore((s) => s.setSelectedInsightId);

  const handleInsert = (insightId: string) => {
    setSelectedInsightId(insightId);
    setIsInsertModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-40" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-gray-900">Research Insights</h3>
      </div>

      {/* Insights list or empty state */}
      {!Array.isArray(insights) || insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No research insights available"
          description="Research insights will appear here when linked to this deliverable."
        />
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-3 rounded-lg border border-gray-200 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {insight.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {insight.source && (
                      <Badge variant="default" size="sm">
                        {insight.source}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => handleInsert(insight.id)}
                >
                  Insert
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Relevance</span>
                <div className="flex-1">
                  <ProgressBar
                    value={insight.relevanceScore * 100}
                    size="sm"
                    color="teal"
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {Math.round(insight.relevanceScore * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResearchInsightsSection;
