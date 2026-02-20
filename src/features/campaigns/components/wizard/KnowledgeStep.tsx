"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { Badge, Skeleton } from "@/components/shared";
import { useWizardKnowledge } from "../../hooks";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";

// ─── Validation status badge ──────────────────────────────

function ValidationBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const map: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    validated: { label: "Validated", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    draft: { label: "Draft", variant: "default" },
  };

  const info = map[status.toLowerCase()] || {
    label: status,
    variant: "default" as const,
  };

  return (
    <Badge variant={info.variant} size="sm">
      {info.label}
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────

export function KnowledgeStep() {
  const { data: knowledgeData, isLoading } = useWizardKnowledge();
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const toggleKnowledgeId = useCampaignWizardStore(
    (s) => s.toggleKnowledgeId,
  );
  const selectAllKnowledge = useCampaignWizardStore(
    (s) => s.selectAllKnowledge,
  );
  const deselectAllKnowledge = useCampaignWizardStore(
    (s) => s.deselectAllKnowledge,
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton width="30%" height={16} className="rounded" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} width="100%" height={40} className="rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const categories = knowledgeData?.categories || [];
  const allItemIds = categories.flatMap((cat) =>
    cat.items.map((item) => item.id),
  );

  const handleSelectAllCategory = (
    categoryItems: { id: string }[],
    allSelected: boolean,
  ) => {
    if (allSelected) {
      // Deselect all in this category
      categoryItems.forEach((item) => {
        if (selectedKnowledgeIds.includes(item.id)) {
          toggleKnowledgeId(item.id);
        }
      });
    } else {
      // Select all in this category
      categoryItems.forEach((item) => {
        if (!selectedKnowledgeIds.includes(item.id)) {
          toggleKnowledgeId(item.id);
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with global select/deselect */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Select Knowledge Assets
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose the brand knowledge to inform your campaign strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectAllKnowledge(allItemIds)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={deselectAllKnowledge}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Warning if none selected */}
      {selectedKnowledgeIds.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Select at least one knowledge asset to generate an effective
            strategy.
          </p>
        </div>
      )}

      {/* Category sections */}
      {categories.map((category) => {
        const categoryItemIds = category.items.map((i) => i.id);
        const allCategorySelected = categoryItemIds.every((id) =>
          selectedKnowledgeIds.includes(id),
        );
        const someCategorySelected =
          categoryItemIds.some((id) => selectedKnowledgeIds.includes(id)) &&
          !allCategorySelected;

        return (
          <div key={category.category} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allCategorySelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someCategorySelected;
                  }}
                  onChange={() =>
                    handleSelectAllCategory(
                      category.items,
                      allCategorySelected,
                    )
                  }
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-semibold text-gray-900">
                  {category.category}
                </span>
              </label>
              <Badge size="sm">{category.items.length}</Badge>
            </div>

            {/* Items */}
            <div className="space-y-1 pl-2">
              {category.items.map((item) => {
                const isSelected = selectedKnowledgeIds.includes(item.id);

                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-teal-50/50 border border-teal-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleKnowledgeId(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm text-gray-900 truncate">
                        {item.name}
                      </span>
                      <Badge size="sm">{item.type}</Badge>
                      <ValidationBadge status={item.validationStatus} />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected count */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <Database className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {selectedKnowledgeIds.length}
          </span>{" "}
          {selectedKnowledgeIds.length === 1 ? "item" : "items"} selected
        </span>
      </div>
    </div>
  );
}

export default KnowledgeStep;
