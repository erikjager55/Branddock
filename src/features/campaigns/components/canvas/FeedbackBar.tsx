'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Button, Select } from '@/components/shared';
import { RefreshCw, StopCircle } from 'lucide-react';

const VISUAL_GROUP_VALUE = '__visual__';

interface FeedbackBarProps {
  onRegenerate: (groups: string[], feedback: string) => void;
  onAbort: () => void;
  /** Optional handler — fires when user picks the Visual group + Regenerate.
   *  When omitted, the Visual option is hidden from the group dropdown. */
  onRegenerateVisual?: (feedback: string) => void;
  /** Whether the visual is currently being regenerated (drives Stop button). */
  isVisualGenerating?: boolean;
}

/**
 * Unified feedback bar for Step 2 — covers BOTH text-variant regeneration
 * and visual regeneration via a single dropdown. The "Visual" option only
 * surfaces when image variants exist (onRegenerateVisual is wired). When
 * picked, Regenerate routes to the visual pipeline; otherwise it routes
 * to the text-orchestrator regenerate handler.
 */
export function FeedbackBar({ onRegenerate, onAbort, onRegenerateVisual, isVisualGenerating }: FeedbackBarProps) {
  const feedbackDraft = useCanvasStore((s) => s.feedbackDraft);
  const feedbackGroup = useCanvasStore((s) => s.feedbackGroup);
  const setFeedbackDraft = useCanvasStore((s) => s.setFeedbackDraft);
  const setFeedbackGroup = useCanvasStore((s) => s.setFeedbackGroup);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const imageVariants = useCanvasStore((s) => s.imageVariants);

  const isTextGenerating = globalStatus === 'generating';
  const isGenerating = isTextGenerating || !!isVisualGenerating;
  const hasTextVariants = variantGroups.size > 0;
  const hasImageVariants = imageVariants.length > 0 && !!onRegenerateVisual;

  // Show the bar whenever either text OR image variants exist.
  if (!hasTextVariants && !hasImageVariants) return null;

  const textGroupOptions = Array.from(variantGroups.keys()).map((g) => ({
    value: g,
    label: g.replace(/_/g, ' '),
  }));

  const handleRegenerate = () => {
    const feedback = feedbackDraft.trim();
    if (feedbackGroup === VISUAL_GROUP_VALUE) {
      onRegenerateVisual?.(feedback);
    } else {
      const groups = feedbackGroup
        ? [feedbackGroup]
        : textGroupOptions.map((o) => o.value);
      onRegenerate(groups, feedback);
    }
    setFeedbackDraft('');
  };

  // Build the dropdown — text groups first, then a divider-like Visual
  // option at the bottom when relevant. Native <select> doesn't support
  // optgroup styling well; the "🎨 Visual" prefix gives visual separation
  // without needing custom rendering.
  const dropdownOptions: Array<{ value: string; label: string }> = [];
  if (hasTextVariants) {
    dropdownOptions.push({ value: '', label: 'All text groups' });
    dropdownOptions.push(...textGroupOptions);
  }
  if (hasImageVariants) {
    dropdownOptions.push({ value: VISUAL_GROUP_VALUE, label: '🎨 Visual' });
  }

  // Default selection: when only image variants exist, preselect Visual so
  // the user doesn't need to hunt through an empty text-groups list.
  const effectiveValue = feedbackGroup
    ?? (hasTextVariants ? '' : VISUAL_GROUP_VALUE);

  const isVisualMode = effectiveValue === VISUAL_GROUP_VALUE;
  const placeholder = isVisualMode
    ? 'Refine these visuals — e.g. more dramatic lighting · outdoor setting · use brand teal'
    : 'Give feedback to improve the variants...';

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Group selector — show when there's more than one option to pick. */}
        {dropdownOptions.length > 1 && (
          <div className="w-56">
            <Select
              value={effectiveValue}
              onChange={(val) => setFeedbackGroup(val || null)}
              options={dropdownOptions}
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
          placeholder={placeholder}
          maxLength={5000}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isGenerating}
        />

        {/* Action buttons */}
        {isGenerating ? (
          <Button variant="secondary" size="sm" onClick={onAbort} disabled={isVisualGenerating}>
            <StopCircle className="h-4 w-4 mr-1.5" />
            {isVisualGenerating ? 'Generating…' : 'Stop'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRegenerate}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}
