'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import {
  useImproveSuggestions,
  useApplySuggestion,
  useDismissSuggestion,
  usePreviewSuggestion,
  useBulkApplySuggestions,
} from '../../hooks/studio.hooks';
import { SuggestionCard } from './SuggestionCard';
import { BulkApplyButton } from './BulkApplyButton';

// ─── Types ─────────────────────────────────────────────

interface ImproveScorePanelProps {
  deliverableId: string;
}

// ─── Component ─────────────────────────────────────────

export function ImproveScorePanel({ deliverableId }: ImproveScorePanelProps) {
  const isOpen = useContentStudioStore((s) => s.isImprovePanelOpen);
  const setIsOpen = useContentStudioStore((s) => s.setIsImprovePanelOpen);

  const { data, isLoading } = useImproveSuggestions(deliverableId);
  const applyMutation = useApplySuggestion(deliverableId);
  const dismissMutation = useDismissSuggestion(deliverableId);
  const previewMutation = usePreviewSuggestion(deliverableId);
  const bulkApplyMutation = useBulkApplySuggestions(deliverableId);

  if (!isOpen) return null;

  const currentScore = data?.currentScore ?? 0;
  const targetScore = data?.targetScore ?? 95;
  const potentialScore = data?.potentialScore ?? 0;
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
  const pendingCount = suggestions.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 z-40 bg-white shadow-xl border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Improve Quality Score</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Score overview */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Current</p>
            <p className="text-2xl font-bold text-gray-400">{Math.round(currentScore)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Target</p>
            <p className="text-2xl font-bold text-emerald-600">{targetScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Potential</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(potentialScore)}</p>
          </div>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No suggestions available.
          </p>
        ) : (
          suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={(id) => applyMutation.mutate(id)}
              onDismiss={(id) => dismissMutation.mutate(id)}
              onPreview={(id) => previewMutation.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Bottom action */}
      <div className="px-5 py-4 border-t border-gray-100">
        <BulkApplyButton
          pendingCount={pendingCount}
          onApply={() => bulkApplyMutation.mutate()}
          isLoading={bulkApplyMutation.isPending}
        />
      </div>
    </div>
  );
}

export default ImproveScorePanel;
