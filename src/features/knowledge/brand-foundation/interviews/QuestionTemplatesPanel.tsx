"use client";

import { useState } from "react";
import { X, Search, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useInterviewStore } from "@/stores/interviewStore";
import {
  QUESTION_TEMPLATE_CATEGORIES,
  type QuestionTemplate,
} from "@/lib/constants/interview-templates";
import { cn } from "@/lib/utils";

interface QuestionTemplatesPanelProps {
  onAddTemplate: (template: QuestionTemplate) => void;
}

export function QuestionTemplatesPanel({ onAddTemplate }: QuestionTemplatesPanelProps) {
  const { isTemplatesPanelOpen, closeTemplatesPanel, templateFilterAsset } =
    useInterviewStore();

  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(templateFilterAsset ? [templateFilterAsset] : [])
  );
  const [showingAll, setShowingAll] = useState(!templateFilterAsset);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = QUESTION_TEMPLATE_CATEGORIES.filter((cat) => {
    if (!showingAll && templateFilterAsset) {
      return cat.assetKey === templateFilterAsset;
    }
    return true;
  }).map((cat) => ({
    ...cat,
    templates: search
      ? cat.templates.filter((t) =>
          t.questionText.toLowerCase().includes(search.toLowerCase())
        )
      : cat.templates,
  })).filter((cat) => cat.templates.length > 0);

  const handleShowAll = () => {
    setShowingAll(true);
    setExpandedCategories(new Set());
  };

  if (!isTemplatesPanelOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={closeTemplatesPanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[380px] bg-surface-dark border-l border-border-dark shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-dark">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-text-dark">
              Question Templates
            </h2>
            <button
              onClick={closeTemplatesPanel}
              className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-background-dark transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-text-dark/50">
            Browse and add pre-made interview questions
          </p>
        </div>

        {/* Context Filter Banner */}
        {templateFilterAsset && !showingAll && (
          <div className="mx-6 mt-4 rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">
                  Showing templates for:{" "}
                  {QUESTION_TEMPLATE_CATEGORIES.find(
                    (c) => c.assetKey === templateFilterAsset
                  )?.name.replace(" Templates", "") ?? templateFilterAsset}
                </span>
              </div>
              <button
                onClick={() => {
                  const cat = QUESTION_TEMPLATE_CATEGORIES.find(
                    (c) => c.assetKey === templateFilterAsset
                  );
                  if (cat) {
                    setExpandedCategories(new Set([cat.assetKey]));
                  }
                }}
                className="text-text-dark/30 hover:text-text-dark transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleShowAll}
              className="text-sm text-primary hover:underline mt-1"
            >
              Show all templates
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border-dark bg-background-dark text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Template Categories Accordion */}
        <div className="flex-1 overflow-y-auto">
          {filteredCategories.length === 0 && (
            <p className="text-sm text-text-dark/40 text-center py-8">
              No templates found
            </p>
          )}
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.assetKey);
            return (
              <div key={cat.assetKey} className="border-b border-border-dark">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.assetKey)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-background-dark transition-colors"
                >
                  <span className="text-sm font-medium text-text-dark">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-dark/40">
                      {cat.templates.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-dark/40" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-dark/40" />
                    )}
                  </div>
                </button>

                {/* Template Items */}
                {isExpanded && (
                  <div className="pb-2">
                    {cat.templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => onAddTemplate(template)}
                        className="w-full text-left px-6 pl-10 py-3 hover:bg-background-dark transition-colors"
                      >
                        <p className="text-sm text-text-dark/80 mb-1.5">
                          {template.questionText}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" size="sm">
                            {template.questionType.toLowerCase().replace("_", "-")}
                          </Badge>
                          <Badge variant="success" size="sm">
                            {template.category}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
