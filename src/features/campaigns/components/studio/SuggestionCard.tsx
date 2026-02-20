'use client';

import React from 'react';
import { Check, Eye } from 'lucide-react';
import { Badge, Button } from '@/components/shared';
import type { ImproveSuggestionItem } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: ImproveSuggestionItem;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  onPreview: (id: string) => void;
}

// ─── Component ─────────────────────────────────────────

export function SuggestionCard({ suggestion, onApply, onDismiss, onPreview }: SuggestionCardProps) {
  const { id, metric, impactPoints, currentText, suggestedText, status } = suggestion;

  if (status === 'APPLIED') {
    return (
      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Applied</span>
          <span className="text-xs text-emerald-600 ml-auto">{metric}</span>
        </div>
      </div>
    );
  }

  if (status === 'PREVIEWING') {
    return (
      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 animate-pulse" />
          <span className="text-sm font-medium text-amber-700">Previewing...</span>
          <span className="text-xs text-amber-600 ml-auto">{metric}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-gray-200 space-y-3">
      {/* Header: metric name + impact badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{metric}</span>
        <Badge variant="success" size="sm">
          +{impactPoints} pts
        </Badge>
      </div>

      {/* Comparison blocks */}
      {currentText && suggestedText && (
        <div className="space-y-2">
          <div className="rounded-md bg-red-50 p-2">
            <p className="text-xs font-medium text-red-700 mb-0.5">Current</p>
            <p className="text-xs text-red-600 line-clamp-3">{currentText}</p>
          </div>
          <div className="rounded-md bg-green-50 p-2">
            <p className="text-xs font-medium text-green-700 mb-0.5">Suggested</p>
            <p className="text-xs text-green-600 line-clamp-3">{suggestedText}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPreview(id)}>
          Preview
        </Button>
        <Button variant="cta" size="sm" onClick={() => onApply(id)}>
          Apply
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDismiss(id)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default SuggestionCard;
