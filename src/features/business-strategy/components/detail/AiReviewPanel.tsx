'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared';
import { useAiReview } from '../../hooks';
import type { AiReviewResponse } from '../../types/business-strategy.types';

interface AiReviewPanelProps {
  strategyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const SCORE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  high: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  low: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
};

function getScoreLevel(score: number) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 7) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (score >= 4) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <AlertTriangle className="w-4 h-4 text-red-500" />;
}

export function AiReviewPanel({ strategyId, isOpen, onClose }: AiReviewPanelProps) {
  const aiReview = useAiReview(strategyId);
  const [review, setReview] = useState<AiReviewResponse | null>(null);

  const handleGenerate = () => {
    setReview(null);
    aiReview.mutate(undefined, {
      onSuccess: (data) => setReview(data.review),
    });
  };

  // Reset mutation error state when panel opens
  useEffect(() => {
    if (isOpen) {
      aiReview.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overallLevel = review ? getScoreLevel(review.overallScore) : null;
  const overallColors = overallLevel ? SCORE_COLORS[overallLevel] ?? SCORE_COLORS.medium : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI Strategy Review</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!review && !aiReview.isPending && !aiReview.isError && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-violet-300 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">Get AI-Powered Insights</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Let AI analyze your strategy across key dimensions and provide actionable recommendations.
              </p>
              <Button variant="cta" onClick={handleGenerate}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Review
              </Button>
            </div>
          )}

          {aiReview.isPending && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 text-violet-400 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-gray-500">Analyzing your strategy...</p>
            </div>
          )}

          {aiReview.isError && !aiReview.isPending && (
            <div className="text-center py-12">
              <AlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-4" />
              <p className="text-sm text-red-600 mb-4">Failed to generate review. Please try again.</p>
              <Button variant="secondary" size="sm" onClick={handleGenerate}>Retry</Button>
            </div>
          )}

          {review && !aiReview.isPending && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ring-4 ${overallColors?.ring} ${overallColors?.bg}`}>
                  <span className={`text-2xl font-bold ${overallColors?.text}`}>
                    {review.overallScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Overall Score</p>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">{review.summary}</p>
              </div>

              {/* Findings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Dimension Scores</h3>
                <div className="space-y-3">
                  {review.findings.map((finding) => {
                    const level = getScoreLevel(finding.score);
                    return (
                      <div key={finding.area} className="p-3 border border-gray-100 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <ScoreIcon score={finding.score} />
                            <span className="text-sm font-medium text-gray-900">{finding.area}</span>
                          </div>
                          <span className={`text-sm font-bold ${SCORE_COLORS[level].text}`}>
                            {finding.score}/10
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1.5">{finding.assessment}</p>
                        <div className="flex items-start gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-violet-700">{finding.recommendation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Priorities */}
              {review.topPriorities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Priorities</h3>
                  <ol className="space-y-2">
                    {review.topPriorities.map((priority, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700">{priority}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Re-generate */}
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={aiReview.isPending}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Re-generate Review
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
