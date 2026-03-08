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

const PHASE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  generating_queries: {
    label: 'Generating research strategy...',
    icon: Brain,
    description: 'Creating diverse search queries from multiple angles',
  },
  discovering_sources: {
    label: 'Searching diverse sources...',
    icon: Search,
    description: 'Finding articles from news, research, reports, and blogs',
  },
  extracting_signals: {
    label: 'Extracting data signals...',
    icon: FileSearch,
    description: 'Pulling structured facts, statistics, and evidence from sources',
  },
  synthesizing: {
    label: 'Cross-referencing signals...',
    icon: Sparkles,
    description: 'Clustering related signals into emerging trends',
  },
  validating: {
    label: 'Validating trend quality...',
    icon: ShieldCheck,
    description: 'Scoring novelty, evidence strength, and strategic relevance',
  },
  complete: {
    label: 'Research complete!',
    icon: CheckCircle2,
    description: '',
  },
  failed: {
    label: 'Research failed',
    icon: AlertCircle,
    description: '',
  },
  cancelled: {
    label: 'Research cancelled',
    icon: X,
    description: '',
  },
};

const PHASE_ORDER: ResearchPhase[] = [
  'generating_queries',
  'discovering_sources',
  'extracting_signals',
  'synthesizing',
  'validating',
];

export function ResearchProgressModal() {
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
  const phaseInfo = progress?.phase ? PHASE_CONFIG[progress.phase] : null;
  const PhaseIcon = phaseInfo?.icon ?? Sparkles;

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
      title="AI Research"
      size={hasPendingTrends ? 'lg' : 'md'}
    >
      <div className="space-y-4 py-2">
        {/* ── Running State ──────────────────────────────── */}
        {isRunning && (
          <>
            {/* Phase steps indicator */}
            <div className="flex items-center justify-between px-2">
              {PHASE_ORDER.map((phase, idx) => {
                const config = PHASE_CONFIG[phase];
                const Icon = config.icon;
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
              {phaseInfo && (
                <>
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <PhaseIcon className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">{phaseInfo.label}</p>
                  </div>
                  {phaseInfo.description && (
                    <p className="text-xs text-gray-500">{phaseInfo.description}</p>
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
                    {getProgressLabel(progress.phase as ResearchPhase, progress)}
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
                    <span className="text-xs text-gray-500">Queries</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.urlsCompleted}</span>
                  <span className="text-xs text-gray-500">URLs scraped</span>
                </div>
                {progress.signalsExtracted > 0 && (
                  <div className="text-center">
                    <span className="block text-lg font-bold text-gray-900">{progress.signalsExtracted}</span>
                    <span className="text-xs text-gray-500">Signals</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.trendsDetected}</span>
                  <span className="text-xs text-gray-500">Trends</span>
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
                Cancel Research
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
                  Research complete — {pendingTrends.length} trend{pendingTrends.length !== 1 ? 's' : ''} passed quality review
                </p>
                <p className="text-xs text-gray-500">
                  {progress?.trendsRejected
                    ? `${progress.trendsRejected} trend${progress.trendsRejected !== 1 ? 's' : ''} filtered out for low quality. `
                    : ''
                  }
                  Select which trends to add to your Trend Radar.
                </p>
              </div>
            </div>

            {/* Select all / counter */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-gray-500">
                {selectedIndices.size} of {pendingTrends.length} selected
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
                        ? 'border-teal-300 bg-teal-50/40'
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
                            Why now: {trend.whyNow}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          {/* Relevance score */}
                          <span className="font-medium text-gray-500">{trend.relevanceScore}%</span>

                          {/* Evidence count */}
                          {trend.evidenceCount && trend.evidenceCount > 1 && (
                            <span>{trend.evidenceCount} sources</span>
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
                              className="hover:text-teal-600 flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
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
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                isLoading={approveMutation.isPending}
                disabled={selectedIndices.size === 0}
              >
                Add {selectedIndices.size} Trend{selectedIndices.size !== 1 ? 's' : ''}
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
              Research complete, but no trends passed quality review. Try a different or more specific search query.
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                Close
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
              Research failed. Please try again.
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                Close
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
              Research cancelled.
            </p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={closeResearchProgressModal}>
                Close
              </Button>
            </div>
          </>
        )}

        {/* ── Errors (shown for all states except curation) ── */}
        {progress && progress.errors.length > 0 && !hasPendingTrends && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
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
  phase: ResearchPhase,
  progress: { urlsCompleted: number; urlsTotal: number; sourcesProcessed: number; sourcesTotal: number; queriesGenerated: number },
): string {
  switch (phase) {
    case 'generating_queries':
      return 'Generating search queries...';
    case 'discovering_sources':
      return `${progress.urlsCompleted}/${progress.urlsTotal} URLs found`;
    case 'extracting_signals':
      return progress.sourcesTotal > 0
        ? `${progress.sourcesProcessed}/${progress.sourcesTotal} sources analyzed`
        : 'Extracting data...';
    case 'synthesizing':
      return 'Synthesizing trends...';
    case 'validating':
      return 'Quality validation...';
    default:
      return '';
  }
}
