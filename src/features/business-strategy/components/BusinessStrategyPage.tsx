'use client';

import { Plus } from 'lucide-react';
import { EmptyState, SkeletonCard, Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Target } from 'lucide-react';
import { useStrategies, useStrategyStats } from '../hooks';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import { SummaryStats } from './SummaryStats';
import { StrategyCard } from './StrategyCard';
import { CreateStrategyModal } from './CreateStrategyModal';

interface BusinessStrategyPageProps {
  onNavigateToDetail?: (strategyId: string) => void;
  onNavigate?: (route: string) => void;
}

export function BusinessStrategyPage({ onNavigateToDetail, onNavigate }: BusinessStrategyPageProps) {
  const { data: strategiesData, isLoading: strategiesLoading } = useStrategies();
  const { data: statsData, isLoading: statsLoading } = useStrategyStats();
  const { setCreateModalOpen, setSelectedStrategyId } = useBusinessStrategyStore();

  const strategies = strategiesData?.strategies ?? [];

  const handleStrategyClick = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    onNavigateToDetail?.(strategyId);
  };

  return (
    <PageShell>
      <PageHeader
        moduleKey="business-strategy"
        title="Business Strategy"
        subtitle="Define and track your strategic goals"
        actions={
          <Button data-testid="add-strategy-button" onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Strategy
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="mb-6">
        <SummaryStats stats={statsData} isLoading={statsLoading} />
      </div>

      {/* Strategy Grid */}
      {strategiesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No strategies yet"
          description="Create your first business strategy to define and track your goals."
          action={{
            label: 'Create Strategy',
            onClick: () => setCreateModalOpen(true),
          }}
        />
      ) : (
        <div data-testid="strategy-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy) => (
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
