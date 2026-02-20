'use client';

import { useState } from 'react';
import { X, Search, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/shared';
import { useInterviewTemplates } from '../../hooks/useInterviews';
import type { InterviewTemplate, QuestionType } from '../../types/interview.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  OPEN: 'Open',
  MULTIPLE_CHOICE: 'MC',
  MULTI_SELECT: 'MS',
  RATING_SCALE: 'Rating',
  RANKING: 'Ranking',
};

interface TemplatePanelSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  onAddTemplate: (template: InterviewTemplate) => void;
}

export function TemplatePanelSlideout({
  isOpen,
  onClose,
  assetId,
  onAddTemplate,
}: TemplatePanelSlideoutProps) {
  const { data } = useInterviewTemplates(assetId);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const templates = data?.templates ?? [];
  const filtered = search
    ? templates.filter((t) =>
        t.questionText.toLowerCase().includes(search.toLowerCase()),
      )
    : templates;

  // Group by category
  const grouped = filtered.reduce<Record<string, InterviewTemplate[]>>(
    (acc, t) => {
      const key = t.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {},
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Question Templates</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No templates found.
            </p>
          ) : (
            Object.entries(grouped).map(([category, catTemplates]) => {
              const isExpanded = expandedCategories.has(category);
              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {catTemplates.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="pb-2">
                      {catTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-start gap-2 px-4 py-2 mx-2 rounded-lg hover:bg-gray-50 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {template.questionText}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="default" size="sm">
                                {TYPE_LABELS[template.questionType]}
                              </Badge>
                            </div>
                          </div>
                          <button
                            onClick={() => onAddTemplate(template)}
                            className="p-1 text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
