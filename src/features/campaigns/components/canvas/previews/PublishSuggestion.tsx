'use client';

import React from 'react';
import type { PublishSuggestionData } from '../../../types/canvas.types';
import { Calendar, Info } from 'lucide-react';

interface PublishSuggestionProps {
  suggestion: PublishSuggestionData | null;
  isGenerating: boolean;
}

/** Publish date suggestion card populated from SSE publish_suggestion event */
export function PublishSuggestion({ suggestion, isGenerating }: PublishSuggestionProps) {
  if (isGenerating) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Publish Suggestion
        </h3>
        <div className="animate-pulse p-3 rounded-lg bg-gray-50">
          <div className="h-4 w-3/4 rounded bg-gray-200 mb-2" />
          <div className="h-3 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  const formattedDate = formatSuggestedDate(suggestion.suggestedDate);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Publish Suggestion
      </h3>

      <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
        {/* Date */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-800">
            {formattedDate}
          </span>
        </div>

        {/* Reasoning */}
        <div className="flex items-start gap-1.5">
          <Info className="h-3 w-3 text-teal-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-teal-700 leading-relaxed">
            {suggestion.reasoning}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatSuggestedDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
