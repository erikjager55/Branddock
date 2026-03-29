'use client';

import React, { useEffect, useRef } from 'react';
import { CheckSquare } from 'lucide-react';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import { generateChecklist } from '@/lib/studio/checklist-generator';
import type { ChecklistItem } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────

interface ContentChecklistProps {
  deliverableId: string;
  contentType?: string;
}

// ─── Default Items ─────────────────────────────────────

const DEFAULT_ITEMS: ChecklistItem[] = [
  { label: 'Brand voice consistency', checked: false },
  { label: 'Target audience alignment', checked: false },
  { label: 'Call-to-action clarity', checked: false },
  { label: 'Visual brand guidelines', checked: false },
  { label: 'Proofread & finalized', checked: false },
];

// ─── Component ─────────────────────────────────────────

export function ContentChecklist({ deliverableId, contentType }: ContentChecklistProps) {
  const rawChecklistItems = useContentStudioStore((s) => s.checklistItems);
  const checklistItems = Array.isArray(rawChecklistItems) ? rawChecklistItems : [];
  const setChecklistItems = useContentStudioStore((s) => s.setChecklistItems);
  const toggleChecklistItem = useContentStudioStore((s) => s.toggleChecklistItem);
  const validationResult = useContentStudioStore((s) => s.validationResult);
  const prevValidationRef = useRef(validationResult);

  // Generate dynamic checklist when validation result changes
  useEffect(() => {
    if (validationResult && validationResult !== prevValidationRef.current && contentType) {
      const dynamicItems = generateChecklist(contentType, validationResult);
      setChecklistItems(dynamicItems);
    }
    prevValidationRef.current = validationResult;
  }, [validationResult, contentType, setChecklistItems]);

  // Initialize with default items if empty and no validation
  useEffect(() => {
    if (checklistItems.length === 0 && !validationResult) {
      setChecklistItems(DEFAULT_ITEMS);
    }
  }, []);

  const items = checklistItems.length > 0 ? checklistItems : DEFAULT_ITEMS;
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Content Checklist</h3>
        </div>
        <span className="text-xs font-medium text-gray-500">
          {checkedCount}/{totalCount}
        </span>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <label
            key={index}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleChecklistItem(index)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-500"
            />
            <span
              className={`text-sm ${
                item.checked
                  ? 'text-gray-400 line-through'
                  : 'text-gray-700 group-hover:text-gray-900'
              }`}
            >
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default ContentChecklist;
