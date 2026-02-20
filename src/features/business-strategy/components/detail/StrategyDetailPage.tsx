'use client';

import { useState } from 'react';
import { ArrowLeft, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import { Badge, Button, SkeletonCard, SkeletonText } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { STRATEGY_TYPES, STRATEGY_STATUS_COLORS } from '../../constants/strategy-types';
import {
  useStrategyDetail,
  useUpdateContext,
  useUpdateKeyResult,
  useDeleteObjective,
  useArchiveStrategy,
  useDeleteStrategy,
  useRecalculateProgress,
} from '../../hooks';
import { useBusinessStrategyStore } from '../../stores/useBusinessStrategyStore';
import type { KeyResultStatus, UpdateContextBody } from '../../types/business-strategy.types';
import { StrategyProgressSection } from './StrategyProgressSection';
import { StrategicContextSection } from './StrategicContextSection';
import { ObjectiveCard } from './ObjectiveCard';
import { AddObjectiveModal } from './AddObjectiveModal';
import { FocusAreaCards } from './FocusAreaCards';
import { LinkedCampaignsSection } from './LinkedCampaignsSection';
import { MilestoneTimeline } from './MilestoneTimeline';
import { AddMilestoneModal } from './AddMilestoneModal';

interface StrategyDetailPageProps {
  strategyId: string;
  onNavigateBack: () => void;
}

export function StrategyDetailPage({ strategyId, onNavigateBack }: StrategyDetailPageProps) {
  const { data: strategy, isLoading, error } = useStrategyDetail(strategyId);
  const updateContext = useUpdateContext(strategyId);
  const archiveStrategy = useArchiveStrategy(strategyId);
  const deleteStrategy = useDeleteStrategy(strategyId);
  const recalculate = useRecalculateProgress(strategyId);

  const { isAddObjectiveModalOpen, setAddObjectiveModalOpen, isAddMilestoneModalOpen, setAddMilestoneModalOpen } =
    useBusinessStrategyStore();

  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const handleContextUpdate = (data: UpdateContextBody) => {
    updateContext.mutate(data);
  };

  const handleArchive = () => {
    setShowHeaderMenu(false);
    archiveStrategy.mutate(undefined);
  };

  const handleDelete = () => {
    setShowHeaderMenu(false);
    if (confirm('Are you sure you want to delete this strategy? This cannot be undone.')) {
      deleteStrategy.mutate(undefined, {
        onSuccess: () => onNavigateBack(),
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-6">
          <SkeletonText className="w-40 h-6" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-64" />
        </div>
      </PageShell>
    );
  }

  // Error state
  if (error || !strategy) {
    return (
      <PageShell maxWidth="5xl">
        <button onClick={onNavigateBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Strategies
        </button>
        <div className="p-8 bg-white border border-gray-200 rounded-lg text-center">
          <p className="text-gray-500">Strategy not found or failed to load.</p>
          <Button variant="secondary" size="sm" onClick={onNavigateBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </PageShell>
    );
  }

  const typeInfo = STRATEGY_TYPES.find((t) => t.key === strategy.type);
  const statusColors = STRATEGY_STATUS_COLORS[strategy.status];

  return (
    <PageShell maxWidth="5xl">
      <div className="space-y-6">
        {/* Back link */}
        <button
          data-testid="strategy-back-link"
          onClick={onNavigateBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Strategies
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 data-testid="strategy-detail-name" className="text-2xl font-bold text-gray-900">{strategy.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              {typeInfo && (
                <Badge variant="default" size="sm">{typeInfo.label}</Badge>
              )}
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                {strategy.status}
              </span>
            </div>
            {strategy.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl">{strategy.description}</p>
            )}
          </div>

          <div className="relative">
            <button
              data-testid="strategy-header-menu"
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showHeaderMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-44">
                <button
                  onClick={handleArchive}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="w-4 h-4" />
                  {strategy.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Delete Strategy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <StrategyProgressSection strategy={strategy} />

        {/* Strategic Context */}
        <StrategicContextSection
          strategy={strategy}
          onUpdate={handleContextUpdate}
          isUpdating={updateContext.isPending}
        />

        {/* Objectives */}
        <div data-testid="objectives-section" className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Objectives</h2>
            <Button data-testid="add-objective-button" variant="cta" size="sm" onClick={() => setAddObjectiveModalOpen(true)}>
              Add Objective
            </Button>
          </div>

          {strategy.objectives.length > 0 ? (
            <div className="space-y-3">
              {strategy.objectives.map((obj) => (
                <ObjectiveCardWithHooks
                  key={obj.id}
                  objective={obj}
                  strategyId={strategyId}
                  onRecalculate={() => recalculate.mutate(undefined)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No objectives defined yet</p>
          )}
        </div>

        {/* Focus Areas */}
        <FocusAreaCards focusAreas={strategy.focusAreaDetails} strategyId={strategyId} />

        {/* Linked Campaigns (stub) */}
        <LinkedCampaignsSection />

        {/* Milestones */}
        <MilestoneTimeline
          milestones={strategy.milestones}
          onAdd={() => setAddMilestoneModalOpen(true)}
        />

        {/* Modals */}
        <AddObjectiveModal
          isOpen={isAddObjectiveModalOpen}
          onClose={() => setAddObjectiveModalOpen(false)}
          strategyId={strategyId}
          focusAreas={strategy.focusAreaDetails}
        />
        <AddMilestoneModal
          isOpen={isAddMilestoneModalOpen}
          onClose={() => setAddMilestoneModalOpen(false)}
          strategyId={strategyId}
        />
      </div>
    </PageShell>
  );
}

// ─── Helper wrapper to attach mutation hooks per objective ──

function ObjectiveCardWithHooks({
  objective,
  strategyId,
  onRecalculate,
}: {
  objective: import('../../types/business-strategy.types').ObjectiveWithKeyResults;
  strategyId: string;
  onRecalculate: () => void;
}) {
  const updateKR = useUpdateKeyResult(strategyId, objective.id);
  const deleteObjective = useDeleteObjective(strategyId, objective.id);

  const handleKRStatusToggle = (keyResultId: string, newStatus: KeyResultStatus) => {
    updateKR.mutate(
      { keyResultId, data: { status: newStatus } },
      { onSuccess: () => onRecalculate() },
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete objective "${objective.title}"?`)) {
      deleteObjective.mutate(undefined, { onSuccess: () => onRecalculate() });
    }
  };

  return (
    <ObjectiveCard
      objective={objective}
      strategyId={strategyId}
      onDelete={handleDelete}
      onKeyResultStatusToggle={handleKRStatusToggle}
    />
  );
}
