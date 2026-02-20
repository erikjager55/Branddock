import React from 'react';
import {
  ExternalLink,
  Trash2,
  Edit3,
  AlertCircle,
  Cpu,
  Leaf,
  Users,
  ShoppingCart,
  Briefcase,
  Clock,
} from 'lucide-react';
import {
  Modal,
  Button,
  Badge,
  ProgressBar,
  Skeleton,
} from '@/components/shared';
import { useInsightDetail, useDeleteInsight } from '@/contexts/MarketInsightsContext';
import { useMarketInsightsStore } from '@/stores/useMarketInsightsStore';
import type { InsightCategory, ImpactLevel, InsightScope, InsightTimeframe } from '@/types/market-insight';

// ─── Mappings (shared with InsightCard) ────────────────────

const CATEGORY_ICON: Record<InsightCategory, React.ElementType> = {
  TECHNOLOGY: Cpu,
  ENVIRONMENTAL: Leaf,
  SOCIAL: Users,
  CONSUMER: ShoppingCart,
  BUSINESS: Briefcase,
};

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  TECHNOLOGY: 'Technology',
  ENVIRONMENTAL: 'Environmental',
  SOCIAL: 'Social',
  CONSUMER: 'Consumer',
  BUSINESS: 'Business',
};

const IMPACT_VARIANT: Record<ImpactLevel, 'danger' | 'warning' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

const SCOPE_VARIANT: Record<InsightScope, 'info' | 'default' | 'warning'> = {
  MICRO: 'info',
  MESO: 'default',
  MACRO: 'warning',
};

const TIMEFRAME_LABEL: Record<InsightTimeframe, string> = {
  SHORT_TERM: 'Short term',
  MEDIUM_TERM: 'Medium term',
  LONG_TERM: 'Long term',
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  AI_RESEARCH: 'AI Research',
  IMPORTED: 'Imported',
};

// ─── Score color for ProgressBar ────────────────────────────

function scoreBarColor(score: number): 'teal' | 'amber' | 'red' {
  if (score >= 75) return 'teal';
  if (score >= 50) return 'amber';
  return 'red';
}

// ─── Component ─────────────────────────────────────────────

export function InsightDetailModal() {
  const selectedInsightId = useMarketInsightsStore((s) => s.selectedInsightId);
  const setSelectedInsightId = useMarketInsightsStore((s) => s.setSelectedInsightId);

  const { data: insight, isLoading, error } = useInsightDetail(selectedInsightId ?? undefined);
  const deleteMutation = useDeleteInsight();

  const handleClose = () => setSelectedInsightId(null);

  const handleDelete = () => {
    if (!selectedInsightId) return;
    deleteMutation.mutate(selectedInsightId, {
      onSuccess: () => setSelectedInsightId(null),
    });
  };

  // Determine modal title based on state
  const title = error
    ? 'Error Loading Insight'
    : insight?.title ?? 'Loading...';

  const subtitle = error
    ? (error.message || 'Something went wrong. Please try again.')
    : undefined;

  return (
    <Modal
      isOpen={!!selectedInsightId}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        insight && !isLoading ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Edit3} disabled>
              Edit
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4 py-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 py-4">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error.message || 'Something went wrong. Please try again.'}</p>
        </div>
      )}

      {/* Loaded state */}
      {insight && !isLoading && (
        <div className="space-y-6">
          {/* Header badges */}
          <div className="flex items-center gap-2">
            {(() => {
              const CategoryIcon = CATEGORY_ICON[insight.category];
              return (
                <Badge icon={CategoryIcon}>
                  {CATEGORY_LABEL[insight.category]}
                </Badge>
              );
            })()}
            <Badge variant={IMPACT_VARIANT[insight.impactLevel]}>
              {insight.impactLevel} Impact
            </Badge>
          </div>

          {/* Full description */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {insight.description || 'No description provided.'}
          </p>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Scope</span>
              <div className="mt-1">
                <Badge variant={SCOPE_VARIANT[insight.scope]}>{insight.scope}</Badge>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Timeframe</span>
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-700">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {TIMEFRAME_LABEL[insight.timeframe]}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Source</span>
              <p className="mt-1 text-sm text-gray-700">
                {SOURCE_LABEL[insight.source] || insight.source}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Created</span>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(insight.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Relevance score */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Relevance Score</span>
              <span className="text-sm font-medium text-gray-700">{insight.relevanceScore}%</span>
            </div>
            <ProgressBar
              value={insight.relevanceScore}
              color={scoreBarColor(insight.relevanceScore)}
            />
          </div>

          {/* Industries */}
          {insight.industries.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                Industries
              </span>
              <div className="flex flex-wrap gap-2">
                {insight.industries.map((industry) => (
                  <Badge key={industry}>{industry}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source URLs */}
          {insight.sourceUrls.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                Sources
              </span>
              <ul className="space-y-2">
                {insight.sourceUrls.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How to Use */}
          {insight.howToUse.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                How to Use
              </span>
              <ol className="space-y-2 list-decimal list-inside">
                {insight.howToUse.map((item, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
