'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Button, Select } from '@/components/shared';
import { RefreshCw, StopCircle } from 'lucide-react';

interface FeedbackBarProps {
  onRegenerate: (groups: string[], feedback: string) => void;
  onAbort: () => void;
}

export function FeedbackBar({ onRegenerate, onAbort }: FeedbackBarProps) {
  const feedbackDraft = useCanvasStore((s) => s.feedbackDraft);
  const feedbackGroup = useCanvasStore((s) => s.feedbackGroup);
  const setFeedbackDraft = useCanvasStore((s) => s.setFeedbackDraft);
  const setFeedbackGroup = useCanvasStore((s) => s.setFeedbackGroup);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const variantGroups = useCanvasStore((s) => s.variantGroups);

  const isGenerating = globalStatus === 'generating';
  const hasVariants = variantGroups.size > 0;

  if (!hasVariants) return null;

  const groupOptions = Array.from(variantGroups.keys()).map((g) => ({
    value: g,
    label: g.replace(/_/g, ' '),
  }));

  const handleRegenerate = () => {
    if (!feedbackDraft.trim()) return;
    const feedback = feedbackDraft.trim();
    const groups = feedbackGroup
      ? [feedbackGroup]
      : groupOptions.map((o) => o.value);
    onRegenerate(groups, feedback);
    setFeedbackDraft('');
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Group selector */}
        {groupOptions.length > 1 && (
          <div className="w-48">
            <Select
              value={feedbackGroup ?? ''}
              onChange={(val) => setFeedbackGroup(val || null)}
              options={[
                { value: '', label: 'All groups' },
                ...groupOptions,
              ]}
            />
          </div>
        )}

        {/* Feedback input */}
        <input
          type="text"
          value={feedbackDraft}
          onChange={(e) => setFeedbackDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isGenerating) handleRegenerate();
          }}
          placeholder="Give feedback to improve the variants..."
          maxLength={5000}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          disabled={isGenerating}
        />

        {/* Action buttons */}
        {isGenerating ? (
          <Button variant="secondary" size="sm" onClick={onAbort}>
            <StopCircle className="h-4 w-4 mr-1.5" />
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRegenerate}
            disabled={!feedbackDraft.trim()}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}
