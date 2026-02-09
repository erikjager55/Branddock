"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface KnowledgeItem {
  id: string;
  name: string;
  description?: string;
  badge?: { label: string; variant: "success" | "warning" | "info" | "default" };
}

export interface KnowledgeCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: KnowledgeItem[];
}

interface KnowledgeSelectorProps {
  categories: KnowledgeCategory[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

export function KnowledgeSelector({
  categories,
  selectedIds,
  onSelect,
}: KnowledgeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categories.map((c) => c.id)
  );

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleItem = (itemId: string) => {
    onSelect(
      selectedIds.includes(itemId)
        ? selectedIds.filter((id) => id !== itemId)
        : [...selectedIds, itemId]
    );
  };

  const selectAll = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const itemIds = category.items.map((i) => i.id);
    const allSelected = itemIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onSelect(selectedIds.filter((id) => !itemIds.includes(id)));
    } else {
      onSelect([...new Set([...selectedIds, ...itemIds])]);
    }
  };

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isExpanded = expandedCategories.includes(category.id);
        const categoryItemIds = category.items.map((i) => i.id);
        const selectedCount = categoryItemIds.filter((id) =>
          selectedIds.includes(id)
        ).length;
        const allSelected = selectedCount === category.items.length && category.items.length > 0;

        return (
          <div
            key={category.id}
            className="border border-border-dark rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-dark/50 transition-colors"
            >
              <span className="text-text-dark/60">{category.icon}</span>
              <span className="flex-1 text-left text-sm font-medium text-text-dark">
                {category.label}
              </span>
              {selectedCount > 0 && (
                <Badge variant="info" size="sm">
                  {selectedCount} selected
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-text-dark/40 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
            {isExpanded && (
              <div className="border-t border-border-dark">
                <div className="px-4 py-2 flex justify-end">
                  <button
                    onClick={() => selectAll(category.id)}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="px-2 pb-2 space-y-0.5">
                  {category.items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-surface-dark/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-border-dark"
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-dark truncate">
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs text-text-dark/40 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.badge && (
                          <Badge variant={item.badge.variant} size="sm">
                            {item.badge.label}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Selection summary */}
      <div className="flex items-center justify-between px-1 pt-2">
        <p className="text-sm text-text-dark/60">
          <span className="font-semibold text-text-dark">{selectedIds.length}</span>{" "}
          knowledge items selected
        </p>
      </div>
    </div>
  );
}
