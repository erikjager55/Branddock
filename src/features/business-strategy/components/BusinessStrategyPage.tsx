'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { EmptyState, SkeletonCard, Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Target } from 'lucide-react';
import { useStrategies, useStrategyStats } from '../hooks';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import { SummaryStats } from './SummaryStats';
import { StrategyCard } from './StrategyCard';
import { StrategyFilterBar } from './StrategyFilterBar';
import { CreateStrategyModal } from './CreateStrategyModal';
import type { StrategyWithMeta } from '../types/business-strategy.types';

interface BusinessStrategyPageProps {
  onNavigateToDetail?: (strategyId: string) => void;
  onNavigate?: (route: string) => void;
}

export function BusinessStrategyPage({ onNavigateToDetail, onNavigate }: BusinessStrategyPageProps) {
  const { t } = useTranslation('business-strategy');
  const { data: strategiesData, isLoading: strategiesLoading } = useStrategies();
  const { data: statsData, isLoading: statsLoading } = useStrategyStats();
  const {
    setCreateModalOpen,
    setSelectedStrategyId,
    searchQuery,
    statusFilter,
    typeFilter,
    sortBy,
    sortOrder,
  } = useBusinessStrategyStore();

  const strategies = strategiesData?.strategies ?? [];

  const filteredAndSorted = useMemo(() => {
    let result = [...strategies];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.focusAreas.some((fa) => fa.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((s) => s.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'progress':
          cmp = a.progressPercentage - b.progressPercentage;
          break;
        case 'startDate':
          cmp = (a.startDate ?? '').localeCompare(b.startDate ?? '');
          break;
        case 'updatedAt':
        default:
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [strategies, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  const handleStrategyClick = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    onNavigateToDetail?.(strategyId);
  };

  return (
    <PageShell>
      <PageHeader
        moduleKey="business-strategy"
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          <Button data-testid="add-strategy-button" onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('page.addStrategy')}
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="mb-6">
        <SummaryStats stats={statsData} isLoading={statsLoading} />
      </div>

      {/* Filter Bar */}
      <div className="mb-4">
        <StrategyFilterBar />
      </div>

      {/* Strategy Grid */}
      {strategiesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        strategies.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('page.emptyTitle')}
            description={t('page.emptyDescription')}
            action={{
              label: t('actions.createStrategy'),
              onClick: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <EmptyState
            icon={Target}
            title={t('page.noMatchTitle')}
            description={t('page.noMatchDescription')}
          />
        )
      ) : (
        <div data-testid="strategy-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onClick={() => handleStrategyClick(strategy.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateStrategyModal onNavigateToDetail={onNavigateToDetail} />
    </PageShell>
  );
}
