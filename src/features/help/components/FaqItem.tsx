'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { FaqItemResponse } from '@/types/help';
import { useHelpStore } from '@/stores/useHelpStore';
import { FaqFeedback } from './FaqFeedback';

interface FaqItemProps {
  item: FaqItemResponse;
}

export function FaqItem({ item }: FaqItemProps) {
  const expandedFaqId = useHelpStore((s) => s.expandedFaqId);
  const toggleFaqItem = useHelpStore((s) => s.toggleFaqItem);

  const isExpanded = expandedFaqId === item.id;

  return (
    <div className="border-b border-gray-100 py-4">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left gap-3"
        onClick={() => toggleFaqItem(item.id)}
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium text-gray-900">{item.question}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
        <div className="mt-3">
          <FaqFeedback
            id={item.id}
            helpfulYes={item.helpfulYes}
            helpfulNo={item.helpfulNo}
          />
        </div>
      </div>
    </div>
  );
}
