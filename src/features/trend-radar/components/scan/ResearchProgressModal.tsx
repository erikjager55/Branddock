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
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, ProgressBar, Badge } from '@/components/shared';
import {
  useResearchProgress,
  useCancelResearch,
  useApproveResearchTrends,
  trendRadarKeys,
} from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { CATEGORY_COLORS, IMPACT_COLORS, getRelevanceBg } from '../../constants/trend-radar-constants';
import type { InsightCategory, ImpactLevel } from '../../types/trend-radar.types';

const PHASE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  generating_urls: { label: 'Finding relevant sources...', icon: Search },
  scraping: { label: 'Scraping web content...', icon: Globe },
  analyzing: { label: 'Analyzing for trends...', icon: Brain },
  complete: { label: 'Research complete!', icon: CheckCircle2 },
  failed: { label: 'Research failed', icon: AlertCircle },
  cancelled: { label: 'Research cancelled', icon: X },
};

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
  const phaseInfo = progress?.phase ? PHASE_LABELS[progress.phase] : null;
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
            <div className="flex justify-center">
              <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
            </div>

            <div className="text-center">
              {phaseInfo && (
                <>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <PhaseIcon className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">{phaseInfo.label}</p>
                  </div>
                  {progress?.currentUrl && (
                    <p className="text-xs text-gray-500 truncate max-w-sm mx-auto">
                      {progress.currentUrl}
                    </p>
                  )}
                </>
              )}
            </div>

            {progress && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {progress.urlsCompleted}/{progress.urlsTotal} URLs processed
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

            {progress && (
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.trendsDetected}</span>
                  <span className="text-xs text-gray-500">Trends found</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-gray-900">{progress.urlsCompleted}</span>
                  <span className="text-xs text-gray-500">URLs scraped</span>
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
                  Research complete — {pendingTrends.length} trend{pendingTrends.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-gray-500">
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
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
                        ? 'border-teal-300 bg-teal-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {trend.title}
                          </p>
                        </div>

                        {trend.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {trend.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Relevance score */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getRelevanceBg(trend.relevanceScore)}`}
                                style={{ width: `${trend.relevanceScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">
                              {trend.relevanceScore}%
                            </span>
                          </div>

                          {/* Category badge */}
                          {catConfig && (
                            <Badge variant="default">
                              <span className={catConfig.text}>{catConfig.label}</span>
                            </Badge>
                          )}

                          {/* Impact badge */}
                          {impactConfig && (
                            <Badge variant={
                              trend.impactLevel === 'CRITICAL' ? 'danger'
                                : trend.impactLevel === 'HIGH' ? 'warning'
                                : 'default'
                            }>
                              {impactConfig.label}
                            </Badge>
                          )}

                          {/* Source URL */}
                          {trend.sourceUrl && (
                            <a
                              href={trend.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-0.5"
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
              Research complete, but no relevant trends were detected. Try a different search query.
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
