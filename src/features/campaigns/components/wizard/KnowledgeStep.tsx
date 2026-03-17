"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Check,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/shared";
import { useWizardKnowledge } from "../../hooks";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import {
  SOURCE_TYPE_META,
  CONTEXT_ICON_MAP,
  DEFAULT_SOURCE_ICON,
  SEARCH_ICON,
} from "@/lib/ai/context/source-ui-config";
import type { WizardKnowledgeGroup } from "../../types/campaign-wizard.types";

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

  // Auto-select brand_asset items on first load (brand foundation is always-on context)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (!knowledgeData?.groups) return;

    // Only auto-select on fresh wizard (no items selected yet)
    const currentIds = useCampaignWizardStore.getState().selectedKnowledgeIds;
    if (currentIds.length > 0) {
      hasAutoSelected.current = true;
      return;
    }

    const brandAssetIds = knowledgeData.groups
      .filter((g) => g.key === "brand_asset")
      .flatMap((g) => g.items.map((i) => i.sourceId));

    if (brandAssetIds.length > 0) {
      selectAllKnowledge(brandAssetIds);
    }
    hasAutoSelected.current = true;
  }, [knowledgeData, selectAllKnowledge]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Build filter chips from groups
  const filterChips = useMemo(() => {
    if (!knowledgeData?.groups)
      return [{ key: "all", label: "All", icon: SEARCH_ICON }];
    return [
      { key: "all", label: "All", icon: SEARCH_ICON },
      ...knowledgeData.groups.map((g) => ({
        key: g.key,
        label: g.label,
        icon: CONTEXT_ICON_MAP[g.icon] || DEFAULT_SOURCE_ICON,
      })),
    ];
  }, [knowledgeData]);

  // Filter groups based on search and active filter
  const visibleGroups = useMemo(() => {
    if (!knowledgeData?.groups) return [];

    let groups = knowledgeData.groups;

    // Type filter
    if (activeFilter !== "all") {
      groups = groups.filter((g) => g.key === activeFilter);
    }

    // Search filter within groups
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              (i.description && i.description.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.items.length > 0);
    }

    return groups;
  }, [knowledgeData, activeFilter, searchQuery]);

  // All item IDs across all groups (unfiltered)
  const allItemIds = useMemo(() => {
    if (!knowledgeData?.groups) return [];
    return knowledgeData.groups.flatMap((g) => g.items.map((i) => i.sourceId));
  }, [knowledgeData]);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const toggleGroupSelection = (group: WizardKnowledgeGroup) => {
    const groupIds = group.items.map((i) => i.sourceId);
    const allSelected = groupIds.every((id) =>
      selectedKnowledgeIds.includes(id),
    );

    if (allSelected) {
      // Deselect group: keep all except this group's IDs
      selectAllKnowledge(
        selectedKnowledgeIds.filter((id) => !groupIds.includes(id)),
      );
    } else {
      // Select group: add all group IDs to current selection
      selectAllKnowledge([
        ...new Set([...selectedKnowledgeIds, ...groupIds]),
      ]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton width="100%" height={40} className="rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={80} height={28} className="rounded-full" />
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={40} className="rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const SearchIcon = SEARCH_ICON;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Select Knowledge Context
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose the brand knowledge to inform your campaign strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectAllKnowledge(allItemIds)}
            className="text-xs text-primary hover:opacity-80 font-medium"
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
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Select at least one knowledge asset to generate an effective
            strategy.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search knowledge items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {filterChips.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon className="w-3 h-3" />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Grouped items list */}
      <div className="max-h-[40vh] overflow-y-auto border border-gray-200 rounded-lg">
        {visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
            <Database className="w-6 h-6 mb-2 text-gray-300" />
            {searchQuery
              ? "No items match your search"
              : "No context items available"}
          </div>
        ) : (
          visibleGroups.map((group, groupIdx) => {
            const isCollapsed = collapsedGroups.has(group.key);
            const groupIds = group.items.map((i) => i.sourceId);
            const selectedInGroup = groupIds.filter((id) =>
              selectedKnowledgeIds.includes(id),
            ).length;
            const allGroupSelected =
              selectedInGroup === group.items.length && group.items.length > 0;
            const someGroupSelected = selectedInGroup > 0 && !allGroupSelected;
            const GroupIcon =
              CONTEXT_ICON_MAP[group.icon] || DEFAULT_SOURCE_ICON;

            return (
              <div
                key={group.key}
                className={groupIdx > 0 ? "border-t border-gray-200" : ""}
              >
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                  <GroupIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    ({selectedInGroup}/{group.items.length})
                  </span>

                  {/* Group select-all checkbox */}
                  <div className="ml-auto flex-shrink-0">
                    <div
                      role="checkbox"
                      aria-checked={allGroupSelected}
                      className="h-4 w-4 rounded border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: allGroupSelected
                          ? "var(--primary)"
                          : someGroupSelected
                            ? "color-mix(in srgb, var(--primary) 40%, transparent)"
                            : "#ffffff",
                        borderColor: allGroupSelected
                          ? "var(--primary)"
                          : someGroupSelected
                            ? "color-mix(in srgb, var(--primary) 50%, transparent)"
                            : "#d1d5db",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupSelection(group);
                      }}
                    >
                      {(allGroupSelected || someGroupSelected) && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Group items */}
                {!isCollapsed &&
                  group.items.map((item) => {
                    const isSelected = selectedKnowledgeIds.includes(
                      item.sourceId,
                    );
                    const meta = SOURCE_TYPE_META[item.sourceType];
                    const Icon = meta?.icon ?? DEFAULT_SOURCE_ICON;

                    return (
                      <button
                        key={`${item.sourceType}:${item.sourceId}`}
                        type="button"
                        onClick={() => toggleKnowledgeId(item.sourceId)}
                        className="flex items-center gap-2.5 w-full pl-9 pr-3 py-1.5 text-left transition-colors hover:bg-gray-50"
                        style={{
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                            : undefined,
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="h-[18px] w-[18px] rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? "var(--primary)"
                              : "#ffffff",
                            borderColor: isSelected
                              ? "var(--primary)"
                              : "#d1d5db",
                          }}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Icon */}
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Type badge */}
                        {meta && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>

      {/* Selected count */}
      <div className="flex items-center gap-2 pt-1">
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
