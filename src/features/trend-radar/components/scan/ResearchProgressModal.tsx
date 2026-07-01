'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Globe,
  Search,
  Brain,
  Check,
  ExternalLink,
  FileSearch,
  ShieldCheck,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal, Button, ProgressBar } from '@/components/shared';
import {
  useResearchProgress,
  useCancelResearch,
  useApproveResearchTrends,
  trendRadarKeys,
} from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { CATEGORY_COLORS, IMPACT_COLORS } from '../../constants/trend-radar-constants';
import type { InsightCategory, ImpactLevel, ResearchPhase } from '../../types/trend-radar.types';

/** Translate function shape (loose i18n typing resolves keys to strings). */
type Translate = (key: string, options?: Record<string, unknown>) => string;

const PHASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  generating_queries: Brain,
  discovering_sources: Search,
  extracting_signals: FileSearch,
  synthesizing: Sparkles,
  validating: ShieldCheck,
  complete: CheckCircle2,
  failed: AlertCircle,
  cancelled: X,
};

const PHASE_I18N: Record<string, { labelKey: string; descriptionKey?: string }> = {
  generating_queries: {
    labelKey: 'phases.generatingQueriesLabel',
    descriptionKey: 'phases.generatingQueriesDescription',
  },
  discovering_sources: {
    labelKey: 'phases.discoveringSourcesLabel',
    descriptionKey: 'phases.discoveringSourcesDescription',
  },
  extracting_signals: {
    labelKey: 'phases.extractingSignalsLabel',
    descriptionKey: 'phases.extractingSignalsDescription',
  },
  synthesizing: {
    labelKey: 'phases.synthesizingLabel',
    descriptionKey: 'phases.synthesizingDescription',
  },
  validating: {
    labelKey: 'phases.validatingLabel',
    descriptionKey: 'phases.validatingDescription',
  },
  complete: { labelKey: 'phases.completeLabel' },
  failed: { labelKey: 'phases.failedLabel' },
  cancelled: { labelKey: 'phases.cancelledLabel' },
};

const PHASE_ORDER: ResearchPhase[] = [
  'generating_queries',
  'discovering_sources',
  'extracting_signals',
  'synthesizing',
  'validating',
];

