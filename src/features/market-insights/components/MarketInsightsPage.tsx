'use client';

import { useState } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState, SkeletonCard, Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { useMarketInsightsStore } from '../stores/useMarketInsightsStore';
import { useInsights, insightKeys } from '../hooks';
import { deleteInsight } from '../api/insights.api';
import { InsightStatsCards } from './InsightStatsCards';
import { InsightSearchFilter } from './InsightSearchFilter';
import { InsightCard } from './InsightCard';
import { AddInsightModal } from './add-modal/AddInsightModal';
import { DeleteConfirmModal } from './detail/DeleteConfirmModal';

interface MarketInsightsPageProps {
  onNavigateToDetail: (id: string) => void;
  onNavigate?: (route: string) => void;
}

export function MarketInsightsPage({ onNavigateToDetail, onNavigate }: MarketInsightsPageProps) {
  const searchQuery = useMarketInsightsStore((s) => s.searchQuery);
  const categoryFilter = useMarketInsightsStore((s) => s.categoryFilter);
  const impactFilter = useMarketInsightsStore((s) => s.impactFilter);
  const timeframeFilter = useMarketInsightsStore((s) => s.timeframeFilter);
  const isAddModalOpen = useMarketInsightsStore((s) => s.isAddModalOpen);
  const setAddModalOpen = useMarketInsightsStore((s) => s.setAddModalOpen);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInsight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
      setDeleteTarget(null);
    },
  });

  const { data, isLoading, isError } = useInsights({
    search: searchQuery || undefined,
    category: categoryFilter ?? undefined,
    impactLevel: impactFilter ?? undefined,
    timeframe: timeframeFilter ?? undefined,
  });

  const insights = data?.insights ?? [];
  const stats = data?.stats ?? { active: 0, highImpact: 0, newThisMonth: 0 };

  return (
    <PageShell>
      <PageHeader
        moduleKey="market-insights"
        title="Market Insights"
        subtitle="Track market trends and competitive intelligence"
        actions={
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Insight
          </Button>
        }
      />

      <div data-testid="market-insights-page" className="space-y-6">
      {/* Stats */}
      <InsightStatsCards stats={stats} />

      {/* Search + Filters */}
      <InsightSearchFilter />

      {/* Grid */}
      {isError ? (
        <div data-testid="error-message" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load market insights</p>
          <p className="text-sm text-red-500 mt-1">Please try again later</p>
        </div>
      ) : isLoading ? (
        <div data-testid="skeleton-loader" className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No insights yet"
          description="Add your first market insight to start tracking trends"
          action={{ label: 'Add Insight', onClick: () => setAddModalOpen(true) }}
        />
      ) : (
        <div data-testid="insights-grid" className="grid grid-cols-2 gap-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onClick={() => onNavigateToDetail(insight.id)}
              onEdit={() => onNavigateToDetail(insight.id)}
              onDelete={() => setDeleteTarget({ id: insight.id, title: insight.title })}
              onUseCampaign={onNavigate ? () => onNavigate('active-campaigns') : undefined}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddInsightModal />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          insightTitle={deleteTarget.title}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      </div>
    </PageShell>
  );
}