export function ResearchProgressModal() {
  const { t } = useTranslation('trend-radar');
  const { isResearchProgressModalOpen, closeResearchProgressModal, researchJobId } = useTrendRadarStore();
  const { data: progress } = useResearchProgress(isResearchProgressModalOpen ? researchJobId : null);
  const cancelMutation = useCancelResearch();
  const approveMutation = useApproveResearchTrends();
  const qc = useQueryClient();

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const didInitSelection = useRef(false);

  // Initialize selection when pending trends arrive
  useEffect(() => {
    if (progress?.pendingTrends && progress.pendingTrends.length > 0 && !didInitSelection.current) {
      didInitSelection.current = true;
      setSelectedIndices(new Set(progress.pendingTrends.map((_, i) => i)));
    }
  }, [progress?.pendingTrends]);

  // Reset state when modal opens with new job
  useEffect(() => {
    if (isResearchProgressModalOpen) {
      didInitSelection.current = false;
      setSelectedIndices(new Set());
    }
  }, [isResearchProgressModalOpen, researchJobId]);

  const isRunning = progress?.status === 'RUNNING' || progress?.status === 'PENDING';
  const isComplete = progress?.status === 'COMPLETED';
  const isFailed = progress?.status === 'FAILED';
  const isCancelled = progress?.status === 'CANCELLED';

  const pendingTrends = progress?.pendingTrends ?? [];
  const hasPendingTrends = isComplete && pendingTrends.length > 0;
  const noPendingTrends = isComplete && pendingTrends.length === 0;

  const pct = progress?.progress ?? 0;
  const phaseI18n = progress?.phase ? PHASE_I18N[progress.phase] : null;
  const PhaseIcon = (progress?.phase ? PHASE_ICONS[progress.phase] : null) ?? Sparkles;

  const allSelected = useMemo(
    () => pendingTrends.length > 0 && selectedIndices.size === pendingTrends.length,
    [selectedIndices.size, pendingTrends.length],
  );

  const handleCancel = async () => {
    if (researchJobId) {
      await cancelMutation.mutateAsync(researchJobId);
    }
  };

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(pendingTrends.map((_, i) => i)));
    }
  };

  const handleApprove = async () => {
    if (!researchJobId || selectedIndices.size === 0) return;
    await approveMutation.mutateAsync({
      jobId: researchJobId,
      selectedIndices: Array.from(selectedIndices),
    });
    qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
    qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    closeResearchProgressModal();
  };

  // Get current phase index for the step indicator
  const currentPhaseIndex = progress?.phase
    ? PHASE_ORDER.indexOf(progress.phase as ResearchPhase)
    : -1;

  return (
    <Modal
      isOpen={isResearchProgressModalOpen}
      onClose={closeResearchProgressModal}
      title={t('research.title')}
      size={hasPendingTrends ? 'lg' : 'md'}
    >
      <div className="space-y-4 py-2">
        {/* ── Running State ──────────────────────────────── */}
        {isRunning && (
          <>
            {/* Phase steps indicator */}
            <div className="flex items-center justify-between px-2">
              {PHASE_ORDER.map((phase, idx) => {
                const Icon = PHASE_ICONS[phase];
                const isActive = idx === currentPhaseIndex;
                const isDone = idx < currentPhaseIndex;

                return (
                  <div key={phase} className="flex items-center">
                    <div className={`flex items-center gap-1.5 ${
                      isActive ? 'text-purple-600' : isDone ? 'text-emerald-500' : 'text-gray-300'
                    }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-purple-100' : isDone ? 'bg-emerald-50' : 'bg-gray-50'
                      }`}>
                        {isDone
                          ? <Check className="w-3.5 h-3.5" />
                          : <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                        }
                      </div>
                    </div>
                    {idx < PHASE_ORDER.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        idx < currentPhaseIndex ? 'bg-emerald-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current phase label */}
            <div className="text-center">
              {phaseI18n && (
                <>
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <PhaseIcon className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">{t(phaseI18n.labelKey)}</p>
                  </div>
                  {phaseI18n.descriptionKey && (
                    <p className="text-xs text-gray-500">{t(phaseI18n.descriptionKey)}</p>
                  )}
                  {progress?.currentUrl && (
                    <p className="text-xs text-gray-400 truncate max-w-sm mx-auto mt-0.5">
                      {progress.currentUrl}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Progress bar */}
            {progress && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {getProgressLabel(t, progress.phase as ResearchPhase, progress)}
                  </span>
                  <span className="text-xs font-medium text-gray-600">{pct}%</span>
                </div>
                <ProgressBar
                  value={pct}
                  color="teal"
                  size="md"
                />
              </div>
            )}

            {/* Stats counters */}
            {progress && (
              <div className="flex items-center justify-center gap-6 text-sm">
                {progress.queriesGenerated > 0 && (
                  <div className="text-center">
                    <span className="block text-lg font-bold text-gray-900">{progress.queriesGenerated}</span>
                    <span className="text-xs text-gray-500">{t('stats.queries')}</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.urlsCompleted}</span>
                  <span className="text-xs text-gray-500">{t('stats.urlsScraped')}</span>
                </div>
                {progress.signalsExtracted > 0 && (
                  <div className="text-center">
                    <span className="block text-lg font-bold text-gray-900">{progress.signalsExtracted}</span>
                    <span className="text-xs text-gray-500">{t('stats.signals')}</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.trendsDetected}</span>
                  <span className="text-xs text-gray-500">{t('stats.trends')}</span>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                isLoading={cancelMutation.isPending}
              >
                {t('research.cancelResearch')}
              </Button>
            </div>
          </>
        )}

        {/* ── Complete: Curation UI ──────────────────────── */}
        {hasPendingTrends && (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('progress.completeHeading', { count: pendingTrends.length })}
                </p>
                <p className="text-xs text-gray-500">
                  {progress?.trendsRejected
                    ? t('progress.rejected', { count: progress.trendsRejected })
                    : ''
                  }
                  {t('progress.selectPrompt')}
                </p>
              </div>
            </div>

            {/* Select all / counter */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-primary hover:text-primary-700"
              >
                {allSelected ? t('progress.deselectAll') : t('progress.selectAll')}
              </button>
              <span className="text-xs text-gray-500">
                {t('progress.selectedCount', { selected: selectedIndices.size, total: pendingTrends.length })}
              </span>
            </div>

            {/* Trend list */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {pendingTrends.map((trend, idx) => {
                const isSelected = selectedIndices.has(idx);
                const catConfig = CATEGORY_COLORS[trend.category as InsightCategory];
                const impactConfig = IMPACT_COLORS[trend.impactLevel as ImpactLevel];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIndex(idx)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-primary-300 bg-primary-50/40'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Checkbox */}
                      <div
                        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
                        style={isSelected
                          ? { backgroundColor: 'var(--primary)', border: '1.5px solid var(--primary)' }
                          : { backgroundColor: '#fff', border: '1.5px solid #d1d5db' }
                        }
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {trend.title}
                        </p>

                        {trend.description && (
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                            {trend.description}
                          </p>
                        )}

                        {trend.whyNow && (
                          <p className="text-xs text-gray-500 italic line-clamp-1 mt-0.5">
                            {t('progress.whyNow', { reason: trend.whyNow })}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          {/* Relevance score */}
                          <span className="font-medium text-gray-500">{trend.relevanceScore}%</span>

                          {/* Evidence count */}
                          {trend.evidenceCount && trend.evidenceCount > 1 && (
                            <span>{t('progress.sources', { count: trend.evidenceCount })}</span>
                          )}

                          {/* Category */}
                          {catConfig && (
                            <span>{catConfig.label}</span>
                          )}

                          {/* Impact */}
                          {impactConfig && (
                            <span className={
                              trend.impactLevel === 'CRITICAL' ? 'text-red-500 font-medium'
                                : trend.impactLevel === 'HIGH' ? 'text-amber-500 font-medium'
                                : ''
                            }>
                              {impactConfig.label}
                            </span>
                          )}

                          {/* Source URL */}
                          {trend.sourceUrl && (
                            <a
                              href={trend.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-primary flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {t('progress.sourceLink')}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={closeResearchProgressModal}>
                {t('actions.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                isLoading={approveMutation.isPending}
                disabled={selectedIndices.size === 0}
              >
                {t('progress.addTrends', { count: selectedIndices.size })}
              </Button>
            </div>
          </>
        )}

        {/* ── Complete: No trends found ──────────────────── */}
        {noPendingTrends && (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-gray-600 text-center">
              {t('progress.noTrends')}
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                {t('actions.close')}
              </Button>
            </div>
          </>
        )}

        {/* ── Failed State ───────────────────────────────── */}
        {isFailed && (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-700 text-center">
              {t('progress.failed')}
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                {t('actions.close')}
              </Button>
            </div>
          </>
        )}

        {/* ── Cancelled State ────────────────────────────── */}
        {isCancelled && (
          <>
            <div className="flex justify-center">
              <X className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 text-center">
              {t('progress.cancelled')}
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                {t('actions.close')}
              </Button>
            </div>
          </>
        )}

        {/* ── Errors (shown for all states except curation) ── */}
        {progress && progress.errors.length > 0 && !hasPendingTrends && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 mb-1">{t('progress.errorsLabel')}</p>
            <ul className="space-y-0.5">
              {progress.errors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Get a descriptive progress label for the current phase. */
function getProgressLabel(
  t: Translate,
  phase: ResearchPhase,
  progress: { urlsCompleted: number; urlsTotal: number; sourcesProcessed: number; sourcesTotal: number; queriesGenerated: number },
): string {
  switch (phase) {
    case 'generating_queries':
      return t('progressLabels.generatingQueries');
    case 'discovering_sources':
      return t('progressLabels.urlsFound', { completed: progress.urlsCompleted, total: progress.urlsTotal });
    case 'extracting_signals':
      return progress.sourcesTotal > 0
        ? t('progressLabels.sourcesAnalyzed', { processed: progress.sourcesProcessed, total: progress.sourcesTotal })
        : t('progressLabels.extractingData');
    case 'synthesizing':
      return t('progressLabels.synthesizing');
    case 'validating':
      return t('progressLabels.validating');
    default:
      return '';
  }
}
